/**
 * QA Metrics Tracker
 * Sistema de métricas para acompanhar a qualidade e performance do Q&A
 */

const { createLogger } = require('../../infra/logging/logger');

const logger = createLogger('qa_metrics_tracker');

/**
 * Classe para rastrear métricas de Q&A
 */
class QAMetricsTracker {
  constructor() {
    this.metrics = {
      totalQAGenerated: 0,
      totalQAValidated: 0,
      totalQARejected: 0,
      averageQualityScore: 0,
      qualityDistribution: {
        excellent: 0,    // 80-100
        good: 0,         // 60-79
        fair: 0,         // 40-59
        poor: 0          // 0-39
      },
      documentTypeStats: {},
      commonIssues: {},
      improvementSuggestions: {},
      performanceMetrics: {
        averageGenerationTime: 0,
        averageValidationTime: 0,
        totalProcessingTime: 0
      }
    };
    
    this.sessionMetrics = {
      startTime: Date.now(),
      documentsProcessed: 0,
      qaGeneratedThisSession: 0,
      qaValidatedThisSession: 0,
      qaRejectedThisSession: 0
    };
  }

  /**
   * Registra a geração de Q&A
   */
  recordQAGeneration(document, qaPairs, generationTime) {
    this.metrics.totalQAGenerated += qaPairs.length;
    this.sessionMetrics.qaGeneratedThisSession += qaPairs.length;
    this.sessionMetrics.documentsProcessed++;
    
    // Atualizar métricas de performance
    this.updatePerformanceMetrics(generationTime, 'generation');
    
    // Registrar estatísticas por tipo de documento
    const docType = this.detectDocumentType(document);
    if (!this.metrics.documentTypeStats[docType]) {
      this.metrics.documentTypeStats[docType] = {
        count: 0,
        totalQA: 0,
        averageQuality: 0
      };
    }
    
    this.metrics.documentTypeStats[docType].count++;
    this.metrics.documentTypeStats[docType].totalQA += qaPairs.length;
    
    logger.info(`Q&A gerado para ${document.filename}`, {
      documentType: docType,
      qaCount: qaPairs.length,
      generationTime: generationTime
    });
  }

  /**
   * Registra a validação de Q&A
   */
  recordQAValidation(qaPairs, validationTime) {
    const validatedCount = qaPairs.filter(qa => qa.qualityScore >= 30).length;
    const rejectedCount = qaPairs.length - validatedCount;
    
    this.metrics.totalQAValidated += validatedCount;
    this.metrics.totalQARejected += rejectedCount;
    this.sessionMetrics.qaValidatedThisSession += validatedCount;
    this.sessionMetrics.qaRejectedThisSession += rejectedCount;
    
    // Atualizar métricas de performance
    this.updatePerformanceMetrics(validationTime, 'validation');
    
    // Calcular scores de qualidade
    const qualityScores = qaPairs.map(qa => qa.qualityScore || 0);
    const averageScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    
    // Atualizar distribuição de qualidade
    qualityScores.forEach(score => {
      if (score >= 80) this.metrics.qualityDistribution.excellent++;
      else if (score >= 60) this.metrics.qualityDistribution.good++;
      else if (score >= 40) this.metrics.qualityDistribution.fair++;
      else this.metrics.qualityDistribution.poor++;
    });
    
    // Atualizar score médio
    this.updateAverageQualityScore(averageScore);
    
    // Registrar problemas comuns
    this.recordCommonIssues(qaPairs);
    
    logger.info(`Q&A validado`, {
      validated: validatedCount,
      rejected: rejectedCount,
      averageQuality: averageScore,
      validationTime: validationTime
    });
  }

  /**
   * Registra problemas comuns encontrados
   */
  recordCommonIssues(qaPairs) {
    qaPairs.forEach(qa => {
      if (qa.improvements && qa.improvements.length > 0) {
        qa.improvements.forEach(improvement => {
          if (!this.metrics.commonIssues[improvement]) {
            this.metrics.commonIssues[improvement] = 0;
          }
          this.metrics.commonIssues[improvement]++;
        });
      }
    });
  }

