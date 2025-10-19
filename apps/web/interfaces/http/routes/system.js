/**
 * Routes: /api/system/*
 * Operações administrativas do sistema
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { createLogger } = require('../../../infra/logging/logger');
const { query } = require('../../../infra/db/pg_client');

const execAsync = promisify(exec);
const logger = createLogger('routes/system');

/**
 * GET /api/system/version
 * Retorna versão atual do sistema
 */
async function handleVersionRoute(req, res) {
  try {
    const packageJson = require('../../../../package.json');
    const { stdout: gitTag } = await execAsync('git describe --tags --always').catch(() => ({ stdout: 'unknown' }));
    const { stdout: gitCommit } = await execAsync('git log -1 --oneline').catch(() => ({ stdout: 'unknown' }));
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      version: packageJson.version,
      gitTag: gitTag.trim(),
      gitCommit: gitCommit.trim(),
    }, null, 2));
  } catch (error) {
    logger.error('Version check failed', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * GET /api/system/stats
 * Estatísticas gerais do sistema
 */
async function handleStatsRoute(req, res) {
  try {
    // Conversas
    const convResult = await query('SELECT COUNT(*) as count FROM conversations');
    const conversationsCount = parseInt(convResult.rows[0].count);
    
    // Mensagens
    const msgResult = await query('SELECT COUNT(*) as count FROM messages');
    const messagesCount = parseInt(msgResult.rows[0].count);
    
    // Documentos
    const docsResult = await query('SELECT COUNT(*) as count FROM documents');
    const documentsCount = parseInt(docsResult.rows[0].count);
    
    // Knowledge Base
    const kbResult = await query('SELECT COUNT(*) as count FROM knowledge_facts WHERE verified = TRUE');
    const factsCount = parseInt(kbResult.rows[0].count);
    
    // Feedback médio
    const feedbackResult = await query(`
      SELECT AVG(feedback_score) as avg_score, COUNT(*) as count 
      FROM messages 
      WHERE feedback_score IS NOT NULL
    `);
    const avgFeedback = feedbackResult.rows[0].avg_score ? parseFloat(feedbackResult.rows[0].avg_score).toFixed(2) : null;
    const feedbackCount = parseInt(feedbackResult.rows[0].count);
    
    // Performance média
    const perfResult = await query(`
      SELECT operation, AVG(duration_ms) as avg_ms 
      FROM performance_metrics 
      WHERE created_at > NOW() - INTERVAL '24 hours' 
      GROUP BY operation
    `);
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      conversations: conversationsCount,
      messages: messagesCount,
      documents: documentsCount,
      facts: factsCount,
      feedback: {
        average: avgFeedback,
        count: feedbackCount,
      },
      performance: perfResult.rows,
    }, null, 2));
  } catch (error) {
    logger.error('Stats failed', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * GET /api/system/models
 * Lista modelos disponíveis no Ollama
 */
async function handleModelsRoute(req, res) {
  try {
    const { stdout } = await execAsync('docker exec agent1-ollama-1 ollama list');
    
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(stdout);
  } catch (error) {
    logger.error('Models list failed', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * Router para /api/system/*
 */
function handleSystemRoutes(url, req, res) {
  if (url === '/api/system/version' && req.method === 'GET') {
    return handleVersionRoute(req, res);
  }
  
  if (url === '/api/system/stats' && req.method === 'GET') {
    return handleStatsRoute(req, res);
  }
  
  if (url === '/api/system/models' && req.method === 'GET') {
    return handleModelsRoute(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Route not found' }));
}

module.exports = { handleSystemRoutes };

