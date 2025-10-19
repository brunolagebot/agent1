/**
 * Log Analyzer
 * Analisa logs para detectar inconsistências automaticamente
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = process.env.LOGS_DIR || path.join(__dirname, '../../../../logs');

/**
 * Lê logs de erro do dia
 */
function readErrorLogs(date = null) {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const filePath = path.join(LOGS_DIR, `error-${dateStr}.log`);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Agrupa erros por mensagem/módulo
 */
function analyzeErrors(date = null) {
  const errors = readErrorLogs(date);
  const grouped = {};

  for (const err of errors) {
    const key = `${err.context.module || 'unknown'}:${err.message}`;
    if (!grouped[key]) {
      grouped[key] = {
        module: err.context.module,
        message: err.message,
        count: 0,
        firstSeen: err.timestamp,
        lastSeen: err.timestamp,
        samples: [],
      };
    }

    grouped[key].count++;
    grouped[key].lastSeen = err.timestamp;
    if (grouped[key].samples.length < 3) {
      grouped[key].samples.push(err);
    }
  }

  return Object.values(grouped).sort((a, b) => b.count - a.count);
}

/**
 * Detecta padrões comuns de erro
 */
function detectPatterns(date = null) {
  const analysis = analyzeErrors(date);
  const patterns = [];

  for (const group of analysis) {
    if (group.count >= 3) {
      patterns.push({
        severity: 'high',
        pattern: `${group.module}: ${group.message}`,
        count: group.count,
        suggestion: getSuggestion(group),
      });
    }
  }

  return patterns;
}

function getSuggestion(group) {
  const msg = group.message.toLowerCase();
  
  if (msg.includes('connection') || msg.includes('econnrefused')) {
    return 'Verificar se serviço dependente está rodando (Ollama, PostgreSQL, etc)';
  }
  if (msg.includes('timeout')) {
    return 'Aumentar timeout ou verificar performance do serviço';
  }
  if (msg.includes('not found') || msg.includes('does not exist')) {
    return 'Verificar migrations do banco ou configuração de rotas';
  }
  if (msg.includes('parse') || msg.includes('invalid json')) {
    return 'Verificar formato de request/response';
  }
  
  return 'Revisar código do módulo ' + group.module;
}

module.exports = { readErrorLogs, analyzeErrors, detectPatterns };

