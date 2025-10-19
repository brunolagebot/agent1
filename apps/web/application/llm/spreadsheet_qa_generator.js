/**
 * Gerador de QA específico para planilhas
 * Cria perguntas e respostas baseadas em dados tabulares
 */

const { OllamaClient } = require('../../infra/llm/ollama_client');
const { createLogger } = require('../../infra/logging/logger');

const logger = createLogger('spreadsheet-qa-generator');
const ollamaClient = new OllamaClient();

/**
 * Gera QA para planilhas baseado na estrutura e dados
 */
async function generateSpreadsheetQA(document, options = {}) {
  const {
    maxQuestions = 5,
    includeInsights = true,
    includeDataAnalysis = true
  } = options;

  try {
    const { metadata } = document;
    if (!metadata || metadata.type !== 'spreadsheet') {
      logger.warn('Documento não é uma planilha', { documentId: document.id });
      return [];
    }

    const { structure, insights, rawData } = metadata;
    const { headers, rows } = rawData;
    
    if (rows.length === 0) {
      logger.info('Planilha vazia, sem QA para gerar', { documentId: document.id });
      return [];
    }

    logger.info('Gerando QA para planilha', { 
      documentId: document.id, 
      filename: document.filename,
      rows: rows.length,
      columns: headers.length,
      type: structure.type 
    });

    const qaPairs = [];

    // 1. QA sobre estrutura geral
    if (includeInsights) {
      const structureQA = await generateStructureQA(document, structure, insights);
      qaPairs.push(...structureQA);
    }

    // 2. QA sobre dados específicos
    if (includeDataAnalysis && rows.length > 0) {
      const dataQA = await generateDataQA(document, structure, rawData);
      qaPairs.push(...dataQA);
    }

    // 3. QA sobre insights específicos do tipo
    const typeQA = await generateTypeSpecificQA(document, structure, rawData);
    qaPairs.push(...typeQA);

    // Limitar número de perguntas
    const finalQA = qaPairs.slice(0, maxQuestions);
    
    logger.info(`Geradas ${finalQA.length} perguntas para planilha ${document.filename}`);
    return finalQA;

  } catch (error) {
    logger.error('Erro ao gerar QA para planilha', { documentId: document.id }, error);
    return [];
  }
}

/**
 * Gera QA sobre estrutura da planilha
 */
async function generateStructureQA(document, structure, insights) {
  const qaPairs = [];

  // Pergunta sobre dimensões
  qaPairs.push({
    question: `Quantas linhas e colunas tem a planilha "${document.filename}"?`,
    answer: `A planilha "${document.filename}" tem ${structure.rows} linhas e ${structure.columns} colunas.`,
    context: 'Informações sobre dimensões da planilha',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  });

  // Pergunta sobre tipo
  qaPairs.push({
    question: `Que tipo de dados contém a planilha "${document.filename}"?`,
    answer: `A planilha "${document.filename}" contém ${structure.description.toLowerCase()}.`,
    context: 'Classificação do tipo de dados',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  });

  // Pergunta sobre colunas
  if (structure.headers.length > 0) {
    const columnList = structure.headers.join(', ');
    qaPairs.push({
      question: `Quais são as colunas da planilha "${document.filename}"?`,
      answer: `As colunas da planilha "${document.filename}" são: ${columnList}.`,
      context: 'Lista de colunas disponíveis',
      source: {
        documentId: document.id,
        filename: document.filename,
        description: document.description
      },
      generatedAt: new Date().toISOString()
    });
  }

  return qaPairs;
}

/**
 * Gera QA sobre dados específicos
 */
async function generateDataQA(document, structure, rawData) {
  const qaPairs = [];
  const { headers, rows } = rawData;

  // Pergunta sobre total de registros
  qaPairs.push({
    question: `Quantos registros existem na planilha "${document.filename}"?`,
    answer: `A planilha "${document.filename}" contém ${rows.length} registros.`,
    context: 'Contagem total de registros',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  });

  // Pergunta sobre tipos de dados por coluna
  const columnTypes = structure.columnTypes;
  const typeDescriptions = Object.entries(columnTypes)
    .map(([col, type]) => `${col} (${type})`)
    .join(', ');

  qaPairs.push({
    question: `Que tipos de dados estão em cada coluna da planilha "${document.filename}"?`,
    answer: `Os tipos de dados na planilha "${document.filename}" são: ${typeDescriptions}.`,
    context: 'Análise de tipos de dados por coluna',
    source: {
      documentId: document.id,
      filename: document.filename,
      description: document.description
    },
    generatedAt: new Date().toISOString()
  });

  return qaPairs;
}

