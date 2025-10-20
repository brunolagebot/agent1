/**
 * QA Quality Validator
 * Sistema de validação e melhoria da qualidade dos pares Q&A
 */

const { createLogger } = require('../../infra/logging/logger');

const logger = createLogger('qa_quality_validator');

/**
 * Valida e melhora a qualidade dos pares Q&A
 * @param {Array} qaPairs - Array de pares Q&A
 * @returns {Array} Array de pares Q&A validados e melhorados
 */
function validateAndImproveQA(qaPairs) {
  const validatedQAs = [];
  
  for (const qa of qaPairs) {
    try {
      const validation = validateQAPair(qa);
      
      if (validation.isValid) {
        const improvedQA = improveQAPair(qa, validation);
        validatedQAs.push(improvedQA);
      } else {
        logger.warn(`QA pair rejeitado: ${qa.question}`, { reasons: validation.reasons });
      }
    } catch (error) {
      logger.error('Erro ao validar QA pair', { qa }, error);
    }
  }
  
  return validatedQAs;
}

/**
 * Valida um par Q&A individual
 * @param {Object} qa - Par Q&A
 * @returns {Object} Resultado da validação
 */
function validateQAPair(qa) {
  const validation = {
    isValid: true,
    reasons: [],
    score: 0,
    improvements: []
  };
  
  // Validar estrutura básica
  if (!qa.question || !qa.answer) {
    validation.isValid = false;
    validation.reasons.push('Pergunta ou resposta ausente');
    return validation;
  }
  
  // Validar tamanho mínimo
  if (qa.question.length < 10) {
    validation.isValid = false;
    validation.reasons.push('Pergunta muito curta');
  }
  
  if (qa.answer.length < 20) {
    validation.isValid = false;
    validation.reasons.push('Resposta muito curta');
  }
  
  // Validar tamanho máximo
  if (qa.question.length > 200) {
    validation.reasons.push('Pergunta muito longa');
    validation.improvements.push('Encurtar pergunta');
  }
  
  if (qa.answer.length > 500) {
    validation.reasons.push('Resposta muito longa');
    validation.improvements.push('Encurtar resposta');
  }
  
  // Validar qualidade da pergunta
  const questionQuality = analyzeQuestionQuality(qa.question);
  validation.score += questionQuality.score;
  
  if (questionQuality.issues.length > 0) {
    validation.reasons.push(...questionQuality.issues);
    validation.improvements.push(...questionQuality.improvements);
  }
  
  // Validar qualidade da resposta
  const answerQuality = analyzeAnswerQuality(qa.answer);
  validation.score += answerQuality.score;
  
  if (answerQuality.issues.length > 0) {
    validation.reasons.push(...answerQuality.issues);
    validation.improvements.push(...answerQuality.improvements);
  }
  
  // Validar relevância
  const relevance = analyzeRelevance(qa.question, qa.answer);
  validation.score += relevance.score;
  
  if (relevance.issues.length > 0) {
    validation.reasons.push(...relevance.issues);
    validation.improvements.push(...relevance.improvements);
  }
  
  // Validar especificidade
  const specificity = analyzeSpecificity(qa);
  validation.score += specificity.score;
  
  if (specificity.issues.length > 0) {
    validation.reasons.push(...specificity.issues);
    validation.improvements.push(...specificity.improvements);
  }
  
  // Determinar se é válido baseado no score
  if (validation.score < 30) {
    validation.isValid = false;
    validation.reasons.push('Score de qualidade muito baixo');
  }
  
  return validation;
}

/**
 * Analisa a qualidade da pergunta
 */
