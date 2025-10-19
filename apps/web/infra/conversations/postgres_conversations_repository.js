/**
 * Repository: PostgreSQL implementation for Conversations
 */

const { query } = require('../db/pg_client');
const { Conversation } = require('../../domain/conversations/conversation');
const { Message } = require('../../domain/conversations/message');

class PostgresConversationsRepository {
  /**
   * Cria nova conversa
   */
  async createConversation(conversation) {
    const data = conversation.toRepository();
    const result = await query(
      `INSERT INTO conversations (user_id, title, created_at, updated_at, user_role, approved_for_training)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, title, created_at, updated_at, approved_for_training, user_role`,
      [data.user_id, data.title, data.created_at, data.updated_at, data.user_role, data.approved_for_training]
    );
    return Conversation.fromRepository(result.rows[0]);
  }

  /**
   * Alias para manter compatibilidade
   */
  async createConversationWithRole(conversation) {
    return this.createConversation(conversation);
  }

  /**
   * Busca conversa por ID
   */
  async findConversationById(id) {
    const result = await query(
      'SELECT id, user_id, title, created_at, updated_at, approved_for_training, user_role FROM conversations WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? Conversation.fromRepository(result.rows[0]) : null;
  }

  /**
   * Lista conversas (opcionalmente filtradas)
   */
  async listConversations({ userId = null, approvedForTraining = null, limit = 50, offset = 0 } = {}) {
    let sql = 'SELECT id, user_id, title, created_at, updated_at, approved_for_training, user_role FROM conversations';
    const params = [];
    const filters = [];
    
    if (userId) {
      filters.push(`user_id = $${params.length + 1}`);
      params.push(userId);
    }
    
    if (approvedForTraining !== null) {
      filters.push(`approved_for_training = $${params.length + 1}`);
      params.push(approvedForTraining);
    }
    
    if (filters.length > 0) {
      sql += ' WHERE ' + filters.join(' AND ');
    }
    
    sql += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows.map(Conversation.fromRepository);
  }

  /**
   * Aprova conversa para treinamento
   */
  async approveForTraining(id, approved = true) {
    await query(
      'UPDATE conversations SET approved_for_training = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [approved, id]
    );
  }

  /**
   * Adiciona mensagem a uma conversa
   */
  async addMessage(message) {
    const data = message.toRepository();
    const result = await query(
      `INSERT INTO messages (conversation_id, role, content, created_at, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, conversation_id, role, content, created_at, metadata`,
      [data.conversation_id, data.role, data.content, data.created_at, JSON.stringify(data.metadata)]
    );
    return Message.fromRepository(result.rows[0]);
  }

  /**
   * Lista mensagens de uma conversa
   */
  async getMessages(conversationId) {
    const result = await query(
      `SELECT id, conversation_id, role, content, created_at, metadata
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );
    return result.rows.map(Message.fromRepository);
  }

  /**
   * Deleta conversa (cascade nas mensagens)
   */
  async deleteConversation(id) {
    await query('DELETE FROM conversations WHERE id = $1', [id]);
  }
}

module.exports = { PostgresConversationsRepository };

