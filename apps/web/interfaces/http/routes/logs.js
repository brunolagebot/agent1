/**
 * Routes: /api/logs/*
 * Análise automática de logs
 */

const { analyzeErrors, detectPatterns } = require('../../../infra/logging/log_analyzer');
const { createLogger } = require('../../../infra/logging/logger');

const logger = createLogger('routes/logs');

/**
 * GET /api/logs/analyze
 * Analisa logs do dia e detecta inconsistências
 */
async function handleAnalyzeRoute(req, res) {
  try {
    logger.info('Log analysis requested');
    
    const patterns = detectPatterns();
    const analysis = analyzeErrors();

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      date: new Date().toISOString().split('T')[0],
      patterns,
      topErrors: analysis.slice(0, 10),
      totalErrorGroups: analysis.length,
    }, null, 2));
  } catch (error) {
    logger.error('Log analysis failed', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * Router para /api/logs/*
 */
function handleLogsRoutes(url, req, res) {
  if (url === '/api/logs/analyze' && req.method === 'GET') {
    return handleAnalyzeRoute(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Route not found' }));
}

module.exports = { handleLogsRoutes };