  /**
   * Atualiza métricas de performance
   */
  updatePerformanceMetrics(time, type) {
    if (type === 'generation') {
      const currentAvg = this.metrics.performanceMetrics.averageGenerationTime;
      const count = this.sessionMetrics.qaGeneratedThisSession;
      this.metrics.performanceMetrics.averageGenerationTime = 
        (currentAvg * (count - 1) + time) / count;
    } else if (type === 'validation') {
      const currentAvg = this.metrics.performanceMetrics.averageValidationTime;
      const count = this.sessionMetrics.qaValidatedThisSession + this.sessionMetrics.qaRejectedThisSession;
      this.metrics.performanceMetrics.averageValidationTime = 
        (currentAvg * (count - 1) + time) / count;
    }
    
    this.metrics.performanceMetrics.totalProcessingTime += time;
  }

  /**
   * Atualiza score médio de qualidade
   */
  updateAverageQualityScore(newScore) {
    const totalValidated = this.metrics.totalQAValidated;
    const currentAvg = this.metrics.averageQualityScore;
    
    if (totalValidated === 0) {
      this.metrics.averageQualityScore = newScore;
    } else {
      this.metrics.averageQualityScore = 
        (currentAvg * (totalValidated - 1) + newScore) / totalValidated;
    }
  }

  /**
   * Detecta o tipo de documento
   */
  detectDocumentType(document) {
    const filename = document.filename.toLowerCase();
    const content = (document.contentText || '').toLowerCase();
    
    if (filename.includes('contrato') || content.includes('contrato')) return 'contract';
    if (filename.includes('financeiro') || content.includes('orçamento')) return 'financial';
    if (filename.includes('técnico') || content.includes('manual')) return 'technical';
    if (filename.includes('.csv') || filename.includes('.xlsx')) return 'spreadsheet';
    if (filename.includes('.pdf')) return 'pdf';
    if (filename.includes('.txt')) return 'text';
    
    return 'general';
  }

