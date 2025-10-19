/**
 * Domain Entity: Document
 * Representa um documento (PDF, TXT, etc) carregado pelo usuário
 */

class Document {
  constructor({ id, userId, filename, fileType, fileSize, contentText, metadata = {}, createdAt, processed = false, description = null }) {
    this.id = id;
    this.userId = userId;
    this.filename = filename;
    this.fileType = fileType;
    this.fileSize = fileSize;
    this.contentText = contentText;
    this.metadata = metadata;
    this.createdAt = createdAt || new Date();
    this.processed = processed;
    this.description = description;
  }

  static create({ userId, filename, fileType, fileSize, contentText, metadata = {}, description = null }) {
    return new Document({
      id: null,
      userId,
      filename,
      fileType,
      fileSize,
      contentText,
      metadata,
      processed: false,
      description,
    });
  }

  static fromRepository(data) {
    return new Document({
      id: data.id,
      userId: data.user_id,
      filename: data.filename,
      fileType: data.file_type,
      fileSize: data.file_size,
      contentText: data.content_text,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      processed: data.processed,
      description: data.description,
    });
  }

  toRepository() {
    return {
      id: this.id,
      user_id: this.userId,
      filename: this.filename,
      file_type: this.fileType,
      file_size: this.fileSize,
      content_text: this.contentText,
      metadata: this.metadata,
      created_at: this.createdAt,
      processed: this.processed,
      description: this.description,
    };
  }
}

module.exports = { Document };

