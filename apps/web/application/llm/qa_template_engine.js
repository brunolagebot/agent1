/**
 * QA Template Engine
 * Sistema avançado de geração de Q&A baseado em templates inteligentes
 */

const { createLogger } = require('../../infra/logging/logger');

const logger = createLogger('qa_template_engine');

/**
 * Templates de Q&A por tipo de documento
 */
const QA_TEMPLATES = {
  contract: {
    basic: [
      {
        question: "Qual é o objeto do contrato {filename}?",
        answer: "O contrato {filename} tem como objeto {main_topic}.",
        context: "Objeto do contrato"
      },
      {
        question: "Quais são as partes envolvidas no contrato {filename}?",
        answer: "As partes envolvidas no contrato são {entities}.",
        context: "Partes contratuais"
      },
      {
        question: "Qual é o valor do contrato {filename}?",
        answer: "O valor do contrato é {monetary_values}.",
        context: "Valor contratual"
      },
      {
        question: "Qual é o prazo de vigência do contrato {filename}?",
        answer: "O contrato tem vigência de {dates}.",
        context: "Prazo de vigência"
      }
    ],
    advanced: [
      {
        question: "Quais são as principais cláusulas do contrato {filename}?",
        answer: "As principais cláusulas incluem: {main_topics}.",
        context: "Cláusulas principais"
      },
      {
        question: "Quais são as obrigações das partes no contrato {filename}?",
        answer: "As obrigações incluem {structured_data} e {keywords}.",
        context: "Obrigações contratuais"
      }
    ]
  },
  
  financial: {
    basic: [
      {
        question: "Qual é o valor total mencionado no documento {filename}?",
        answer: "O documento {filename} menciona os seguintes valores: {monetary_values}.",
        context: "Valores financeiros"
      },
      {
        question: "Qual é o período financeiro do documento {filename}?",
        answer: "O documento refere-se ao período de {dates}.",
        context: "Período financeiro"
      },
      {
        question: "Que tipo de informações financeiras estão no documento {filename}?",
        answer: "O documento contém informações sobre {main_topics}.",
        context: "Tipo de informações"
      }
    ],
    advanced: [
      {
        question: "Quais são as principais receitas mencionadas no documento {filename}?",
        answer: "As principais receitas incluem: {monetary_values}.",
        context: "Receitas"
      },
      {
        question: "Quais são as despesas principais do documento {filename}?",
        answer: "As despesas principais são: {keywords}.",
        context: "Despesas"
      }
    ]
  },
  
  technical: {
    basic: [
      {
        question: "Qual é o objetivo técnico do documento {filename}?",
        answer: "O documento {filename} tem como objetivo {main_topic}.",
        context: "Objetivo técnico"
      },
      {
        question: "Quais são as especificações técnicas do documento {filename}?",
        answer: "As especificações incluem: {main_topics}.",
        context: "Especificações técnicas"
      },
      {
        question: "Que procedimentos estão descritos no documento {filename}?",
        answer: "O documento descreve os seguintes procedimentos: {keywords}.",
        context: "Procedimentos"
      }
    ],
    advanced: [
      {
        question: "Quais são os requisitos técnicos do documento {filename}?",
        answer: "Os requisitos técnicos incluem: {structured_data}.",
        context: "Requisitos técnicos"
      },
      {
        question: "Quais são as normas aplicáveis no documento {filename}?",
        answer: "As normas aplicáveis são: {entities}.",
        context: "Normas aplicáveis"
      }
    ]
  },
  
  spreadsheet: {
    basic: [
      {
        question: "Que tipo de dados estão na planilha {filename}?",
        answer: "A planilha {filename} contém dados sobre {main_topics}.",
        context: "Tipo de dados"
      },
      {
        question: "Quantos registros existem na planilha {filename}?",
        answer: "A planilha contém {contact_info} registros.",
        context: "Quantidade de registros"
      },
      {
        question: "Que informações de contato estão na planilha {filename}?",
        answer: "A planilha contém as seguintes informações de contato: {structured_data}.",
        context: "Informações de contato"
      }
    ],
    advanced: [
      {
        question: "Quais são os campos principais da planilha {filename}?",
        answer: "Os campos principais incluem: {keywords}.",
        context: "Campos principais"
      },
      {
        question: "Que análises podem ser feitas com os dados da planilha {filename}?",
        answer: "Com os dados da planilha é possível analisar: {main_topics}.",
        context: "Análises possíveis"
      }
    ]
  },
  
  general: {
    basic: [
      {
        question: "O que é o documento {filename}?",
        answer: "O documento {filename} é um {document_type} que contém informações sobre {main_topic}.",
        context: "Identificação do documento"
      },
      {
        question: "Qual é o conteúdo principal do documento {filename}?",
        answer: "O documento aborda os seguintes tópicos: {main_topics}.",
        context: "Conteúdo principal"
      },
      {
        question: "Que informações importantes estão no documento {filename}?",
        answer: "O documento contém as seguintes informações importantes: {structured_data}.",
        context: "Informações importantes"
      }
    ],
    advanced: [
      {
        question: "Quais são os pontos-chave do documento {filename}?",
        answer: "Os pontos-chave incluem: {keywords}.",
        context: "Pontos-chave"
      },
      {
        question: "Que dados podem ser extraídos do documento {filename}?",
        answer: "Do documento podem ser extraídos: {structured_data} e {monetary_values}.",
        context: "Dados extraíveis"
      }
    ]
  }
};

