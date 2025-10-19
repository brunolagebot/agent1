/**
 * Domain Entity: LogEntry
 * Representa uma entrada de log estruturada
 */

const VALID_LEVELS = ['debug', 'info', 'warn', 'error'];

class LogEntry {
  constructor({ level, message, context = {}, timestamp, error = null }) {
    if (!VALID_LEVELS.includes(level)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    
    this.level = level;
    this.message = message;
    this.context = context;
    this.timestamp = timestamp || new Date();
    this.error = error;
  }

  static debug(message, context = {}) {
    return new LogEntry({ level: 'debug', message, context });
  }

  static info(message, context = {}) {
    return new LogEntry({ level: 'info', message, context });
  }

  static warn(message, context = {}) {
    return new LogEntry({ level: 'warn', message, context });
  }

  static error(message, context = {}, error = null) {
    return new LogEntry({ level: 'error', message, context, error });
  }

  toJSON() {
    return {
      timestamp: this.timestamp.toISOString(),
      level: this.level,
      message: this.message,
      context: this.context,
      error: this.error ? {
        message: this.error.message,
        stack: this.error.stack,
      } : null,
    };
  }

  toString() {
    const ctx = Object.keys(this.context).length > 0 ? JSON.stringify(this.context) : '';
    const err = this.error ? ` | ERROR: ${this.error.message}` : '';
    return `[${this.timestamp.toISOString()}] ${this.level.toUpperCase()} - ${this.message} ${ctx}${err}`;
  }
}

module.exports = { LogEntry, VALID_LEVELS };

