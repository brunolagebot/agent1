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
const { generateTemplateBasedQA } = require('./qa_template_engine');
const { validateAndImproveQA } = require('./qa_quality_validator');
const { recordQAGeneration, recordQAValidation } = require('./qa_metrics_tracker');

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
 * Gera QA inteligente baseado no conteúdo do documento
 */
function generateBasicQA(document, maxQuestions = 5) {
  const { filename, description, contentText } = document;
  
  // Análise avançada do conteúdo
  const analysis = analyzeDocumentContent(contentText, filename);
  
  if (analysis.isEmpty) {
    return [];
  }
  
  // Usar template engine para gerar Q&A mais inteligente
  const templateQAs = generateTemplateBasedQA(document, analysis, maxQuestions);
  
  // Se não gerou Q&A suficiente com templates, usar método tradicional
  let allQAs = templateQAs;
  if (templateQAs.length < maxQuestions) {
    const traditionalQAs = generateTraditionalQA(document, analysis, maxQuestions - templateQAs.length);
    allQAs = [...templateQAs, ...traditionalQAs];
  }
  
  // Validar e melhorar a qualidade dos Q&A
  const validationStartTime = Date.now();
  const validatedQAs = validateAndImproveQA(allQAs);
  const validationTime = Date.now() - validationStartTime;
  
  // Registrar métricas
  recordQAGeneration(document, allQAs, generationTime);
  recordQAValidation(validatedQAs, validationTime);
  
  logger.info(`Q&A gerado para ${document.filename}: ${validatedQAs.length} pares validados`, {
    totalGenerated: allQAs.length,
    validated: validatedQAs.length,
    generationTime: generationTime + 'ms',
    validationTime: validationTime + 'ms'
  });
  
  return validatedQAs;
}

/**
 * Gera Q&A usando método tradicional (fallback)
 */
function generateTraditionalQA(document, analysis, maxQuestions) {
  const qaPairs = [];
  
  // QA 1: Identificação do documento
  qaPairs.push(generateDocumentIdentificationQA(document, analysis));
  
  // QA 2: Conteúdo principal
  if (analysis.mainTopics.length > 0) {
    qaPairs.push(generateMainContentQA(document, analysis));
  }
  
  // QA 3: Informações específicas baseadas no tipo
  if (analysis.documentType === 'contract') {
    qaPairs.push(generateContractQA(document, analysis));
  } else if (analysis.documentType === 'financial') {
    qaPairs.push(generateFinancialQA(document, analysis));
  } else if (analysis.documentType === 'technical') {
    qaPairs.push(generateTechnicalQA(document, analysis));
  } else if (analysis.documentType === 'spreadsheet') {
    qaPairs.push(generateSpreadsheetQA(document, analysis));
  }
  
  // QA 4: Dados estruturados (se houver)
  if (analysis.structuredData.length > 0) {
    qaPairs.push(generateStructuredDataQA(document, analysis));
  }
  
  // QA 5: Informações de contato/localização (se houver)
  if (analysis.contactInfo.length > 0 || analysis.addresses.length > 0) {
    qaPairs.push(generateContactLocationQA(document, analysis));
  }
  
  // QA 6: Datas e prazos (se houver)
  if (analysis.dates.length > 0) {
    qaPairs.push(generateDatesQA(document, analysis));
  }
  
  // QA 7: Valores monetários (se houver)
  if (analysis.monetaryValues.length > 0) {
    qaPairs.push(generateMonetaryQA(document, analysis));
  }
  
  // Limitar ao número máximo solicitado
  return qaPairs.slice(0, maxQuestions);
}

/**
 * Analisa o conteúdo do documento de forma inteligente
 */
function analyzeDocumentContent(contentText, filename) {
  const analysis = {
    isEmpty: contentText.trim().length < 50,
    documentType: 'general',
    mainTopics: [],
    structuredData: [],
    contactInfo: [],
    addresses: [],
    dates: [],
    monetaryValues: [],
    entities: [],
    keywords: []
  };
  
  if (analysis.isEmpty) return analysis;
  
  // Detectar tipo de documento
  analysis.documentType = detectDocumentType(contentText, filename);
  
  // Extrair tópicos principais
  analysis.mainTopics = extractMainTopics(contentText);
  
  // Extrair dados estruturados
  analysis.structuredData = extractStructuredData(contentText);
  
  // Extrair informações de contato
  analysis.contactInfo = extractContactInfo(contentText);
  
  // Extrair endereços
  analysis.addresses = extractAddresses(contentText);
  
  // Extrair datas
  analysis.dates = extractDates(contentText);
  
  // Extrair valores monetários
  analysis.monetaryValues = extractMonetaryValues(contentText);
  
  // Extrair entidades nomeadas
  analysis.entities = extractEntities(contentText);
  
  // Extrair palavras-chave importantes
  analysis.keywords = extractKeywords(contentText);
  
  return analysis;
}

