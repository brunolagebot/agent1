/**
 * Use Case: File Content Analyzer
 * Analisa o conteúdo de arquivos para determinar se devem ser incluídos no fine-tuning
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { parseSpreadsheet } = require('../../infra/documents/spreadsheet_parser');
const { createLogger } = require('../../infra/logging/logger');

const logger = createLogger('file_content_analyzer');

/**
 * Analisa um arquivo e determina se deve ser incluído no fine-tuning
 * @param {string} filePath - Caminho do arquivo
 * @param {Object} fileFilters - Filtros de arquivo
 * @param {Object} contentFilters - Filtros de conteúdo
 * @returns {Promise<Object>} Resultado da análise
 */
async function analyzeFile(filePath, fileFilters = {}, contentFilters = {}) {
  try {
    const stats = await fs.stat(filePath);
    const filename = path.basename(filePath);
    
    // Análise básica do arquivo
    const fileAnalysis = {
      filename,
      filePath,
      fileSize: stats.size,
      lastModified: stats.mtime,
      extension: path.extname(filename).toLowerCase(),
      hash: await calculateFileHash(filePath)
    };

    // Verificar filtros de arquivo
    const fileAllowed = isFileAllowed(fileAnalysis, fileFilters);
    if (!fileAllowed.allowed) {
      return {
        ...fileAnalysis,
        included: false,
        reason: fileAllowed.reason,
        contentType: 'excluded'
      };
    }

    // Extrair e analisar conteúdo
    const content = await extractContent(filePath, fileAnalysis.extension);
    if (!content) {
      return {
        ...fileAnalysis,
        included: false,
        reason: 'Não foi possível extrair conteúdo do arquivo',
        contentType: 'unreadable'
      };
    }

    // Verificar filtros de conteúdo
    const contentAllowed = isContentAllowed(content, contentFilters);
    if (!contentAllowed.allowed) {
      return {
        ...fileAnalysis,
        included: false,
        reason: contentAllowed.reason,
        contentType: 'excluded',
        contentLength: content.length
      };
    }

    // Análise de qualidade do conteúdo
    const qualityAnalysis = analyzeContentQuality(content, fileAnalysis.extension);

    return {
      ...fileAnalysis,
      included: true,
      reason: 'Arquivo aprovado para fine-tuning',
      contentType: getContentType(fileAnalysis.extension),
      contentLength: content.length,
      contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      qualityScore: qualityAnalysis.score,
      qualityMetrics: qualityAnalysis.metrics,
      suggestedDescription: generateDescription(filename, content, qualityAnalysis)
    };

  } catch (error) {
    logger.error(`Erro ao analisar arquivo ${filePath}`, {}, error);
    return {
      filename: path.basename(filePath),
      filePath,
      included: false,
      reason: `Erro na análise: ${error.message}`,
      contentType: 'error'
    };
  }
}

/**
 * Verifica se um arquivo é permitido pelos filtros
 */
function isFileAllowed(fileAnalysis, filters) {
  const { allowedExtensions = [], maxFileSize = 50 * 1024 * 1024, excludePatterns = [] } = filters;
  
  // Verificar extensão
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(fileAnalysis.extension)) {
    return { allowed: false, reason: `Extensão não permitida: ${fileAnalysis.extension}` };
  }
  
  // Verificar tamanho
  if (fileAnalysis.fileSize > maxFileSize) {
    return { allowed: false, reason: `Arquivo muito grande: ${(fileAnalysis.fileSize / 1024 / 1024).toFixed(1)}MB` };
  }
  
  // Verificar padrões de exclusão
  for (const pattern of excludePatterns) {
    if (matchesPattern(fileAnalysis.filename, pattern)) {
      return { allowed: false, reason: `Arquivo excluído pelo padrão: ${pattern}` };
    }
  }
  
  return { allowed: true };
}

/**
 * Verifica se o conteúdo é permitido pelos filtros
 */
function isContentAllowed(content, filters) {
  const { 
    minContentLength = 100, 
    maxContentLength = 1000000, 
    excludeKeywords = [], 
    requireKeywords = [] 
  } = filters;
  
  // Verificar tamanho do conteúdo
  if (content.length < minContentLength) {
    return { allowed: false, reason: `Conteúdo muito curto: ${content.length} caracteres` };
  }
  
  if (content.length > maxContentLength) {
    return { allowed: false, reason: `Conteúdo muito longo: ${content.length} caracteres` };
  }
  
  // Verificar palavras-chave de exclusão
  const contentLower = content.toLowerCase();
  for (const keyword of excludeKeywords) {
    if (contentLower.includes(keyword.toLowerCase())) {
      return { allowed: false, reason: `Conteúdo contém palavra excluída: ${keyword}` };
    }
  }
  
  // Verificar palavras-chave obrigatórias
  if (requireKeywords.length > 0) {
    const hasRequiredKeyword = requireKeywords.some(keyword => 
      contentLower.includes(keyword.toLowerCase())
    );
    if (!hasRequiredKeyword) {
      return { allowed: false, reason: `Conteúdo não contém palavras-chave obrigatórias` };
    }
  }
  
  return { allowed: true };
}

