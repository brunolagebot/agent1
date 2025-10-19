/**
 * Use Case: Gerador de Perguntas e Respostas baseado em documentos
 * Gera pares pergunta-resposta a partir do conteúdo dos documentos PDF
 */

const { PostgresDocumentsRepository } = require('../../infra/documents/postgres_documents_repository');
const { OllamaClient } = require('../../infra/llm/ollama_client');
const { createLogger } = require('../../infra/logging/logger');
const { 
  loadDocumentQA, 
  saveDocumentQA, 
  needsReprocessing, 
  updateDocumentHash, 
  generateDocumentHash 
} = require('./finetuning_cache');
const { generateSpreadsheetQA } = require('./spreadsheet_qa_generator');

const logger = createLogger('document-qa-generator');
const documentsRepo = new PostgresDocumentsRepository();
const ollamaClient = new OllamaClient();

/**
 * Gera perguntas e respostas baseadas no conteúdo dos documentos
 * @param {Object} options - Opções de geração
 * @returns {Promise<Array>} Array de pares pergunta-resposta
 */
async function generateDocumentQA(options = {}) {
  const {
    maxQuestionsPerDocument = 5,
    minChunkLength = 200,
    maxChunkLength = 1000,
    includeContext = true
  } = options;

  try {
    logger.info('Iniciando geração de QA baseada em documentos', { options });
    
    // 1. Buscar documentos processados
    const documents = await documentsRepo.listDocuments({ limit: 100 });
    const processedDocs = documents.filter(doc => doc.processed);
    
    if (processedDocs.length === 0) {
      logger.warn('Nenhum documento processado encontrado');
      return [];
    }
    
    logger.info(`Encontrados ${processedDocs.length} documentos processados`);
    
    const allQA = [];
    
  // 2. Processar cada documento (com cache)
  for (const doc of processedDocs) {
    try {
      const docHash = generateDocumentHash(doc);
      const needsReprocess = await needsReprocessing(doc.id, docHash);
      
      let docQA;
      if (needsReprocess) {
        logger.info(`Gerando QA para documento ${doc.filename} (novo ou modificado)`);
        
        // Gerar QA básico sem depender do Ollama
        docQA = generateBasicQA(doc, maxQuestionsPerDocument);
        
        // Salvar no cache
        await saveDocumentQA(doc.id, docQA);
        await updateDocumentHash(doc.id, docHash);
        
        logger.info(`Geradas ${docQA.length} perguntas para ${doc.filename} (salvo no cache)`);
      } else {
        logger.info(`Carregando QA do cache para documento ${doc.filename}`);
        docQA = await loadDocumentQA(doc.id) || [];
        logger.info(`Carregadas ${docQA.length} perguntas do cache para ${doc.filename}`);
      }
      
      allQA.push(...docQA);
      
    } catch (error) {
      logger.error(`Erro ao processar documento ${doc.filename}`, {}, error);
    }
  }
    
    logger.info(`Total de pares QA gerados: ${allQA.length}`);
    return allQA;
    
  } catch (error) {
    logger.error('Erro na geração de QA de documentos', {}, error);
    throw error;
  }
}

/**
 * Gera QA para um documento específico
 */
async function generateQAForDocument(document, options) {
  const { maxQuestions, minChunkLength, maxChunkLength, includeContext } = options;
  
  // 1. Dividir o conteúdo em chunks menores para análise
  const chunks = splitIntoChunks(document.contentText, minChunkLength, maxChunkLength);
  
  if (chunks.length === 0) {
    return [];
  }
  
  // 2. Gerar perguntas para cada chunk
  const qaPairs = [];
  
  for (let i = 0; i < Math.min(chunks.length, maxQuestions); i++) {
    const chunk = chunks[i];
    
    try {
      const qa = await generateQAForChunk(chunk, document, includeContext);
      if (qa) {
        qaPairs.push(qa);
      }
    } catch (error) {
      logger.warn(`Erro ao gerar QA para chunk ${i} do documento ${document.filename}`, {}, error);
    }
  }
  
  return qaPairs;
}

/**
 * Gera QA para um chunk específico
 */
