/**
 * Routes: /api/chat
 */

const { chat } = require('../../../application/llm/chat');
const { createLogger } = require('../../../infra/logging/logger');

const logger = createLogger('routes/chat');

/**
 * POST /api/chat
 * Body: { conversationId?, message, userRole? }
 */
async function handleChatRoute(req, res) {
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const { conversationId, message, userRole = 'admin' } = JSON.parse(body || '{}');
      
      logger.info('Chat request received', { conversationId, userRole, messageLength: message?.length });
      
      if (!message || message.trim().length === 0) {
        logger.warn('Empty message received');
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'message is required' }));
        return;
      }

      // Callback de progresso (para logging detalhado)
      const progressUpdates = [];
      const onProgress = (update) => {
        const timestamp = new Date().toISOString();
        progressUpdates.push({ ...update, timestamp });
        logger.debug('Progress update', { stage: update.stage, message: update.message });
      };

      const result = await chat({
        conversationId: conversationId || null,
        userMessage: message,
        userRole,
        onProgress,
      });

      logger.info('Chat response generated', { 
        conversationId: result.conversationId,
        totalTime: result.telemetry?.totalDuration + 'ms'
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        conversationId: result.conversationId,
        userMessage: result.userMessage.content,
        assistantMessage: result.assistantMessage.content,
        messageId: result.messageId,
        telemetry: result.telemetry || null,
        progressLog: progressUpdates,
        sources: result.sources || { documents: [], knowledgeBase: [] },
      }, null, 2));
    } catch (error) {
      logger.error('Chat failed', { body: body.slice(0, 200) }, error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

module.exports = { handleChatRoute };