/**
 * Detecta o tipo de documento baseado no conteúdo
 */
function detectDocumentType(contentText, filename) {
  const content = contentText.toLowerCase();
  const filename_lower = filename.toLowerCase();
  
  // Contratos
  if (content.includes('contrato') || content.includes('termo') || 
      content.includes('acordo') || content.includes('cláusula') ||
      filename_lower.includes('contrato')) {
    return 'contract';
  }
  
  // Financeiro
  if (content.includes('valor') || content.includes('preço') || 
      content.includes('custo') || content.includes('orçamento') ||
      content.includes('receita') || content.includes('despesa') ||
      filename_lower.includes('financeiro') || filename_lower.includes('orcamento')) {
    return 'financial';
  }
  
  // Técnico
  if (content.includes('especificação') || content.includes('manual') ||
      content.includes('procedimento') || content.includes('instrução') ||
      content.includes('técnico') || content.includes('engenharia')) {
    return 'technical';
  }
  
  // Planilha/Dados
  if (content.includes(',') && content.includes('\n') && 
      (content.includes('nome') || content.includes('email') || 
       content.includes('telefone') || content.includes('data'))) {
    return 'spreadsheet';
  }
  
  return 'general';
}

/**
 * Extrai tópicos principais do documento
 */
function extractMainTopics(contentText) {
  const topics = [];
  const lines = contentText.split('\n').filter(line => line.trim().length > 20);
  
  // Buscar por títulos/seções
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Títulos em maiúscula
    if (trimmed.length < 100 && trimmed === trimmed.toUpperCase() && trimmed.length > 10) {
      topics.push(trimmed);
    }
    
    // Linhas que começam com números ou marcadores
    if (/^[\d\.\-\*]\s/.test(trimmed) && trimmed.length < 150) {
      topics.push(trimmed);
    }
    
    // Frases que parecem ser títulos
    if (trimmed.length < 80 && trimmed.length > 15 && 
        !trimmed.includes('.') && !trimmed.includes(',')) {
      topics.push(trimmed);
    }
  }
  
  return topics.slice(0, 5); // Máximo 5 tópicos
}

/**
 * Extrai dados estruturados do documento
 */
function extractStructuredData(contentText) {
  const data = [];
  
  // CNPJ
  const cnpjMatches = contentText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g);
  if (cnpjMatches) {
    data.push({ type: 'CNPJ', values: cnpjMatches });
  }
  
  // CPF
  const cpfMatches = contentText.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/g);
  if (cpfMatches) {
    data.push({ type: 'CPF', values: cpfMatches });
  }
  
  // Emails
  const emailMatches = contentText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emailMatches) {
    data.push({ type: 'Email', values: emailMatches });
  }
  
  // Telefones
  const phoneMatches = contentText.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g);
  if (phoneMatches) {
    data.push({ type: 'Telefone', values: phoneMatches });
  }
  
  return data;
}

/**
 * Extrai informações de contato
 */
function extractContactInfo(contentText) {
  const contacts = [];
  
  // Nomes próprios (aproximação)
  const namePattern = /[A-Z][a-z]+ [A-Z][a-z]+/g;
  const names = contentText.match(namePattern);
  if (names) {
    contacts.push(...names.slice(0, 5));
  }
  
  return contacts;
}

/**
 * Extrai endereços
 */
function extractAddresses(contentText) {
  const addresses = [];
  
  // Padrões de endereço
  const addressPatterns = [
    /Rua\s+[^,\n]+/gi,
    /Avenida\s+[^,\n]+/gi,
    /Alameda\s+[^,\n]+/gi,
    /Praça\s+[^,\n]+/gi,
    /[A-Z][a-z]+\s+\d+[^,\n]*/g
  ];
  
  for (const pattern of addressPatterns) {
    const matches = contentText.match(pattern);
    if (matches) {
      addresses.push(...matches.slice(0, 3));
    }
  }
  
  return addresses;
}

/**
 * Extrai datas do documento
 */
function extractDates(contentText) {
  const dates = [];
  
  // Padrões de data
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{4}/g,
    /\d{1,2}-\d{1,2}-\d{4}/g,
    /\d{4}-\d{1,2}-\d{1,2}/g
  ];
  
  for (const pattern of datePatterns) {
    const matches = contentText.match(pattern);
    if (matches) {
      dates.push(...matches.slice(0, 5));
    }
  }
  
  return dates;
}

/**
 * Extrai valores monetários
 */
