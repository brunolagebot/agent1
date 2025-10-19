/**
 * Repository: PostgreSQL implementation for Documents
 */

const { query } = require('../db/pg_client');
const { Document } = require('../../domain/documents/document');
const { Chunk } = require('../../domain/documents/chunk');

class PostgresDocumentsRepository {
  async createDocument(document) {
    const data = document.toRepository();
    const result = await query(
      `INSERT INTO documents (user_id, filename, file_type, file_size, content_text, metadata, processed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.user_id, data.filename, data.file_type, data.file_size, data.content_text, JSON.stringify(data.metadata), data.processed]
    );
    return Document.fromRepository(result.rows[0]);
  }

  async createChunk(chunk) {
    const data = chunk.toRepository();
    const result = await query(
      `INSERT INTO document_chunks (document_id, chunk_index, content, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.document_id, data.chunk_index, data.content, JSON.stringify(data.embedding), JSON.stringify(data.metadata)]
    );
    return Chunk.fromRepository(result.rows[0]);
  }

  async searchSimilar(queryEmbedding, limit = 5, threshold = 0.3) {
    const result = await query(
      'SELECT * FROM search_similar_chunks($1::vector, $2, $3)',
      [JSON.stringify(queryEmbedding), threshold, limit]
    );
    return result.rows;
  }

  async markDocumentProcessed(documentId) {
    await query('UPDATE documents SET processed = TRUE WHERE id = $1', [documentId]);
  }

  async listDocuments({ userId = null, limit = 50 } = {}) {
    let sql = 'SELECT * FROM documents';
    const params = [];
    
    if (userId) {
      sql += ' WHERE user_id = $1';
      params.push(userId);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(sql, params);
    return result.rows.map(Document.fromRepository);
  }
}

module.exports = { PostgresDocumentsRepository };

