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
      `INSERT INTO documents (user_id, filename, file_type, file_size, content_text, metadata, processed, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [data.user_id, data.filename, data.file_type, data.file_size, data.content_text, JSON.stringify(data.metadata), data.processed, data.description]
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

  async searchSimilarWithDocument(queryEmbedding, limit = 5, threshold = 0.3) {
    const result = await query(`
      SELECT 
        dc.id as chunk_id,
        dc.document_id,
        dc.content,
        dc.chunk_index,
        d.filename,
        d.description,
        d.file_type,
        d.created_at,
        (1 - (dc.embedding <=> $1::vector)) as similarity
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE d.processed = true
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $2
    `, [JSON.stringify(queryEmbedding), limit]);
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

  async getDocumentById(documentId) {
    const result = await query('SELECT * FROM documents WHERE id = $1', [documentId]);
    return result.rows.length > 0 ? Document.fromRepository(result.rows[0]) : null;
  }

  async deleteDocument(documentId) {
    // Deletar chunks primeiro (CASCADE já faz isso, mas vamos ser explícitos)
    await query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);
    
    // Deletar documento
    const result = await query('DELETE FROM documents WHERE id = $1 RETURNING *', [documentId]);
    return result.rows.length > 0 ? Document.fromRepository(result.rows[0]) : null;
  }

  async updateDocumentDescription(documentId, description) {
    const result = await query(
      'UPDATE documents SET description = $1 WHERE id = $2 RETURNING *',
      [description, documentId]
    );
    return result.rows.length > 0 ? Document.fromRepository(result.rows[0]) : null;
  }

  async getDocumentStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN processed = true THEN 1 END) as processed_documents,
        SUM(file_size) as total_size,
        COUNT(DISTINCT file_type) as file_types
      FROM documents
    `);
    
    const chunksResult = await query(`
      SELECT COUNT(*) as total_chunks
      FROM document_chunks
    `);
    
    return {
      documents: result.rows[0],
      chunks: chunksResult.rows[0]
    };
  }
}

module.exports = { PostgresDocumentsRepository };