async function generateQAForChunk(chunk, document, includeContext) {
  try {
    // Prompt para gerar pergunta e resposta baseada no chunk
    const prompt = `Com base no seguinte texto extraído de um documento PDF, gere uma pergunta e sua resposta correspondente.

DOCUMENTO: ${document.filename}
${document.description ? `DESCRIÇÃO: ${document.description}` : ''}

TEXTO:
${chunk}

INSTRUÇÕES:
1. Gere uma pergunta específica que pode ser respondida com base no texto
2. A resposta deve ser precisa e baseada apenas no conteúdo fornecido
3. A pergunta deve ser útil e prática
4. Use linguagem natural e objetiva

FORMATO DE RESPOSTA (JSON):
{
  "question": "Sua pergunta aqui",
  "answer": "Sua resposta aqui",
  "context": "Contexto adicional se relevante"
}

Responda APENAS com o JSON, sem texto adicional.`;

    const response = await ollamaClient.generate({
      model: 'qwen2.5:14b-instruct-q4_K_M',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Baixa temperatura para respostas mais consistentes
      maxTokens: 500
    });

    const content = response.message?.content?.trim() || '';
    
    if (!content) {
      logger.warn('Resposta vazia do LLM para geração de QA', { response });
      return null;
    }
    
    // Tentar extrair JSON da resposta
    let qaData;
    try {
      // Remover markdown code blocks se existirem
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*?\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      qaData = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.warn('Erro ao fazer parse do JSON da resposta do LLM', { content }, parseError);
      return null;
    }

    // Validar estrutura
    if (!qaData.question || !qaData.answer) {
      logger.warn('Resposta do LLM não contém question/answer válidos', { qaData });
      return null;
    }

    return {
      question: qaData.question,
      answer: qaData.answer,
      context: qaData.context || null,
      source: {
        documentId: document.id,
        filename: document.filename,
        description: document.description
      },
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Erro ao gerar QA para chunk', { documentId: document.id }, error);
    return null;
  }
}

/**
 * Divide texto em chunks menores
 */
function splitIntoChunks(text, minLength, maxLength) {
  if (!text || text.length < minLength) {
    return [];
  }

  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    
    const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;
    
    if (potentialChunk.length > maxLength && currentChunk.length >= minLength) {
      chunks.push(currentChunk + '.');
      currentChunk = trimmedSentence;
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  // Adicionar último chunk se tiver tamanho suficiente
  if (currentChunk.length >= minLength) {
    chunks.push(currentChunk + '.');
  }
  
  return chunks;
}

/**
 * Gera QA básico baseado no conteúdo do documento
 */
function generateBasicQA(document, maxQuestions = 3) {
  const qaPairs = [];
  const { filename, description, contentText } = document;
  
  // Extrair informações básicas do documento
  const lines = contentText.split('\n').filter(line => line.trim().length > 10);
  
  if (lines.length === 0) {
    return qaPairs;
  }
  
  // QA 1: Sobre o documento
  qaPairs.push({
    question: `O que é o documento "${filename}"?`,
    answer: description || `Este é um documento chamado "${filename}" que contém informações relevantes.`,
    context: 'Informações gerais do documento',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  });
  
  // QA 2: Sobre o conteúdo (primeira linha significativa)
  if (lines.length > 0) {
    const firstLine = lines[0].substring(0, 100) + (lines[0].length > 100 ? '...' : '');
    qaPairs.push({
      question: `Qual é o conteúdo principal do documento "${filename}"?`,
      answer: `O documento contém: ${firstLine}`,
      context: 'Conteúdo principal do documento',
      source: {
        documentId: document.id,
        filename: document.filename,
        description: document.description
      },
      generatedAt: new Date().toISOString()
    });
  }
  
  // QA 3: Sobre informações específicas (se houver dados estruturados)
  if (contentText.includes('CNPJ') || contentText.includes('CPF')) {
    qaPairs.push({
      question: `Que tipo de informações de identificação estão no documento "${filename}"?`,
      answer: `O documento contém informações de identificação como CNPJ, CPF ou outros dados cadastrais.`,
      context: 'Informações de identificação',
      source: {
        documentId: document.id,
        filename: document.filename,
        description: document.description
      },
      generatedAt: new Date().toISOString()
    });
  }
  
  // Limitar ao número máximo solicitado
  return qaPairs.slice(0, maxQuestions);
}

module.exports = { generateDocumentQA };
