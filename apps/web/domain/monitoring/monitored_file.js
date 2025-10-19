/**
 * Domain: Monitored File
 * Representa um arquivo sendo monitorado em um diretório
 */

class MonitoredFile {
  constructor({ 
    id, 
    watchedDirectoryId,
    filename, 
    filePath, 
    fileSize, 
    lastModified, 
    hash, 
    status = 'pending', // pending, processing, processed, error, excluded
    contentAnalysis = {},
    processingError = null,
    createdAt,
    updatedAt 
  }) {
    this.id = id;
    this.watchedDirectoryId = watchedDirectoryId;
    this.filename = filename;
    this.filePath = filePath;
    this.fileSize = fileSize;
    this.lastModified = lastModified;
    this.hash = hash;
    this.status = status;
    this.contentAnalysis = contentAnalysis;
    this.processingError = processingError;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create({ watchedDirectoryId, filename, filePath, fileSize, lastModified, hash }) {
    return new MonitoredFile({
      id: null,
      watchedDirectoryId,
      filename,
      filePath,
      fileSize,
      lastModified,
      hash,
      status: 'pending',
      contentAnalysis: {},
      processingError: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  static fromRepository(data) {
    return new MonitoredFile({
      id: data.id,
      watchedDirectoryId: data.watched_directory_id,
      filename: data.filename,
      filePath: data.file_path,
      fileSize: data.file_size,
      lastModified: data.last_modified,
      hash: data.hash,
      status: data.status,
      contentAnalysis: data.content_analysis || {},
      processingError: data.processing_error,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  }

  toRepository() {
    return {
      id: this.id,
      watched_directory_id: this.watchedDirectoryId,
      filename: this.filename,
      file_path: this.filePath,
      file_size: this.fileSize,
      last_modified: this.lastModified,
      hash: this.hash,
      status: this.status,
      content_analysis: this.contentAnalysis,
      processing_error: this.processingError,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  markAsProcessing() {
    this.status = 'processing';
    this.updatedAt = new Date();
  }

  markAsProcessed(contentAnalysis = {}) {
    this.status = 'processed';
    this.contentAnalysis = contentAnalysis;
    this.processingError = null;
    this.updatedAt = new Date();
  }

  markAsError(error) {
    this.status = 'error';
    this.processingError = error.message || error;
    this.updatedAt = new Date();
  }

  markAsExcluded(reason) {
    this.status = 'excluded';
    this.processingError = reason;
    this.updatedAt = new Date();
  }

  hasChanged(newHash, newLastModified) {
    return this.hash !== newHash || this.lastModified.getTime() !== newLastModified.getTime();
  }

  isProcessable() {
    return this.status === 'pending' || this.status === 'error';
  }

  isProcessed() {
    return this.status === 'processed';
  }

  getContentType() {
    const ext = this.filename.toLowerCase().substring(this.filename.lastIndexOf('.'));
    const typeMap = {
      '.pdf': 'document',
      '.txt': 'text',
      '.md': 'markdown',
      '.docx': 'document',
      '.csv': 'spreadsheet',
      '.xlsx': 'spreadsheet',
      '.xls': 'spreadsheet'
    };
    return typeMap[ext] || 'unknown';
  }
}

module.exports = { MonitoredFile };
