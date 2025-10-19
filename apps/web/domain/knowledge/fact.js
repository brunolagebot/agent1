/**
 * Domain Entity: Fact (Knowledge Base)
 * Representa um fato/conhecimento estruturado e permanente
 */

class Fact {
  constructor({ id, category, title, content, embedding, metadata = {}, source, verified = false, createdAt, updatedAt }) {
    this.id = id;
    this.category = category;
    this.title = title;
    this.content = content;
    this.embedding = embedding;
    this.metadata = metadata;
    this.source = source;
    this.verified = verified;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  static create({ category, title, content, embedding = null, metadata = {}, source = null }) {
    return new Fact({
      id: null,
      category,
      title,
      content,
      embedding,
      metadata,
      source,
      verified: false,
    });
  }

  static fromRepository(data) {
    return new Fact({
      id: data.id,
      category: data.category,
      title: data.title,
      content: data.content,
      embedding: data.embedding,
      metadata: data.metadata || {},
      source: data.source,
      verified: data.verified,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });
  }

  toRepository() {
    return {
      id: this.id,
      category: this.category,
      title: this.title,
      content: this.content,
      embedding: this.embedding,
      metadata: this.metadata,
      source: this.source,
      verified: this.verified,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

module.exports = { Fact };