function analyzeQuestionQuality(question) {
  const analysis = {
    score: 0,
    issues: [],
    improvements: []
  };
  
  // Verificar se é uma pergunta real
  if (!question.includes('?') && !question.includes('qual') && !question.includes('que') && !question.includes('como')) {
    analysis.issues.push('Não parece ser uma pergunta');
    analysis.improvements.push('Reformular como pergunta');
  } else {
    analysis.score += 20;
  }
  
  // Verificar clareza
  if (question.length > 50 && question.length < 150) {
    analysis.score += 15;
  } else if (question.length <= 50) {
    analysis.issues.push('Pergunta muito simples');
    analysis.improvements.push('Adicionar mais contexto');
  } else {
    analysis.issues.push('Pergunta muito complexa');
    analysis.improvements.push('Simplificar pergunta');
  }
  
  // Verificar palavras-chave específicas
  const specificKeywords = ['qual', 'que', 'como', 'quando', 'onde', 'quem', 'por que', 'quanto'];
  const hasSpecificKeyword = specificKeywords.some(keyword => question.toLowerCase().includes(keyword));
  
  if (hasSpecificKeyword) {
    analysis.score += 10;
  } else {
    analysis.issues.push('Falta palavra-chave específica');
    analysis.improvements.push('Usar palavras como "qual", "que", "como"');
  }
  
  // Verificar se não é muito genérica
  const genericPhrases = ['o que é', 'informações sobre', 'dados do documento'];
  const isGeneric = genericPhrases.some(phrase => question.toLowerCase().includes(phrase));
  
  if (isGeneric) {
    analysis.issues.push('Pergunta muito genérica');
    analysis.improvements.push('Tornar pergunta mais específica');
  } else {
    analysis.score += 10;
  }
  
  return analysis;
}

/**
 * Analisa a qualidade da resposta
 */
function analyzeAnswerQuality(answer) {
  const analysis = {
    score: 0,
    issues: [],
    improvements: []
  };
  
  // Verificar tamanho adequado
  if (answer.length >= 30 && answer.length <= 300) {
    analysis.score += 20;
  } else if (answer.length < 30) {
    analysis.issues.push('Resposta muito curta');
    analysis.improvements.push('Expandir resposta');
  } else {
    analysis.issues.push('Resposta muito longa');
    analysis.improvements.push('Encurtar resposta');
  }
  
  // Verificar se contém informações específicas
  const hasSpecificInfo = /[\d.,]+|CNPJ|CPF|R\$|email|telefone|endereço/i.test(answer);
  if (hasSpecificInfo) {
    analysis.score += 15;
  } else {
    analysis.issues.push('Resposta muito genérica');
    analysis.improvements.push('Incluir informações específicas');
  }
  
  // Verificar estrutura
  if (answer.includes('.') && answer.split('.').length > 1) {
    analysis.score += 10;
  } else {
    analysis.issues.push('Resposta mal estruturada');
    analysis.improvements.push('Melhorar estrutura da resposta');
  }
  
  // Verificar se não é apenas uma repetição da pergunta
  const questionWords = answer.toLowerCase().split(' ').slice(0, 5);
  const answerWords = answer.toLowerCase().split(' ').slice(0, 5);
  const isRepetition = questionWords.every(word => answerWords.includes(word));
  
  if (isRepetition) {
    analysis.issues.push('Resposta apenas repete a pergunta');
    analysis.improvements.push('Fornecer informações adicionais');
  } else {
    analysis.score += 10;
  }
  
  return analysis;
}

/**
 * Analisa a relevância entre pergunta e resposta
 */
function analyzeRelevance(question, answer) {
  const analysis = {
    score: 0,
    issues: [],
    improvements: []
  };
  
  // Extrair palavras-chave da pergunta
  const questionKeywords = extractKeywords(question.toLowerCase());
  const answerKeywords = extractKeywords(answer.toLowerCase());
  
  // Verificar sobreposição de palavras-chave
  const commonKeywords = questionKeywords.filter(keyword => answerKeywords.includes(keyword));
  const relevanceRatio = commonKeywords.length / Math.max(questionKeywords.length, 1);
  
  if (relevanceRatio > 0.3) {
    analysis.score += 20;
  } else {
    analysis.issues.push('Baixa relevância entre pergunta e resposta');
    analysis.improvements.push('Melhorar alinhamento entre pergunta e resposta');
  }
  
  // Verificar se a resposta responde à pergunta
  const questionType = detectQuestionType(question);
  const answerType = detectAnswerType(answer);
  
  if (questionType === answerType) {
    analysis.score += 15;
  } else {
    analysis.issues.push('Tipo de resposta não corresponde à pergunta');
    analysis.improvements.push('Ajustar tipo de resposta');
  }
  
  return analysis;
}