function extractMonetaryValues(contentText) {
  const values = [];
  
  // Padrões monetários
  const monetaryPatterns = [
    /R\$\s*[\d.,]+/g,
    /[\d.,]+\s*reais?/gi,
    /USD\s*[\d.,]+/g,
    /EUR\s*[\d.,]+/g
  ];
  
  for (const pattern of monetaryPatterns) {
    const matches = contentText.match(pattern);
    if (matches) {
      values.push(...matches.slice(0, 5));
    }
  }
  
  return values;
}

/**
 * Extrai entidades nomeadas (aproximação)
 */
function extractEntities(contentText) {
  const entities = [];
  
  // Empresas (palavras em maiúscula)
  const companyPattern = /[A-Z][A-Z\s&]+(?:LTDA|S\.A\.|S\/A|EIRELI)/g;
  const companies = contentText.match(companyPattern);
  if (companies) {
    entities.push(...companies.slice(0, 3));
  }
  
  return entities;
}

/**
 * Extrai palavras-chave importantes
 */
function extractKeywords(contentText) {
  const words = contentText.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 4);
  
  // Contar frequência
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  // Retornar palavras mais frequentes
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

// Funções geradoras de QA específicas
function generateDocumentIdentificationQA(document, analysis) {
  return {
    question: `O que é o documento "${document.filename}"?`,
    answer: document.description || 
           `Este é um documento do tipo ${analysis.documentType} chamado "${document.filename}" que contém informações sobre ${analysis.mainTopics.slice(0, 2).join(' e ')}.`,
    context: 'Identificação do documento',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  };
}

function generateMainContentQA(document, analysis) {
  const topics = analysis.mainTopics.slice(0, 3).join(', ');
  return {
    question: `Quais são os principais tópicos abordados no documento "${document.filename}"?`,
    answer: `O documento aborda os seguintes tópicos principais: ${topics}.`,
    context: 'Conteúdo principal',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  };
}

function generateContractQA(document, analysis) {
  return {
    question: `Que tipo de informações contratuais estão no documento "${document.filename}"?`,
    answer: `O documento contém informações contratuais incluindo ${analysis.structuredData.map(d => d.type).join(', ')} e ${analysis.monetaryValues.length > 0 ? 'valores monetários' : 'detalhes do acordo'}.`,
    context: 'Informações contratuais',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  };
}

function generateFinancialQA(document, analysis) {
  return {
    question: `Que informações financeiras estão no documento "${document.filename}"?`,
    answer: `O documento contém informações financeiras incluindo ${analysis.monetaryValues.slice(0, 3).join(', ')} e ${analysis.dates.length > 0 ? 'datas relevantes' : 'detalhes orçamentários'}.`,
    context: 'Informações financeiras',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  };
}

function generateTechnicalQA(document, analysis) {
  return {
    question: `Que informações técnicas estão no documento "${document.filename}"?`,
    answer: `O documento contém informações técnicas sobre ${analysis.mainTopics.slice(0, 2).join(' e ')} com ${analysis.keywords.slice(0, 3).join(', ')}.`,
    context: 'Informações técnicas',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  };
}

function generateSpreadsheetQA(document, analysis) {
  return {
    question: `Que tipo de dados estão na planilha "${document.filename}"?`,
    answer: `A planilha contém dados estruturados incluindo ${analysis.structuredData.map(d => d.type).join(', ')} e ${analysis.contactInfo.length > 0 ? 'informações de contato' : 'dados tabulares'}.`,
    context: 'Dados de planilha',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  };
}

function generateStructuredDataQA(document, analysis) {
  const dataTypes = analysis.structuredData.map(d => d.type).join(', ');
  return {
    question: `Que dados estruturados estão no documento "${document.filename}"?`,
    answer: `O documento contém os seguintes dados estruturados: ${dataTypes}.`,
    context: 'Dados estruturados',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  };
}

function generateContactLocationQA(document, analysis) {
  const contacts = analysis.contactInfo.slice(0, 2).join(', ');
  const addresses = analysis.addresses.slice(0, 1).join(', ');
  return {
    question: `Que informações de contato e localização estão no documento "${document.filename}"?`,
    answer: `O documento contém informações de contato: ${contacts}${addresses ? ` e endereço: ${addresses}` : ''}.`,
    context: 'Contato e localização',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  };
}

function generateDatesQA(document, analysis) {
  const dates = analysis.dates.slice(0, 3).join(', ');
  return {
    question: `Que datas importantes estão no documento "${document.filename}"?`,
    answer: `O documento menciona as seguintes datas: ${dates}.`,
    context: 'Datas importantes',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  };
}

function generateMonetaryQA(document, analysis) {
  const values = analysis.monetaryValues.slice(0, 3).join(', ');
  return {
    question: `Que valores monetários estão no documento "${document.filename}"?`,
    answer: `O documento menciona os seguintes valores: ${values}.`,
    context: 'Valores monetários',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  };
}

module.exports = { generateDocumentQA };