/**
 * Extrai conteúdo de diferentes tipos de arquivo
 */
async function extractContent(filePath, extension) {
  try {
    switch (extension) {
      case '.txt':
      case '.md':
        return await fs.readFile(filePath, 'utf-8');
      
      case '.csv':
      case '.xlsx':
      case '.xls':
        const spreadsheetData = await parseSpreadsheet(filePath);
        return spreadsheetData.content;
      
      case '.pdf':
        // Para PDFs, usar o parser existente
        const { parsePDF } = require('../../infra/documents/pdf_parser');
        const pdfData = await parsePDF(filePath);
        return pdfData.contentText;
      
      case '.docx':
        // Implementar parser de DOCX se necessário
        return await fs.readFile(filePath, 'utf-8');
      
      default:
        return await fs.readFile(filePath, 'utf-8');
    }
  } catch (error) {
    logger.warn(`Erro ao extrair conteúdo de ${filePath}`, {}, error);
    return null;
  }
}

/**
 * Analisa a qualidade do conteúdo
 */
function analyzeContentQuality(content, extension) {
  const metrics = {
    length: content.length,
    lines: content.split('\n').length,
    words: content.split(/\s+/).filter(w => w.length > 0).length,
    sentences: content.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
    paragraphs: content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length,
    hasNumbers: /\d/.test(content),
    hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(content),
    readabilityScore: calculateReadabilityScore(content)
  };

  // Calcular score de qualidade (0-100)
  let score = 0;
  
  // Tamanho adequado (20 pontos)
  if (metrics.length >= 500 && metrics.length <= 50000) score += 20;
  else if (metrics.length >= 100 && metrics.length <= 100000) score += 15;
  else if (metrics.length >= 50) score += 10;
  
  // Estrutura (20 pontos)
  if (metrics.paragraphs > 1) score += 10;
  if (metrics.sentences > 5) score += 10;
  
  // Legibilidade (20 pontos)
  if (metrics.readabilityScore > 0.6) score += 20;
  else if (metrics.readabilityScore > 0.4) score += 15;
  else if (metrics.readabilityScore > 0.2) score += 10;
  
  // Conteúdo informativo (20 pontos)
  if (metrics.hasNumbers) score += 10;
  if (metrics.words > 50) score += 10;
  
  // Densidade de informação (20 pontos)
  const infoDensity = metrics.words / metrics.length;
  if (infoDensity > 0.1) score += 20;
  else if (infoDensity > 0.05) score += 15;
  else if (infoDensity > 0.02) score += 10;

  return {
    score: Math.min(100, score),
    metrics
  };
}

/**
 * Calcula um score simples de legibilidade
 */
function calculateReadabilityScore(content) {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  // Fórmula simplificada de legibilidade
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  // Score entre 0 e 1 (maior = mais legível)
  const score = Math.max(0, 1 - (avgWordsPerSentence * 0.1) - (avgSyllablesPerWord * 0.2));
  return Math.min(1, score);
}

/**
 * Conta sílabas em uma palavra (aproximação)
 */
function countSyllables(word) {
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i].toLowerCase());
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Palavras sem vogais têm pelo menos 1 sílaba
  return Math.max(1, count);
}

/**
 * Gera uma descrição sugerida para o arquivo
 */
function generateDescription(filename, content, qualityAnalysis) {
  const { metrics } = qualityAnalysis;
  
  // Extrair primeiras palavras significativas
  const words = content.split(/\s+/).slice(0, 10).join(' ');
  
  // Determinar tipo de conteúdo
  let type = 'Documento';
  if (metrics.hasNumbers && content.includes(',')) type = 'Planilha/Dados';
  else if (content.includes('##') || content.includes('#')) type = 'Documentação';
  else if (content.includes('http') || content.includes('www')) type = 'Referência';
  
  return `${type} - ${words}... (${metrics.words} palavras, ${metrics.paragraphs} parágrafos)`;
}

/**
 * Determina o tipo de conteúdo baseado na extensão
 */
function getContentType(extension) {
  const typeMap = {
    '.pdf': 'document',
    '.txt': 'text',
    '.md': 'markdown',
    '.docx': 'document',
    '.csv': 'spreadsheet',
    '.xlsx': 'spreadsheet',
    '.xls': 'spreadsheet'
  };
  return typeMap[extension] || 'unknown';
}

/**
 * Calcula hash MD5 do arquivo
 */
async function calculateFileHash(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Verifica se um nome de arquivo corresponde a um padrão
 */
function matchesPattern(filename, pattern) {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  return regex.test(filename);
}

module.exports = { analyzeFile };