/**
 * Analisa a especificidade do Q&A
 */
function analyzeSpecificity(qa) {
  const analysis = {
    score: 0,
    issues: [],
    improvements: []
  };
  
  // Verificar se menciona o documento específico
  if (qa.source && qa.source.filename) {
    if (qa.question.includes(qa.source.filename) || qa.answer.includes(qa.source.filename)) {
      analysis.score += 15;
    } else {
      analysis.issues.push('Não menciona o documento específico');
      analysis.improvements.push('Incluir nome do documento');
    }
  }
  
  // Verificar se tem contexto específico
  if (qa.context && qa.context !== 'general') {
    analysis.score += 10;
  } else {
    analysis.issues.push('Falta contexto específico');
    analysis.improvements.push('Adicionar contexto específico');
  }
  
  // Verificar se contém dados específicos
  const hasSpecificData = /[\d.,]+|CNPJ|CPF|R\$|@|\(|\)/i.test(qa.answer);
  if (hasSpecificData) {
    analysis.score += 15;
  } else {
    analysis.issues.push('Falta dados específicos');
    analysis.improvements.push('Incluir dados específicos');
  }
  
  return analysis;
}

/**
 * Melhora um par Q&A baseado na validação
 */
function improveQAPair(qa, validation) {
  const improved = { ...qa };
  
  // Aplicar melhorias sugeridas
  for (const improvement of validation.improvements) {
    switch (improvement) {
      case 'Encurtar pergunta':
        improved.question = shortenText(improved.question, 150);
        break;
      case 'Encurtar resposta':
        improved.answer = shortenText(improved.answer, 300);
        break;
      case 'Expandir resposta':
        improved.answer = expandAnswer(improved.answer, qa);
        break;
      case 'Reformular como pergunta':
        improved.question = reformulateAsQuestion(improved.question);
        break;
      case 'Adicionar mais contexto':
        improved.question = addContext(improved.question, qa);
        break;
      case 'Simplificar pergunta':
        improved.question = simplifyQuestion(improved.question);
        break;
      case 'Usar palavras como "qual", "que", "como"':
        improved.question = addQuestionWords(improved.question);
        break;
      case 'Tornar pergunta mais específica':
        improved.question = makeMoreSpecific(improved.question, qa);
        break;
      case 'Incluir informações específicas':
        improved.answer = addSpecificInfo(improved.answer, qa);
        break;
      case 'Melhorar estrutura da resposta':
        improved.answer = improveStructure(improved.answer);
        break;
      case 'Fornecer informações adicionais':
        improved.answer = addAdditionalInfo(improved.answer, qa);
        break;
      case 'Melhorar alinhamento entre pergunta e resposta':
        improved.answer = improveAlignment(improved.answer, improved.question);
        break;
      case 'Ajustar tipo de resposta':
        improved.answer = adjustAnswerType(improved.answer, improved.question);
        break;
      case 'Incluir nome do documento':
        improved.question = includeDocumentName(improved.question, qa);
        improved.answer = includeDocumentName(improved.answer, qa);
        break;
      case 'Adicionar contexto específico':
        improved.context = generateSpecificContext(qa);
        break;
      case 'Incluir dados específicos':
        improved.answer = includeSpecificData(improved.answer, qa);
        break;
    }
  }
  
  // Adicionar metadados de qualidade
  improved.qualityScore = validation.score;
  improved.validatedAt = new Date().toISOString();
  improved.improvements = validation.improvements;
  
  return improved;
}

// Funções auxiliares para melhorias
function extractKeywords(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['que', 'qual', 'como', 'quando', 'onde', 'quem', 'por', 'para', 'com', 'dos', 'das', 'pelo', 'pela'].includes(word));
}

