/**
 * Routes: /api/documents/*
 */

const { formidable } = require('formidable');
const fs = require('fs').promises;
const { ingestDocument } = require('../../../application/documents/ingest_document');
const { searchDocuments } = require('../../../application/documents/search_documents');
const { PostgresDocumentsRepository } = require('../../../infra/documents/postgres_documents_repository');
const { createLogger } = require('../../../infra/logging/logger');

const repo = new PostgresDocumentsRepository();
const logger = createLogger('routes/documents');

/**
 * POST /api/documents/upload
 * Faz upload de PDF/TXT e processa
 */
async function handleUploadRoute(req, res) {
  logger.info('Upload request started');
  const form = formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024 }); // 10MB

  form.parse(req, async (err, fields, files) => {
    if (err) {
      logger.error('Formidable parse error', {}, err);
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }

    try {
      const file = files.file[0];
      logger.info('File received', { filename: file.originalFilename, size: file.size, type: file.mimetype });
      
      const buffer = await fs.readFile(file.filepath);
      const userRole = fields.userRole ? fields.userRole[0] : 'user';

      const result = await ingestDocument({
        userId: null,
        filename: file.originalFilename,
        fileType: file.mimetype,
        buffer,
      });

      logger.info('Document ingested successfully', { documentId: result.document.id, chunks: result.chunksCount });

      // Limpar arquivo temporário
      await fs.unlink(file.filepath);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        status: 'ok',
        documentId: result.document.id,
        filename: result.document.filename,
        chunksCount: result.chunksCount,
      }, null, 2));
    } catch (error) {
      logger.error('Upload failed', { filename: files?.file?.[0]?.originalFilename }, error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * POST /api/documents/search
 * Busca semântica em documentos
 */
async function handleSearchRoute(req, res) {
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const { query, limit = 5 } = JSON.parse(body || '{}');
      
      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'query is required' }));
        return;
      }

      const results = await searchDocuments(query, limit);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ results }, null, 2));
    } catch (error) {
      console.error('[documents/search] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * GET /api/documents
 * Lista documentos
 */
async function handleListRoute(req, res) {
  try {
    const documents = await repo.listDocuments({ limit: 50 });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ documents }, null, 2));
  } catch (error) {
    console.error('[documents/list] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * Router para /api/documents/*
 */
function handleDocumentsRoutes(url, req, res) {
  if (url === '/api/documents/upload' && req.method === 'POST') {
    return handleUploadRoute(req, res);
  }
  
  if (url === '/api/documents/search' && req.method === 'POST') {
    return handleSearchRoute(req, res);
  }
  
  if (url === '/api/documents' && req.method === 'GET') {
    return handleListRoute(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Route not found' }));
}

module.exports = { handleDocumentsRoutes };

