/**
 * Use Case: Add Fact to Knowledge Base
 * Adiciona fato permanente com embedding
 */

const { Fact } = require('../../domain/knowledge/fact');
const { PostgresKnowledgeRepository } = require('../../infra/knowledge/postgres_knowledge_repository');
const { generateEmbedding } = require('../../infra/llm/embeddings_client');
const { createLogger } = require('../../infra/logging/logger');

const repo = new PostgresKnowledgeRepository();
const logger = createLogger('application/knowledge');

async function addFact({ category, title, content, source = null, autoVerify = false }) {
  try {
    logger.info('Adding fact to knowledge base', { category, title });

    // Gerar embedding do conteúdo
    const embedding = await generateEmbedding(content);

    // Criar e salvar fato
    const fact = Fact.create({
      category,
      title,
      content,
      embedding,
      source,
    });

    const saved = await repo.addFact(fact);

    // Auto-verificar se solicitado
    if (autoVerify) {
      await repo.verifyFact(saved.id);
      saved.verified = true;
    }

    logger.info('Fact added successfully', { factId: saved.id, verified: saved.verified });

    return saved;
  } catch (error) {
    logger.error('Failed to add fact', { category, title }, error);
    throw error;
  }
}

module.exports = { addFact };

