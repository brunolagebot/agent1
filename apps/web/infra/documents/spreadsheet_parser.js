/**
 * Parser para planilhas (CSV, Excel)
 * Extrai dados estruturados de arquivos tabulares
 */

const fs = require('fs').promises;
const XLSX = require('xlsx');
const { createLogger } = require('../logging/logger');

const logger = createLogger('spreadsheet-parser');

/**
 * Parse CSV robusto
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  // Função para fazer parse de uma linha CSV considerando aspas
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Aspas duplas escapadas
          current += '"';
          i++; // Pular próxima aspa
        } else {
          // Toggle aspas
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Separador encontrado fora de aspas
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Adicionar último campo
    result.push(current.trim());
    return result;
  }
  
  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  
  // Parse rows
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  }).filter(row => Object.values(row).some(v => v !== ''));
  
  logger.info('CSV parseado com sucesso', { 
    headers: headers.length, 
    rows: rows.length 
  });
  
  return { headers, rows };
}

/**
 * Parse Excel usando biblioteca xlsx
 */
async function parseExcel(buffer) {
  try {
    // Ler workbook do buffer
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Pegar primeira planilha
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Nenhuma planilha encontrada no arquivo Excel');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      return { headers: [], rows: [] };
    }
    
    // Primeira linha são os headers
    const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
    
    // Resto são os dados
    const rows = jsonData.slice(1).map(row => {
      const rowObj = {};
      headers.forEach((header, index) => {
        rowObj[header] = row[index] || '';
      });
      return rowObj;
    }).filter(row => Object.values(row).some(v => v !== ''));
    
    logger.info('Excel parseado com sucesso', { 
      sheetName, 
      headers: headers.length, 
      rows: rows.length 
    });
    
    return { headers, rows };
    
  } catch (error) {
    logger.error('Erro ao fazer parse do Excel', {}, error);
    throw new Error(`Erro ao processar arquivo Excel: ${error.message}`);
  }
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
  
  // Detectar tipo por headers
  const headerLower = headers.map(h => h.toLowerCase());
  
  if (headerLower.some(h => h.includes('nome') || h.includes('name') || h.includes('cliente') || h.includes('pessoa'))) {
    type = 'contacts';
    description = 'Lista de contatos/pessoas';
  } else if (headerLower.some(h => h.includes('produto') || h.includes('product') || h.includes('item') || h.includes('serviço'))) {
    type = 'products';
    description = 'Catálogo de produtos/serviços';
  } else if (headerLower.some(h => h.includes('data') || h.includes('date') || h.includes('tempo') || h.includes('período'))) {
    type = 'time_series';
    description = 'Dados temporais/séries';
  } else if (headerLower.some(h => h.includes('valor') || h.includes('price') || h.includes('preço') || h.includes('custo') || h.includes('receita'))) {
    type = 'financial';
    description = 'Dados financeiros';
  } else if (headerLower.some(h => h.includes('email') || h.includes('telefone') || h.includes('phone'))) {
    type = 'contacts';
    description = 'Lista de contatos';
  } else if (headerLower.some(h => h.includes('endereço') || h.includes('address') || h.includes('cidade') || h.includes('city'))) {
    type = 'locations';
    description = 'Dados de localização';
  } else if (headerLower.some(h => h.includes('venda') || h.includes('sale') || h.includes('pedido') || h.includes('order'))) {
    type = 'sales';
    description = 'Dados de vendas';
  } else if (headerLower.some(h => h.includes('funcionário') || h.includes('employee') || h.includes('colaborador'))) {
    type = 'employees';
    description = 'Dados de funcionários';
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
