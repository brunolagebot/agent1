/**
 * Use Case: Query Facts from Knowledge Base
 * Busca fatos relevantes por similaridade
 */

const { PostgresKnowledgeRepository } = require('../../infra/knowledge/postgres_knowledge_repository');
const { generateEmbedding } = require('../../infra/llm/embeddings_client');

const repo = new PostgresKnowledgeRepository();

async function queryFacts(query, limit = 5) {
  // Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query);

  // Buscar fatos similares
  const results = await repo.searchFacts(queryEmbedding, limit, 0.5);

  return results.map(r => ({
    factId: r.fact_id,
    category: r.category,
    title: r.title,
    content: r.content,
    similarity: r.similarity,
  }));
}

module.exports = { queryFacts };

