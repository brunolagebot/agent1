/**
 * Routes: /api/admin/*
 * Admin-only endpoints para gerenciar treinamento
 */

const { PostgresConversationsRepository } = require('../../../infra/conversations/postgres_conversations_repository');

const repo = new PostgresConversationsRepository();

/**
 * POST /api/admin/approve
 * Body: { conversationId, approved }
 * Aprova ou reprova conversa para treinamento
 */
async function handleApproveRoute(req, res) {
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const { conversationId, approved = true } = JSON.parse(body || '{}');
      
      if (!conversationId) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'conversationId is required' }));
        return;
      }

      await repo.approveForTraining(conversationId, approved);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', conversationId, approved }));
    } catch (error) {
      console.error('[admin/approve] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * GET /api/admin/export
 * Exporta conversas aprovadas em formato JSONL para fine-tuning
 */
async function handleExportRoute(req, res) {
  try {
    const conversations = await repo.listConversations({ approvedForTraining: true });
    const lines = [];

    for (const conv of conversations) {
      const messages = await repo.getMessages(conv.id);
      
      // Formato para fine-tuning (compatível com OpenAI/Llama)
      const formattedMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      lines.push(JSON.stringify({ messages: formattedMessages }));
    }

    res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
    res.end(lines.join('\n') + '\n');
  } catch (error) {
    console.error('[admin/export] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * Router para /api/admin/*
 */
function handleAdminRoutes(url, req, res) {
  // TODO: adicionar middleware de autenticação (verificar se é admin)
  // Por enquanto, sem auth (apenas em dev)

  if (url === '/api/admin/approve' && req.method === 'POST') {
    return handleApproveRoute(req, res);
  }
  
  if (url === '/api/admin/export' && req.method === 'GET') {
    return handleExportRoute(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Route not found' }));
}

module.exports = { handleAdminRoutes };

