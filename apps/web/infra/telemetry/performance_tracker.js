/**
 * Performance Tracker
 * Rastreia e registra telemetria de operações
 */

const { query } = require('../db/pg_client');
const { createLogger } = require('../logging/logger');

const logger = createLogger('telemetry');

class PerformanceTracker {
  constructor(operation, conversationId = null) {
    this.operation = operation;
    this.conversationId = conversationId;
    this.stages = {};
    this.currentStage = null;
    this.startTime = Date.now();
  }

  startStage(stageName) {
    if (this.currentStage) {
      this.endStage();
    }
    
    this.currentStage = stageName;
    this.stages[stageName] = {
      start: Date.now(),
      end: null,
      duration: null,
    };
    
    logger.debug(`Stage started: ${this.operation} → ${stageName}`);
  }

  endStage() {
    if (!this.currentStage) return;
    
    const stage = this.stages[this.currentStage];
    stage.end = Date.now();
    stage.duration = stage.end - stage.start;
    
    logger.debug(`Stage completed: ${this.operation} → ${this.currentStage}`, {
      duration: stage.duration + 'ms',
    });
    
    this.currentStage = null;
  }

  async finish(metadata = {}) {
    if (this.currentStage) {
      this.endStage();
    }

    const totalDuration = Date.now() - this.startTime;
    
    // Salvar cada stage no banco
    for (const [stageName, data] of Object.entries(this.stages)) {
      try {
        await query(
          `INSERT INTO performance_metrics (conversation_id, operation, stage, duration_ms, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [this.conversationId, this.operation, stageName, data.duration, JSON.stringify(metadata)]
        );
      } catch (error) {
        logger.error('Failed to save performance metric', { operation: this.operation, stage: stageName }, error);
      }
    }

    // Salvar total
    try {
      await query(
        `INSERT INTO performance_metrics (conversation_id, operation, stage, duration_ms, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [this.conversationId, this.operation, 'TOTAL', totalDuration, JSON.stringify({ ...metadata, stages: Object.keys(this.stages) })]
      );
    } catch (error) {
      logger.error('Failed to save total performance metric', {}, error);
    }

    logger.info(`Operation completed: ${this.operation}`, {
      totalDuration: totalDuration + 'ms',
      stages: Object.entries(this.stages).map(([name, data]) => `${name}:${data.duration}ms`).join(', '),
    });

    return { totalDuration, stages: this.stages };
  }

  getSummary() {
    return {
      operation: this.operation,
      stages: Object.entries(this.stages).map(([name, data]) => ({
        name,
        duration: data.duration,
        status: data.end ? 'completed' : 'in_progress',
      })),
      currentStage: this.currentStage,
    };
  }
}

module.exports = { PerformanceTracker };