/**
 * Gera Q&A baseado em templates inteligentes
 * @param {Object} document - Documento a ser analisado
 * @param {Object} analysis - Análise do conteúdo
 * @param {number} maxQuestions - Número máximo de perguntas
 * @returns {Array} Array de pares Q&A
 */
function generateTemplateBasedQA(document, analysis, maxQuestions = 5) {
  const qaPairs = [];
  const { filename, description } = document;
  
  // Determinar templates a usar
  const templates = QA_TEMPLATES[analysis.documentType] || QA_TEMPLATES.general;
  
  // Gerar Q&A básico
  const basicQAs = generateQAsFromTemplates(templates.basic, document, analysis);
  qaPairs.push(...basicQAs);
  
  // Gerar Q&A avançado se houver dados suficientes
  if (analysis.structuredData.length > 0 || analysis.monetaryValues.length > 0) {
    const advancedQAs = generateQAsFromTemplates(templates.advanced, document, analysis);
    qaPairs.push(...advancedQAs);
  }
  
  // Gerar Q&A contextual específico
  const contextualQAs = generateContextualQA(document, analysis);
  qaPairs.push(...contextualQAs);
  
  // Limitar ao número máximo
  return qaPairs.slice(0, maxQuestions);
}

/**
 * Gera Q&A a partir de templates
 */
function generateQAsFromTemplates(templates, document, analysis) {
  const qaPairs = [];
  
  for (const template of templates) {
    try {
      const qa = {
        question: replaceTemplateVariables(template.question, document, analysis),
        answer: replaceTemplateVariables(template.answer, document, analysis),
        context: template.context,
        source: {
          documentId: document.id,
          filename: document.filename,
          description: document.description
        },
        generatedAt: new Date().toISOString(),
        template: true
      };
      
      // Verificar se a resposta não está vazia ou muito genérica
      if (qa.answer && !qa.answer.includes('{') && qa.answer.length > 20) {
        qaPairs.push(qa);
      }
    } catch (error) {
      logger.warn(`Erro ao processar template: ${template.question}`, {}, error);
    }
  }
  
  return qaPairs;
}

/**
 * Substitui variáveis nos templates
 */
function replaceTemplateVariables(text, document, analysis) {
  let result = text;
  
  // Variáveis básicas
  result = result.replace(/{filename}/g, document.filename);
  result = result.replace(/{document_type}/g, analysis.documentType);
  result = result.replace(/{description}/g, document.description || 'documento');
  
  // Variáveis de análise
  result = result.replace(/{main_topic}/g, analysis.mainTopics[0] || 'informações gerais');
  result = result.replace(/{main_topics}/g, analysis.mainTopics.slice(0, 3).join(', ') || 'tópicos diversos');
  result = result.replace(/{keywords}/g, analysis.keywords.slice(0, 3).join(', ') || 'informações relevantes');
  
  // Dados estruturados
  const structuredDataText = analysis.structuredData.map(d => d.type).join(', ') || 'dados diversos';
  result = result.replace(/{structured_data}/g, structuredDataText);
  
  // Valores monetários
  const monetaryText = analysis.monetaryValues.slice(0, 2).join(', ') || 'valores não especificados';
  result = result.replace(/{monetary_values}/g, monetaryText);
  
  // Datas
  const datesText = analysis.dates.slice(0, 2).join(', ') || 'datas não especificadas';
  result = result.replace(/{dates}/g, datesText);
  
  // Entidades
  const entitiesText = analysis.entities.slice(0, 2).join(', ') || 'entidades não identificadas';
  result = result.replace(/{entities}/g, entitiesText);
  
  // Informações de contato
  const contactText = analysis.contactInfo.slice(0, 2).join(', ') || 'contatos não especificados';
  result = result.replace(/{contact_info}/g, contactText);
  
  return result;
}

/**
 * Gera Q&A contextual específico baseado no conteúdo
 */
