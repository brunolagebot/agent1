/**
 * File Writer for Logs
 * Escreve logs em arquivos com rotação por data
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = process.env.LOGS_DIR || path.join(__dirname, '../../../../logs');

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function getLogFilePath(level) {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOGS_DIR, `${level}-${date}.log`);
}

function writeLog(logEntry) {
  try {
    ensureLogsDir();
    const filePath = getLogFilePath(logEntry.level);
    const line = JSON.stringify(logEntry.toJSON()) + '\n';
    fs.appendFileSync(filePath, line);
  } catch (error) {
    // Fallback: console se não conseguir escrever
    console.error('[file_writer] Failed to write log:', error.message);
  }
}

function writeToConsole(logEntry) {
  const str = logEntry.toString();
  switch (logEntry.level) {
    case 'error':
      console.error(str);
      break;
    case 'warn':
      console.warn(str);
      break;
    case 'debug':
      console.debug(str);
      break;
    default:
      console.log(str);
  }
}

module.exports = { writeLog, writeToConsole, getLogFilePath };

