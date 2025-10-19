/**
 * Routes: /api/messages/*
 * Feedback e análise de mensagens
 */

const { query } = require('../../../infra/db/pg_client');
const { createLogger } = require('../../../infra/logging/logger');

const logger = createLogger('routes/messages');

/**
 * POST /api/messages/feedback
 * Body: { messageId, score (1-5), comment? }
 */
async function handleFeedbackRoute(req, res) {
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const { messageId, score, comment = null } = JSON.parse(body || '{}');
      
      if (!messageId || !score || score < 1 || score > 5) {
        logger.warn('Invalid feedback params', { messageId, score });
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'messageId and score (1-5) required' }));
        return;
      }

      // Salvar feedback (usando messageId como referência temporária até termos UUID real)
      // Por enquanto, buscar última mensagem assistant da conversa
      const result = await query(
        `UPDATE messages 
         SET feedback_score = $1, feedback_comment = $2, feedback_at = CURRENT_TIMESTAMP
         WHERE id IN (
           SELECT id FROM messages 
           WHERE role = 'assistant' 
           ORDER BY created_at DESC 
           LIMIT 1
         )
         RETURNING id`,
        [score, comment]
      );

      logger.info('Feedback saved', { messageId, score });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', messageId, score }));
    } catch (error) {
      logger.error('Feedback save failed', {}, error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * GET /api/messages/feedback-stats
 * Estatísticas de feedback
 */
async function handleFeedbackStatsRoute(req, res) {
  try {
    const result = await query('SELECT * FROM feedback_analysis');
    
    logger.info('Feedback stats requested');
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ stats: result.rows }, null, 2));
  } catch (error) {
    logger.error('Feedback stats failed', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * Router para /api/messages/*
 */
function handleMessagesRoutes(url, req, res) {
  if (url === '/api/messages/feedback' && req.method === 'POST') {
    return handleFeedbackRoute(req, res);
  }
  
  if (url === '/api/messages/feedback-stats' && req.method === 'GET') {
    return handleFeedbackStatsRoute(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Route not found' }));
}

module.exports = { handleMessagesRoutes };

