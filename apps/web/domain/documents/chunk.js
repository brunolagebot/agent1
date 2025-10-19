/**
 * Domain Entity: Chunk
 * Pedaço de documento com embedding para busca semântica
 */

class Chunk {
  constructor({ id, documentId, chunkIndex, content, embedding, metadata = {}, createdAt }) {
    this.id = id;
    this.documentId = documentId;
    this.chunkIndex = chunkIndex;
    this.content = content;
    this.embedding = embedding; // Array de floats
    this.metadata = metadata;
    this.createdAt = createdAt || new Date();
  }

  static create({ documentId, chunkIndex, content, embedding, metadata = {} }) {
    return new Chunk({
      id: null,
      documentId,
      chunkIndex,
      content,
      embedding,
      metadata,
    });
  }

  static fromRepository(data) {
    return new Chunk({
      id: data.id,
      documentId: data.document_id,
      chunkIndex: data.chunk_index,
      content: data.content,
      embedding: data.embedding,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
    });
  }

  toRepository() {
    return {
      id: this.id,
      document_id: this.documentId,
      chunk_index: this.chunkIndex,
      content: this.content,
      embedding: this.embedding,
      metadata: this.metadata,
      created_at: this.createdAt,
    };
  }
}

module.exports = { Chunk };

