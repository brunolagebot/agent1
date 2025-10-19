/**
 * Repository: PostgreSQL Knowledge Base
 */

const { query } = require('../db/pg_client');
const { Fact } = require('../../domain/knowledge/fact');

class PostgresKnowledgeRepository {
  async addFact(fact) {
    const data = fact.toRepository();
    const result = await query(
      `INSERT INTO knowledge_facts (category, title, content, embedding, metadata, source, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.category, data.title, data.content, JSON.stringify(data.embedding), JSON.stringify(data.metadata), data.source, data.verified]
    );
    return Fact.fromRepository(result.rows[0]);
  }

  async searchFacts(queryEmbedding, limit = 5, threshold = 0.5) {
    const result = await query(
      'SELECT * FROM search_knowledge($1::vector, $2, $3)',
      [JSON.stringify(queryEmbedding), threshold, limit]
    );
    return result.rows;
  }

  async listFacts({ category = null, verified = true, limit = 100 } = {}) {
    let sql = 'SELECT * FROM knowledge_facts';
    const params = [];
    const filters = [];

    if (category) {
      filters.push(`category = $${params.length + 1}`);
      params.push(category);
    }

    if (verified !== null) {
      filters.push(`verified = $${params.length + 1}`);
      params.push(verified);
    }

    if (filters.length > 0) {
      sql += ' WHERE ' + filters.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(sql, params);
    return result.rows.map(Fact.fromRepository);
  }

  async verifyFact(id) {
    await query('UPDATE knowledge_facts SET verified = TRUE WHERE id = $1', [id]);
  }

  async deleteFact(id) {
    await query('DELETE FROM knowledge_facts WHERE id = $1', [id]);
  }
}

module.exports = { PostgresKnowledgeRepository };

