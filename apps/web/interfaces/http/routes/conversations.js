/**
 * Routes: /api/conversations/*
 */

const { PostgresConversationsRepository } = require('../../../infra/conversations/postgres_conversations_repository');
const { Conversation } = require('../../../domain/conversations/conversation');
const { Message } = require('../../../domain/conversations/message');

const repo = new PostgresConversationsRepository();

/**
 * GET /api/conversations/test
 * Testa conexão DB e cria conversa de exemplo
 */
async function handleTestRoute(req, res) {
  try {
    // 1. Criar conversa
    const conv = Conversation.create({ title: 'Test Conversation' });
    const savedConv = await repo.createConversation(conv);

    // 2. Adicionar mensagens
    const userMsg = Message.createUserMessage(savedConv.id, 'Teste de mensagem de usuário');
    const assistantMsg = Message.createAssistantMessage(savedConv.id, 'Teste de resposta do assistente');
    
    await repo.addMessage(userMsg);
    await repo.addMessage(assistantMsg);

    // 3. Buscar conversa completa
    const messages = await repo.getMessages(savedConv.id);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      conversation: savedConv,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }, null, 2));
  } catch (error) {
    console.error('[conversations/test] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * GET /api/conversations
 * Lista todas as conversas
 */
async function handleListRoute(req, res) {
  try {
    const conversations = await repo.listConversations({ limit: 50 });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ conversations }, null, 2));
  } catch (error) {
    console.error('[conversations/list] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * GET /api/conversations/:id/messages
 * Busca mensagens de uma conversa
 */
async function handleGetMessagesRoute(conversationId, req, res) {
  try {
    const messages = await repo.getMessages(conversationId);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ 
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }))
    }, null, 2));
  } catch (error) {
    console.error('[conversations/messages] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * Router para /api/conversations/*
 */
function handleConversationsRoutes(url, req, res) {
  if (url === '/api/conversations/test' && req.method === 'GET') {
    return handleTestRoute(req, res);
  }
  
  if (url === '/api/conversations' && req.method === 'GET') {
    return handleListRoute(req, res);
  }

  // /api/conversations/:id/messages
  const messagesMatch = url.match(/^\/api\/conversations\/([a-f0-9-]+)\/messages$/);
  if (messagesMatch && req.method === 'GET') {
    return handleGetMessagesRoute(messagesMatch[1], req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Route not found' }));
}

module.exports = { handleConversationsRoutes };