/**
 * Gera QA específica por tipo de planilha
 */
async function generateTypeSpecificQA(document, structure, rawData) {
  const qaPairs = [];
  const { headers, rows } = rawData;

  switch (structure.type) {
    case 'contacts':
      const nameCol = headers.find(h => h.toLowerCase().includes('nome') || h.toLowerCase().includes('name'));
      if (nameCol && rows.length > 0) {
        const firstNames = rows.slice(0, 3).map(row => row[nameCol]).filter(n => n);
        qaPairs.push({
          question: `Quais são alguns dos contatos na planilha "${document.filename}"?`,
          answer: `Alguns contatos na planilha "${document.filename}" incluem: ${firstNames.join(', ')}${rows.length > 3 ? ' e outros' : ''}.`,
          context: 'Exemplos de contatos na planilha',
          source: {
            documentId: document.id,
            filename: document.filename,
            description: document.description
          },
          generatedAt: new Date().toISOString()
        });
      }
      break;

    case 'products':
      const productCol = headers.find(h => h.toLowerCase().includes('produto') || h.toLowerCase().includes('product'));
      if (productCol && rows.length > 0) {
        const products = rows.slice(0, 3).map(row => row[productCol]).filter(p => p);
        qaPairs.push({
          question: `Quais produtos estão listados na planilha "${document.filename}"?`,
          answer: `A planilha "${document.filename}" inclui produtos como: ${products.join(', ')}${rows.length > 3 ? ' e outros' : ''}.`,
          context: 'Lista de produtos no catálogo',
          source: {
            documentId: document.id,
            filename: document.filename,
            description: document.description
          },
          generatedAt: new Date().toISOString()
        });
      }
      break;

    case 'financial':
      const numericCols = headers.filter(h => structure.columnTypes[h] === 'numeric');
      if (numericCols.length > 0 && rows.length > 0) {
        const firstCol = numericCols[0];
        const values = rows.slice(0, 3).map(row => row[firstCol]).filter(v => v);
        qaPairs.push({
          question: `Que valores financeiros estão na planilha "${document.filename}"?`,
          answer: `A planilha "${document.filename}" contém valores na coluna "${firstCol}" como: ${values.join(', ')}${rows.length > 3 ? ' e outros' : ''}.`,
          context: 'Dados financeiros na planilha',
          source: {
            documentId: document.id,
            filename: document.filename,
            description: document.description
          },
          generatedAt: new Date().toISOString()
        });
      }
      break;

    case 'time_series':
      const dateCol = headers.find(h => structure.columnTypes[h] === 'date');
      if (dateCol && rows.length > 0) {
        const dates = rows.map(row => row[dateCol]).filter(d => d);
        if (dates.length > 0) {
          qaPairs.push({
            question: `Qual o período de dados na planilha "${document.filename}"?`,
            answer: `A planilha "${document.filename}" contém dados do período: ${dates[0]} a ${dates[dates.length - 1]}.`,
            context: 'Período temporal dos dados',
            source: {
              documentId: document.id,
              filename: document.filename,
              description: document.description
            },
            generatedAt: new Date().toISOString()
          });
        }
      }
      break;
  }

  return qaPairs;
}

/**
 * Gera QA usando LLM para análise mais complexa
 */
async function generateAdvancedQA(document, structure, rawData) {
  try {
    const { headers, rows } = rawData;
    
    // Preparar dados para análise do LLM
    const dataSample = rows.slice(0, 5).map(row => 
      Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
    ).join('\n');

    const prompt = `Analise a seguinte planilha e gere uma pergunta e resposta útil sobre os dados:

PLANILHA: ${document.filename}
${document.description ? `DESCRIÇÃO: ${document.description}` : ''}
TIPO: ${structure.description}

COLUNAS: ${headers.join(', ')}

AMOSTRA DOS DADOS:
${dataSample}

Gere uma pergunta específica e uma resposta baseada nos dados mostrados. Foque em insights úteis ou padrões nos dados.

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
      temperature: 0.3,
      maxTokens: 400
    });

    const content = response.message.content.trim();
    
    // Extrair JSON
    let qaData;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*?\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      qaData = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.warn('Erro ao fazer parse do JSON da resposta do LLM', { content }, parseError);
      return null;
    }

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
    logger.error('Erro ao gerar QA avançada', { documentId: document.id }, error);
    return null;
  }
}

module.exports = { generateSpreadsheetQA };
