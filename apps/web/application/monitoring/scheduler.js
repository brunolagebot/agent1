/**
 * Use Case: Monitoring Scheduler
 * Sistema de agendamento para monitoramento automático de diretórios
 */

const { startAutoMonitoring } = require('./directory_watcher');
const { PostgresMonitoringRepository } = require('../../infra/monitoring/postgres_monitoring_repository');
const { createLogger } = require('../../infra/logging/logger');

const logger = createLogger('monitoring_scheduler');

class MonitoringScheduler {
  constructor() {
    this.repository = new PostgresMonitoringRepository();
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Inicia o scheduler de monitoramento
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler já está em execução');
      return;
    }

    logger.info('Iniciando scheduler de monitoramento de diretórios');
    this.isRunning = true;

    // Executar imediatamente
    this.runMonitoringCycle();

    // Agendar execuções periódicas
    this.intervalId = setInterval(() => {
      this.runMonitoringCycle();
    }, this.checkInterval);
  }

  /**
   * Para o scheduler
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler não está em execução');
      return;
    }

    logger.info('Parando scheduler de monitoramento');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Executa um ciclo de monitoramento
   */
  async runMonitoringCycle() {
    try {
      logger.debug('Executando ciclo de monitoramento');
      await startAutoMonitoring(this.repository);
    } catch (error) {
      logger.error('Erro no ciclo de monitoramento', {}, error);
    }
  }

  /**
   * Força uma execução imediata do monitoramento
   */
  async forceRun() {
    logger.info('Executando monitoramento forçado');
    try {
      await startAutoMonitoring(this.repository);
      return { success: true, message: 'Monitoramento executado com sucesso' };
    } catch (error) {
      logger.error('Erro no monitoramento forçado', {}, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém status do scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextRun: this.isRunning ? new Date(Date.now() + this.checkInterval) : null
    };
  }

  /**
   * Atualiza o intervalo de verificação
   */
  setCheckInterval(intervalMs) {
    this.checkInterval = intervalMs;
    
    if (this.isRunning) {
      // Reiniciar com novo intervalo
      this.stop();
      this.start();
    }
    
    logger.info(`Intervalo de verificação atualizado para ${intervalMs}ms`);
  }
}

// Instância singleton
let schedulerInstance = null;

/**
 * Obtém a instância singleton do scheduler
 */
function getScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new MonitoringScheduler();
  }
  return schedulerInstance;
}

/**
 * Inicia o scheduler global
 */
function startGlobalScheduler() {
  const scheduler = getScheduler();
  scheduler.start();
  return scheduler;
}

/**
 * Para o scheduler global
 */
function stopGlobalScheduler() {
  const scheduler = getScheduler();
  scheduler.stop();
}

/**
 * Executa monitoramento manual
 */
async function runManualMonitoring() {
  const scheduler = getScheduler();
  return await scheduler.forceRun();
}

/**
 * Obtém status do scheduler global
 */
function getGlobalSchedulerStatus() {
  const scheduler = getScheduler();
  return scheduler.getStatus();
}

module.exports = { 
  MonitoringScheduler,
  getScheduler,
  startGlobalScheduler,
  stopGlobalScheduler,
  runManualMonitoring,
  getGlobalSchedulerStatus
};
