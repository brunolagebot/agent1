/**
 * Use Case: Chat com LLM + armazenamento automático + RAG
 */

const { generate } = require('../../infra/llm/ollama_client');
const { PostgresConversationsRepository } = require('../../infra/conversations/postgres_conversations_repository');
const { Conversation } = require('../../domain/conversations/conversation');
const { Message } = require('../../domain/conversations/message');
const { searchDocuments } = require('../documents/search_documents');
const { PerformanceTracker } = require('../../infra/telemetry/performance_tracker');

const repo = new PostgresConversationsRepository();

/**
 * Cria ou continua uma conversa com o LLM
 * @param {string|null} conversationId - ID da conversa (null para nova)
 * @param {string} userMessage - mensagem do usuário
 * @param {string} userRole - role do usuário (guest/user/advanced/admin)
 * @param {boolean} useDocuments - Se true, busca contexto em documentos
 * @returns {Promise<{conversationId, userMessage, assistantMessage}>}
 */
async function chat({ conversationId = null, userMessage, userRole = 'admin', useDocuments = true, onProgress = null } = {}) {
  const tracker = new PerformanceTracker('chat', conversationId);
  let conversation;

  try {
    // 1. Criar ou buscar conversa
    tracker.startStage('create_conversation');
    if (onProgress) onProgress({ stage: 'create_conversation', message: '📝 Criando/carregando conversa' });
    
    if (!conversationId) {
      conversation = Conversation.create({ title: userMessage.slice(0, 50), userRole });
      conversation = await repo.createConversationWithRole(conversation);
    } else {
      conversation = await repo.findConversationById(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
    }
    tracker.endStage();

    // 2. Salvar mensagem do usuário
    tracker.startStage('save_user_message');
    if (onProgress) onProgress({ stage: 'save_user_message', message: '💾 Salvando mensagem' });
    const userMsg = Message.createUserMessage(conversation.id, userMessage);
    await repo.addMessage(userMsg);
    tracker.endStage();

    // 3. Buscar histórico
    tracker.startStage('load_history');
    if (onProgress) onProgress({ stage: 'load_history', message: '📜 Carregando histórico' });
    const history = await repo.getMessages(conversation.id);
    const messages = history.map(m => ({ role: m.role, content: m.content }));
    tracker.endStage();

    // 4. RAG: buscar contexto relevante
    let contextFromDocs = '';
    let contextFromKB = '';
    let docsFound = 0;
    let factsFound = 0;
    let foundDocs = [];
    let foundFacts = [];
    
    if (useDocuments) {
      try {
        // Buscar em documentos
        tracker.startStage('search_documents');
        if (onProgress) onProgress({ stage: 'search_documents', message: '🔍 Buscando em documentos' });
        const docs = await searchDocuments(userMessage, 3);
        docsFound = docs.length;
        foundDocs = docs;
        if (docs.length > 0) {
          contextFromDocs = '\n\n[Documentos Relevantes]:\n' + 
            docs.map((d, i) => {
              const source = `📄 ${d.filename}${d.description ? ` (${d.description})` : ''}`;
              return `${i + 1}. ${d.content}\n   📍 Fonte: ${source}`;
            }).join('\n\n');
        }
        tracker.endStage();
        
        // Buscar em Knowledge Base
        tracker.startStage('search_knowledge_base');
        if (onProgress) onProgress({ stage: 'search_knowledge_base', message: '🧠 Consultando base de conhecimento' });
        const { queryFacts } = require('../knowledge/query_facts');
        const facts = await queryFacts(userMessage, 3);
        factsFound = facts.length;
        foundFacts = facts;
        if (facts.length > 0) {
          contextFromKB = '\n\n[Base de Conhecimento Permanente]:\n' + 
            facts.map((f, i) => `${i + 1}. ${f.title}: ${f.content}`).join('\n');
        }
        tracker.endStage();
      } catch (error) {
        console.error('[chat] RAG error (continuing without docs):', error.message);
      }
    }

    // 5. Preparar contexto
    tracker.startStage('prepare_context');
    if (onProgress) onProgress({ stage: 'prepare_context', message: '⚙️ Preparando contexto' });
    const allContext = contextFromKB + contextFromDocs;
    if (allContext) {
      messages.unshift({
        role: 'system',
        content: `Você é um assistente objetivo e direto. Responda de forma concisa e precisa, sem textos desnecessários. 

IMPORTANTE: Sempre que usar informações dos documentos fornecidos, cite EXATAMENTE qual documento contém a informação, incluindo o nome do arquivo. Use o formato: "📄 [nome do arquivo]".

Se não encontrar a informação nos documentos fornecidos, diga claramente: "Não encontrei essa informação nos documentos disponíveis."

Use o contexto fornecido quando relevante:${allContext}`,
      });
    } else {
      messages.unshift({
        role: 'system',
        content: `Você é um assistente objetivo e direto. Responda de forma concisa e precisa, sem textos desnecessários. Seja direto ao ponto.`,
      });
    }
    tracker.endStage();

    // 6. Gerar resposta do LLM
    tracker.startStage('llm_generation');
    if (onProgress) onProgress({ stage: 'llm_generation', message: '🤖 Gerando resposta (LLM)' });
    const response = await generate({ messages });
    tracker.endStage();

    // 7. Salvar resposta do assistente
    tracker.startStage('save_assistant_message');
    if (onProgress) onProgress({ stage: 'save_assistant_message', message: '💾 Salvando resposta' });
    const assistantMsg = Message.createAssistantMessage(
      conversation.id,
      response.content,
      { 
        model: response.model, 
        usedDocuments: contextFromDocs.length > 0,
        usedKnowledgeBase: contextFromKB.length > 0,
        docsFound,
        factsFound,
      }
    );
    const savedAssistantMsg = await repo.addMessage(assistantMsg);
    tracker.endStage();

    // Finalizar telemetria
    const telemetry = await tracker.finish({
      messageLength: userMessage.length,
      responseLength: response.content.length,
      docsFound,
      factsFound,
    });

    return {
      conversationId: conversation.id,
      userMessage: userMsg,
      assistantMessage: savedAssistantMsg,
      messageId: savedAssistantMsg.id,
      telemetry,
      sources: {
        documents: docsFound > 0 ? foundDocs.map(d => ({
          filename: d.filename,
          description: d.description,
          similarity: d.similarity
        })) : [],
        knowledgeBase: factsFound > 0 ? foundFacts.map(f => ({
          title: f.title,
          content: f.content
        })) : []
      }
    };
  } catch (error) {
    await tracker.finish({ error: error.message });
    throw error;
  }
}

module.exports = { chat };

