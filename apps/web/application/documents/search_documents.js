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

  // 2. Buscar chunks similares
  const results = await repo.searchSimilar(queryEmbedding, limit);

  return results.map(r => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    content: r.content,
    similarity: r.similarity,
  }));
}

module.exports = { searchDocuments };