  /**
   * Obtém métricas resumidas
   */
  getSummaryMetrics() {
    const sessionDuration = Date.now() - this.sessionMetrics.startTime;
    
    return {
      overall: {
        totalQAGenerated: this.metrics.totalQAGenerated,
        totalQAValidated: this.metrics.totalQAValidated,
        totalQARejected: this.metrics.totalQARejected,
        validationRate: this.metrics.totalQAGenerated > 0 ? 
          (this.metrics.totalQAValidated / this.metrics.totalQAGenerated * 100).toFixed(1) + '%' : '0%',
        averageQualityScore: this.metrics.averageQualityScore.toFixed(1)
      },
      session: {
        duration: this.formatDuration(sessionDuration),
        documentsProcessed: this.sessionMetrics.documentsProcessed,
        qaGeneratedThisSession: this.sessionMetrics.qaGeneratedThisSession,
        qaValidatedThisSession: this.sessionMetrics.qaValidatedThisSession,
        qaRejectedThisSession: this.sessionMetrics.qaRejectedThisSession,
        averageQAPerDocument: this.sessionMetrics.documentsProcessed > 0 ? 
          (this.sessionMetrics.qaGeneratedThisSession / this.sessionMetrics.documentsProcessed).toFixed(1) : 0
      },
      quality: {
        distribution: this.metrics.qualityDistribution,
        excellentRate: this.calculateRate(this.metrics.qualityDistribution.excellent),
        goodRate: this.calculateRate(this.metrics.qualityDistribution.good),
        fairRate: this.calculateRate(this.metrics.qualityDistribution.fair),
        poorRate: this.calculateRate(this.metrics.qualityDistribution.poor)
      },
      performance: {
        averageGenerationTime: this.metrics.performanceMetrics.averageGenerationTime.toFixed(2) + 'ms',
        averageValidationTime: this.metrics.performanceMetrics.averageValidationTime.toFixed(2) + 'ms',
        totalProcessingTime: this.formatDuration(this.metrics.performanceMetrics.totalProcessingTime)
      },
      documentTypes: this.metrics.documentTypeStats,
      commonIssues: this.getTopIssues(5),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Calcula taxa de qualidade
   */
  calculateRate(count) {
    const total = Object.values(this.metrics.qualityDistribution).reduce((sum, val) => sum + val, 0);
    return total > 0 ? (count / total * 100).toFixed(1) + '%' : '0%';
  }

  /**
   * Obtém os principais problemas
   */
  getTopIssues(limit = 5) {
    return Object.entries(this.metrics.commonIssues)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([issue, count]) => ({ issue, count }));
  }

  /**
   * Gera recomendações baseadas nas métricas
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Recomendações baseadas na taxa de validação
    const validationRate = this.metrics.totalQAGenerated > 0 ? 
      this.metrics.totalQAValidated / this.metrics.totalQAGenerated : 0;
    
    if (validationRate < 0.7) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: 'Taxa de validação baixa. Considere melhorar a qualidade dos documentos de entrada.',
        action: 'Revisar filtros de conteúdo e qualidade dos documentos'
      });
    }
    
    // Recomendações baseadas no score médio
    if (this.metrics.averageQualityScore < 50) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: 'Score médio de qualidade baixo. Melhore os templates de Q&A.',
        action: 'Revisar e aprimorar templates de geração de Q&A'
      });
    }
    
    // Recomendações baseadas em problemas comuns
    const topIssues = this.getTopIssues(3);
    topIssues.forEach(({ issue, count }) => {
      if (count > 5) {
        recommendations.push({
          type: 'improvement',
          priority: 'medium',
          message: `Problema comum: ${issue} (${count} ocorrências)`,
          action: `Implementar correção automática para: ${issue}`
        });
      }
    });
    
    // Recomendações de performance
    if (this.metrics.performanceMetrics.averageGenerationTime > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Tempo de geração alto. Considere otimizar o processo.',
        action: 'Revisar algoritmos de geração de Q&A'
      });
    }
    
    return recommendations;
  }

  /**
   * Formata duração em formato legível
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Reseta métricas da sessão
   */
  resetSessionMetrics() {
    this.sessionMetrics = {
      startTime: Date.now(),
      documentsProcessed: 0,
      qaGeneratedThisSession: 0,
      qaValidatedThisSession: 0,
      qaRejectedThisSession: 0
    };
  }

  /**
   * Exporta métricas para análise
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      sessionMetrics: this.sessionMetrics,
      summary: this.getSummaryMetrics()
    };
  }
}

// Instância singleton
let metricsTracker = null;

/**
 * Obtém a instância singleton do tracker
 */
function getMetricsTracker() {
  if (!metricsTracker) {
    metricsTracker = new QAMetricsTracker();
  }
  return metricsTracker;
}

/**
 * Registra geração de Q&A
 */
function recordQAGeneration(document, qaPairs, generationTime) {
  const tracker = getMetricsTracker();
  tracker.recordQAGeneration(document, qaPairs, generationTime);
}

/**
 * Registra validação de Q&A
 */
function recordQAValidation(qaPairs, validationTime) {
  const tracker = getMetricsTracker();
  tracker.recordQAValidation(qaPairs, validationTime);
}

/**
 * Obtém métricas resumidas
 */
function getSummaryMetrics() {
  const tracker = getMetricsTracker();
  return tracker.getSummaryMetrics();
}

/**
 * Exporta métricas
 */
function exportMetrics() {
  const tracker = getMetricsTracker();
  return tracker.exportMetrics();
}

module.exports = { 
  QAMetricsTracker,
  getMetricsTracker,
  recordQAGeneration,
  recordQAValidation,
  getSummaryMetrics,
  exportMetrics
};
