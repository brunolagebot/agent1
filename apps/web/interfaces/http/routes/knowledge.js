/**
 * Routes: /api/knowledge/*
 * Knowledge Base permanente
 */

const { addFact } = require('../../../application/knowledge/add_fact');
const { queryFacts } = require('../../../application/knowledge/query_facts');
const { PostgresKnowledgeRepository } = require('../../../infra/knowledge/postgres_knowledge_repository');
const { createLogger } = require('../../../infra/logging/logger');

const repo = new PostgresKnowledgeRepository();
const logger = createLogger('routes/knowledge');

/**
 * POST /api/knowledge/add
 * Body: { category, title, content, source?, autoVerify? }
 */
async function handleAddRoute(req, res) {
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const { category, title, content, source, autoVerify = false } = JSON.parse(body || '{}');
      
      logger.info('Add fact request', { category, title });
      
      if (!title || !content) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'title and content required' }));
        return;
      }

      const fact = await addFact({ category, title, content, source, autoVerify });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        status: 'ok',
        fact: {
          id: fact.id,
          category: fact.category,
          title: fact.title,
          verified: fact.verified,
        },
      }, null, 2));
    } catch (error) {
      logger.error('Add fact failed', {}, error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * POST /api/knowledge/query
 * Body: { query, limit? }
 */
async function handleQueryRoute(req, res) {
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const { query: searchQuery, limit = 5 } = JSON.parse(body || '{}');
      
      if (!searchQuery) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'query required' }));
        return;
      }

      const facts = await queryFacts(searchQuery, limit);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ facts }, null, 2));
    } catch (error) {
      logger.error('Query facts failed', {}, error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * GET /api/knowledge/list
 * Lista fatos (opcionalmente por categoria)
 */
async function handleListRoute(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const category = url.searchParams.get('category');
    
    const facts = await repo.listFacts({ category });

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ facts: facts.map(f => ({
      id: f.id,
      category: f.category,
      title: f.title,
      content: f.content,
      verified: f.verified,
    })) }, null, 2));
  } catch (error) {
    logger.error('List facts failed', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * Router para /api/knowledge/*
 */
function handleKnowledgeRoutes(url, req, res) {
  if (url === '/api/knowledge/add' && req.method === 'POST') {
    return handleAddRoute(req, res);
  }
  
  if (url === '/api/knowledge/query' && req.method === 'POST') {
    return handleQueryRoute(req, res);
  }
  
  if (url.startsWith('/api/knowledge/list')) {
    return handleListRoute(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Route not found' }));
}

module.exports = { handleKnowledgeRoutes };

