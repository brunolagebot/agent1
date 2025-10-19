/**
 * Domain Entity: Message
 * Representa uma mensagem dentro de uma conversa
 */

const VALID_ROLES = ['user', 'assistant', 'system'];

class Message {
  constructor({ id, conversationId, role, content, createdAt, metadata = {} }) {
    if (!VALID_ROLES.includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(', ')}`);
    }
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    this.id = id;
    this.conversationId = conversationId;
    this.role = role;
    this.content = content;
    this.createdAt = createdAt || new Date();
    this.metadata = metadata;
  }

  /**
   * Cria mensagem de usuário
   */
  static createUserMessage(conversationId, content, metadata = {}) {
    return new Message({
      id: null,
      conversationId,
      role: 'user',
      content,
      metadata,
    });
  }

  /**
   * Cria mensagem de assistente
   */
  static createAssistantMessage(conversationId, content, metadata = {}) {
    return new Message({
      id: null,
      conversationId,
      role: 'assistant',
      content,
      metadata,
    });
  }

  /**
   * Reconstrói a partir de dados do repositório
   */
  static fromRepository(data) {
    return new Message({
      id: data.id,
      conversationId: data.conversation_id,
      role: data.role,
      content: data.content,
      createdAt: new Date(data.created_at),
      metadata: data.metadata || {},
    });
  }

  /**
   * Converte para formato de persistência
   */
  toRepository() {
    return {
      id: this.id,
      conversation_id: this.conversationId,
      role: this.role,
      content: this.content,
      created_at: this.createdAt,
      metadata: this.metadata,
    };
  }
}

module.exports = { Message };