function detectQuestionType(question) {
  if (question.includes('qual') || question.includes('que')) return 'what';
  if (question.includes('como')) return 'how';
  if (question.includes('quando')) return 'when';
  if (question.includes('onde')) return 'where';
  if (question.includes('quem')) return 'who';
  if (question.includes('por que')) return 'why';
  if (question.includes('quanto')) return 'how_much';
  return 'general';
}

function detectAnswerType(answer) {
  if (/[\d.,]+/.test(answer)) return 'numeric';
  if (/CNPJ|CPF|email|telefone/.test(answer)) return 'identifier';
  if (/R\$|USD|EUR/.test(answer)) return 'monetary';
  if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(answer)) return 'date';
  return 'text';
}

function shortenText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function expandAnswer(answer, qa) {
  if (qa.source && qa.source.filename) {
    return `${answer} Esta informação está disponível no documento "${qa.source.filename}".`;
  }
  return answer;
}

function reformulateAsQuestion(text) {
  if (text.includes('?')) return text;
  return `Qual é ${text.toLowerCase()}?`;
}

function addContext(question, qa) {
  if (qa.source && qa.source.filename) {
    return `${question} (referente ao documento "${qa.source.filename}")`;
  }
  return question;
}

function simplifyQuestion(question) {
  // Simplificar perguntas muito longas
  const sentences = question.split('.');
  if (sentences.length > 1) {
    return sentences[0] + '?';
  }
  return question;
}

function addQuestionWords(question) {
  if (!question.includes('qual') && !question.includes('que') && !question.includes('como')) {
    return `Qual é ${question.toLowerCase()}?`;
  }
  return question;
}

function makeMoreSpecific(question, qa) {
  if (qa.source && qa.source.filename) {
    return question.replace('documento', `documento "${qa.source.filename}"`);
  }
  return question;
}

function addSpecificInfo(answer, qa) {
  if (qa.source && qa.source.description) {
    return `${answer} ${qa.source.description}`;
  }
  return answer;
}

function improveStructure(answer) {
  if (!answer.includes('.')) {
    return answer + '.';
  }
  return answer;
}

function addAdditionalInfo(answer, qa) {
  if (qa.context) {
    return `${answer} (Contexto: ${qa.context})`;
  }
  return answer;
}

function improveAlignment(answer, question) {
  // Tentar melhorar o alinhamento baseado nas palavras-chave da pergunta
  const questionKeywords = extractKeywords(question);
  const answerKeywords = extractKeywords(answer);
  
  const missingKeywords = questionKeywords.filter(kw => !answerKeywords.includes(kw));
  if (missingKeywords.length > 0) {
    return `${answer} Relacionado a: ${missingKeywords.slice(0, 2).join(', ')}.`;
  }
  
  return answer;
}

function adjustAnswerType(answer, question) {
  const questionType = detectQuestionType(question);
  const answerType = detectAnswerType(answer);
  
  if (questionType === 'how_much' && answerType !== 'monetary' && answerType !== 'numeric') {
    return `${answer} (Valor não especificado)`;
  }
  
  return answer;
}

function includeDocumentName(text, qa) {
  if (qa.source && qa.source.filename && !text.includes(qa.source.filename)) {
    return text.replace('documento', `documento "${qa.source.filename}"`);
  }
  return text;
}

function generateSpecificContext(qa) {
  if (qa.source && qa.source.filename) {
    const ext = qa.source.filename.split('.').pop().toLowerCase();
    return `Documento ${ext.toUpperCase()}`;
  }
  return 'Documento';
}

function includeSpecificData(answer, qa) {
  // Tentar extrair dados específicos do contexto
  if (qa.source && qa.source.description) {
    const specificData = qa.source.description.match(/[\d.,]+|CNPJ|CPF|R\$|@/g);
    if (specificData && specificData.length > 0) {
      return `${answer} Dados específicos: ${specificData.slice(0, 2).join(', ')}.`;
    }
  }
  return answer;
}

module.exports = { validateAndImproveQA };
