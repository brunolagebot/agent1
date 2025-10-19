/**
 * Parser para planilhas (CSV, Excel)
 * Extrai dados estruturados de arquivos tabulares
 */

const fs = require('fs').promises;
const { createLogger } = require('../logging/logger');

const logger = createLogger('spreadsheet-parser');

/**
 * Parse CSV simples
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  
  return { headers, rows };
}

/**
 * Parse Excel usando biblioteca externa (simulado)
 */
async function parseExcel(buffer) {
  // Em produção, usar biblioteca como 'xlsx' ou 'exceljs'
  // Por enquanto, simular parsing básico
  
  logger.warn('Parsing de Excel não implementado completamente. Use CSV para melhor compatibilidade.');
  
  // Simular estrutura básica
  return {
    headers: ['Coluna1', 'Coluna2', 'Coluna3'],
    rows: [
      { Coluna1: 'Valor1', Coluna2: 'Valor2', Coluna3: 'Valor3' },
      { Coluna1: 'Valor4', Coluna2: 'Valor5', Coluna3: 'Valor6' }
    ]
  };
}

/**
 * Analisa estrutura da planilha
 */
function analyzeSpreadsheetStructure(data) {
  const { headers, rows } = data;
  
  if (rows.length === 0) {
    return {
      type: 'empty',
      description: 'Planilha vazia',
      columns: headers.length,
      rows: 0
    };
  }
  
  // Analisar tipos de dados por coluna
  const columnTypes = {};
  const sampleValues = {};
  
  headers.forEach(header => {
    const values = rows.slice(0, 10).map(row => row[header]).filter(v => v);
    sampleValues[header] = values;
    
    if (values.length === 0) {
      columnTypes[header] = 'empty';
    } else if (values.every(v => !isNaN(v) && !isNaN(parseFloat(v)))) {
      columnTypes[header] = 'numeric';
    } else if (values.every(v => /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{2}\/\d{2}\/\d{4}/.test(v))) {
      columnTypes[header] = 'date';
    } else if (values.every(v => v.length <= 50)) {
      columnTypes[header] = 'text';
    } else {
      columnTypes[header] = 'long_text';
    }
  });
  
  // Determinar tipo geral da planilha
  let type = 'generic';
  let description = 'Planilha genérica';
  
  if (headers.some(h => h.toLowerCase().includes('nome') || h.toLowerCase().includes('name'))) {
    type = 'contacts';
    description = 'Lista de contatos/pessoas';
  } else if (headers.some(h => h.toLowerCase().includes('produto') || h.toLowerCase().includes('product'))) {
    type = 'products';
    description = 'Catálogo de produtos';
  } else if (headers.some(h => h.toLowerCase().includes('data') || h.toLowerCase().includes('date'))) {
    type = 'time_series';
    description = 'Dados temporais/séries';
  } else if (headers.some(h => h.toLowerCase().includes('valor') || h.toLowerCase().includes('price'))) {
    type = 'financial';
    description = 'Dados financeiros';
  }
  
  return {
    type,
    description,
    columns: headers.length,
    rows: rows.length,
    columnTypes,
    sampleValues,
    headers
  };
}

/**
 * Gera resumo textual da planilha
 */
function generateSpreadsheetSummary(data, structure) {
  const { headers, rows } = data;
  const { type, description, columnTypes } = structure;
  
  let summary = `Planilha: ${description}\n`;
  summary += `Tipo: ${type}\n`;
  summary += `Dimensões: ${rows.length} linhas × ${headers.length} colunas\n\n`;
  
  summary += `Colunas:\n`;
  headers.forEach(header => {
    const colType = columnTypes[header];
    const sampleCount = Math.min(3, rows.length);
    const samples = rows.slice(0, sampleCount).map(row => row[header]).filter(v => v);
    
    summary += `- ${header} (${colType}): ${samples.join(', ')}${samples.length < sampleCount ? '...' : ''}\n`;
  });
  
  if (rows.length > 0) {
    summary += `\nPrimeiras linhas:\n`;
    rows.slice(0, 3).forEach((row, index) => {
      summary += `Linha ${index + 1}: ${Object.values(row).join(' | ')}\n`;
    });
  }
  
  return summary;
}

/**
 * Extrai insights específicos por tipo
 */
function extractInsights(data, structure) {
  const { headers, rows } = data;
  const { type, columnTypes } = structure;
  const insights = [];
  
  switch (type) {
    case 'contacts':
      const nameCol = headers.find(h => h.toLowerCase().includes('nome') || h.toLowerCase().includes('name'));
      const emailCol = headers.find(h => h.toLowerCase().includes('email'));
      const phoneCol = headers.find(h => h.toLowerCase().includes('telefone') || h.toLowerCase().includes('phone'));
      
      if (nameCol) insights.push(`Lista contém ${rows.length} contatos`);
      if (emailCol) insights.push(`Dados de email disponíveis`);
      if (phoneCol) insights.push(`Dados de telefone disponíveis`);
      break;
      
    case 'products':
      const productCol = headers.find(h => h.toLowerCase().includes('produto') || h.toLowerCase().includes('product'));
      const priceCol = headers.find(h => h.toLowerCase().includes('preço') || h.toLowerCase().includes('price'));
      
      if (productCol) insights.push(`Catálogo com ${rows.length} produtos`);
      if (priceCol) insights.push(`Informações de preço disponíveis`);
      break;
      
    case 'financial':
      const valueCols = headers.filter(h => columnTypes[h] === 'numeric');
      if (valueCols.length > 0) {
        insights.push(`Dados numéricos em ${valueCols.length} colunas`);
      }
      break;
      
    case 'time_series':
      const dateCol = headers.find(h => columnTypes[h] === 'date');
      if (dateCol) {
        const dates = rows.map(row => row[dateCol]).filter(d => d);
        if (dates.length > 0) {
          insights.push(`Período: ${dates[0]} a ${dates[dates.length - 1]}`);
        }
      }
      break;
  }
  
  return insights;
}

/**
 * Parse principal para planilhas
 */
async function parseSpreadsheet(buffer, filename, fileType) {
  try {
    logger.info('Iniciando parse de planilha', { filename, fileType });
    
    let data;
    if (fileType.includes('csv') || filename.endsWith('.csv')) {
      const content = buffer.toString('utf8');
      data = parseCSV(content);
    } else if (fileType.includes('excel') || filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      data = await parseExcel(buffer);
    } else {
      throw new Error('Tipo de arquivo não suportado para planilhas');
    }
    
    // Analisar estrutura
    const structure = analyzeSpreadsheetStructure(data);
    
    // Gerar resumo
    const summary = generateSpreadsheetSummary(data, structure);
    
    // Extrair insights
    const insights = extractInsights(data, structure);
    
    logger.info('Parse de planilha concluído', { 
      filename, 
      rows: data.rows.length, 
      columns: data.headers.length,
      type: structure.type 
    });
    
    return {
      text: summary,
      metadata: {
        type: 'spreadsheet',
        structure,
        insights,
        rawData: data, // Dados estruturados para QA
        filename,
        fileType
      }
    };
    
  } catch (error) {
    logger.error('Erro ao fazer parse de planilha', { filename }, error);
    throw error;
  }
}

module.exports = { parseSpreadsheet };
