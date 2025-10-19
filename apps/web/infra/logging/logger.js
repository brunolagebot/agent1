/**
 * Logger - Sistema de logging estruturado
 */

const { LogEntry } = require('../../domain/logging/log_entry');
const { writeLog, writeToConsole } = require('./file_writer');

class Logger {
  constructor(module) {
    this.module = module;
  }

  _log(logEntry) {
    logEntry.context.module = this.module;
    writeToConsole(logEntry);
    writeLog(logEntry);
  }

  debug(message, context = {}) {
    this._log(LogEntry.debug(message, context));
  }

  info(message, context = {}) {
    this._log(LogEntry.info(message, context));
  }

  warn(message, context = {}) {
    this._log(LogEntry.warn(message, context));
  }

  error(message, context = {}, error = null) {
    this._log(LogEntry.error(message, context, error));
  }
}

/**
 * Factory para criar logger por módulo
 */
function createLogger(module) {
  return new Logger(module);
}

module.exports = { Logger, createLogger };

