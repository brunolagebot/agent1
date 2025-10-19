/**
 * Domain Entity: Conversation
 * Representa uma conversa (thread) entre usuário e assistente
 */

class Conversation {
  constructor({ id, userId = null, title = null, createdAt, updatedAt, approvedForTraining = false, userRole = 'user' }) {
    this.id = id;
    this.userId = userId;
    this.title = title;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    this.approvedForTraining = approvedForTraining;
    this.userRole = userRole;
  }

  /**
   * Cria uma nova conversa sem ID (para inserção)
   */
  static create({ userId = null, title = null, userRole = 'user' } = {}) {
    return new Conversation({
      id: null,
      userId,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedForTraining: userRole === 'admin',
      userRole,
    });
  }

  /**
   * Reconstrói a partir de dados do repositório
   */
  static fromRepository(data) {
    return new Conversation({
      id: data.id,
      userId: data.user_id,
      title: data.title,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      approvedForTraining: data.approved_for_training || false,
      userRole: data.user_role || 'user',
    });
  }

  /**
   * Converte para formato de persistência
   */
  toRepository() {
    return {
      id: this.id,
      user_id: this.userId,
      title: this.title,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      approved_for_training: this.approvedForTraining,
      user_role: this.userRole,
    };
  }
}

module.exports = { Conversation };

