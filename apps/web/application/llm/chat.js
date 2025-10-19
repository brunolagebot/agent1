/**
 * Use Case: Chat com LLM + armazenamento automático + RAG
 */

const { generate } = require('../../infra/llm/ollama_client');
const { PostgresConversationsRepository } = require('../../infra/conversations/postgres_conversations_repository');
const { Conversation } = require('../../domain/conversations/conversation');
const { Message } = require('../../domain/conversations/message');
const { searchDocuments } = require('../documents/search_documents');

const repo = new PostgresConversationsRepository();

/**
 * Cria ou continua uma conversa com o LLM
 * @param {string|null} conversationId - ID da conversa (null para nova)
 * @param {string} userMessage - mensagem do usuário
 * @param {string} userRole - role do usuário (guest/user/advanced/admin)
 * @param {boolean} useDocuments - Se true, busca contexto em documentos
 * @returns {Promise<{conversationId, userMessage, assistantMessage}>}
 */
async function chat({ conversationId = null, userMessage, userRole = 'user', useDocuments = true } = {}) {
  let conversation;

  // 1. Criar ou buscar conversa
  if (!conversationId) {
    conversation = Conversation.create({ title: userMessage.slice(0, 50), userRole });
    conversation = await repo.createConversationWithRole(conversation);
  } else {
    conversation = await repo.findConversationById(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
  }

  // 2. Salvar mensagem do usuário
  const userMsg = Message.createUserMessage(conversation.id, userMessage);
  await repo.addMessage(userMsg);

  // 3. Buscar histórico
  const history = await repo.getMessages(conversation.id);
  const messages = history.map(m => ({ role: m.role, content: m.content }));

  // 4. RAG: buscar contexto relevante em documentos E knowledge base
  let contextFromDocs = '';
  let contextFromKB = '';
  
  if (useDocuments) {
    try {
      // Buscar em documentos
      const docs = await searchDocuments(userMessage, 3);
      if (docs.length > 0) {
        contextFromDocs = '\n\n[Documentos]:\n' + 
          docs.map((d, i) => `${i + 1}. ${d.content}`).join('\n\n');
      }
      
      // Buscar em Knowledge Base (sempre)
      const { queryFacts } = require('../knowledge/query_facts');
      const facts = await queryFacts(userMessage, 3);
      if (facts.length > 0) {
        contextFromKB = '\n\n[Base de Conhecimento Permanente]:\n' + 
          facts.map((f, i) => `${i + 1}. ${f.title}: ${f.content}`).join('\n');
      }
    } catch (error) {
      console.error('[chat] RAG error (continuing without docs):', error.message);
    }
  }

  // 5. Adicionar contexto ao sistema se houver
  const allContext = contextFromKB + contextFromDocs;
  if (allContext) {
    messages.unshift({
      role: 'system',
      content: `Você é um assistente útil. Use o contexto fornecido para responder quando relevante.${allContext}`,
    });
  }

  // 6. Gerar resposta do LLM
  const response = await generate({ messages });

  // 7. Salvar resposta do assistente
  const assistantMsg = Message.createAssistantMessage(
    conversation.id,
    response.content,
    { 
      model: response.model, 
      usedDocuments: contextFromDocs.length > 0,
      usedKnowledgeBase: contextFromKB.length > 0
    }
  );
  await repo.addMessage(assistantMsg);

  return {
    conversationId: conversation.id,
    userMessage: userMsg,
    assistantMessage: assistantMsg,
  };
}

module.exports = { chat };

