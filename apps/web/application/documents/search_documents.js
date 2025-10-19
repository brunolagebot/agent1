/**
 * Use Case: Search Documents
 * Busca semântica em documentos
 */

const { PostgresDocumentsRepository } = require('../../infra/documents/postgres_documents_repository');
const { generateEmbedding } = require('../../infra/llm/embeddings_client');

const repo = new PostgresDocumentsRepository();

async function searchDocuments(query, limit = 5) {
  // 1. Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Buscar chunks similares com informações do documento
  const results = await repo.searchSimilarWithDocument(queryEmbedding, limit);

  return results.map(r => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    content: r.content,
    similarity: r.similarity,
    filename: r.filename,
    description: r.description,
    fileType: r.file_type,
    createdAt: r.created_at
  }));
}

module.exports = { searchDocuments };