function generateContextualQA(document, analysis) {
  const qaPairs = [];
  
  // Q&A baseado em dados específicos encontrados
  if (analysis.structuredData.length > 0) {
    for (const data of analysis.structuredData.slice(0, 2)) {
      if (data.type === 'CNPJ') {
        qaPairs.push({
          question: `Qual é o CNPJ mencionado no documento "${document.filename}"?`,
          answer: `O documento menciona o CNPJ: ${data.values.join(', ')}.`,
          context: 'CNPJ',
          source: {
            documentId: document.id,
            filename: document.filename,
            description: document.description
          },
          generatedAt: new Date().toISOString(),
          contextual: true
        });
      } else if (data.type === 'CPF') {
        qaPairs.push({
          question: `Qual é o CPF mencionado no documento "${document.filename}"?`,
          answer: `O documento menciona o CPF: ${data.values.join(', ')}.`,
          context: 'CPF',
          source: {
            documentId: document.id,
            filename: document.filename,
            description: document.description
          },
          generatedAt: new Date().toISOString(),
          contextual: true
        });
      } else if (data.type === 'Email') {
        qaPairs.push({
          question: `Quais são os emails mencionados no documento "${document.filename}"?`,
          answer: `O documento menciona os seguintes emails: ${data.values.join(', ')}.`,
          context: 'Emails',
          source: {
            documentId: document.id,
            filename: document.filename,
            description: document.description
          },
          generatedAt: new Date().toISOString(),
          contextual: true
        });
      }
    }
  }
  
  // Q&A baseado em endereços
  if (analysis.addresses.length > 0) {
    qaPairs.push({
      question: `Qual é o endereço mencionado no documento "${document.filename}"?`,
      answer: `O documento menciona o seguinte endereço: ${analysis.addresses[0]}.`,
      context: 'Endereço',
      source: {
        documentId: document.id,
        filename: document.filename,
        description: document.description
      },
      generatedAt: new Date().toISOString(),
      contextual: true
    });
  }
  
  // Q&A baseado em valores monetários específicos
  if (analysis.monetaryValues.length > 0) {
    qaPairs.push({
      question: `Quais são os valores mencionados no documento "${document.filename}"?`,
      answer: `O documento menciona os seguintes valores: ${analysis.monetaryValues.slice(0, 3).join(', ')}.`,
      context: 'Valores monetários',
      source: {
        documentId: document.id,
        filename: document.filename,
        description: document.description
      },
      generatedAt: new Date().toISOString(),
      contextual: true
    });
  }
  
  return qaPairs;
}

/**
 * Gera Q&A comparativo entre documentos
 */
function generateComparativeQA(documents, analysis) {
  const qaPairs = [];
  
  if (documents.length < 2) return qaPairs;
  
  // Comparar tipos de documento
  const documentTypes = documents.map(d => d.analysis?.documentType || 'general');
  const uniqueTypes = [...new Set(documentTypes)];
  
  if (uniqueTypes.length > 1) {
    qaPairs.push({
      question: "Quais são os diferentes tipos de documentos disponíveis?",
      answer: `Os documentos incluem: ${uniqueTypes.join(', ')}.`,
      context: 'Comparação de tipos',
      source: {
        documentIds: documents.map(d => d.id),
        filenames: documents.map(d => d.filename)
      },
      generatedAt: new Date().toISOString(),
      comparative: true
    });
  }
  
  // Comparar valores monetários
  const allMonetaryValues = documents
    .flatMap(d => d.analysis?.monetaryValues || [])
    .filter(v => v);
  
  if (allMonetaryValues.length > 1) {
    qaPairs.push({
      question: "Quais são todos os valores monetários mencionados nos documentos?",
      answer: `Os documentos mencionam os seguintes valores: ${allMonetaryValues.slice(0, 5).join(', ')}.`,
      context: 'Comparação de valores',
      source: {
        documentIds: documents.map(d => d.id),
        filenames: documents.map(d => d.filename)
      },
      generatedAt: new Date().toISOString(),
      comparative: true
    });
  }
  
  return qaPairs;
}

/**
 * Gera Q&A de resumo geral
 */
function generateSummaryQA(documents, analysis) {
  const qaPairs = [];
  
  if (documents.length === 0) return qaPairs;
  
  // Resumo geral
  qaPairs.push({
    question: "Qual é um resumo geral dos documentos disponíveis?",
    answer: `Existem ${documents.length} documentos disponíveis, incluindo ${documents.map(d => d.filename).join(', ')}.`,
    context: 'Resumo geral',
    source: {
      documentIds: documents.map(d => d.id),
      filenames: documents.map(d => d.filename)
    },
    generatedAt: new Date().toISOString(),
    summary: true
  });
  
  return qaPairs;
}

module.exports = { 
  generateTemplateBasedQA, 
  generateComparativeQA, 
  generateSummaryQA,
  QA_TEMPLATES 
};
