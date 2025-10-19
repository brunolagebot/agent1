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
 * Faz upload de PDF/TXT e processa (suporta múltiplos arquivos)
 */
async function handleUploadRoute(req, res) {
  logger.info('Upload request started');
  const form = formidable({ 
    multiples: true, // Permitir múltiplos arquivos
    maxFileSize: 10 * 1024 * 1024, // 10MB por arquivo
    maxFiles: 10 // Máximo 10 arquivos por upload
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      logger.error('Formidable parse error', {}, err);
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ 
        success: false,
        error: err.message 
      }));
      return;
    }

    try {
      // Verificar se há arquivos
      if (!files.file || (Array.isArray(files.file) && files.file.length === 0)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ 
          success: false,
          error: 'Nenhum arquivo foi enviado' 
        }));
        return;
      }

      // Normalizar para array (formidable pode retornar objeto único ou array)
      const fileList = Array.isArray(files.file) ? files.file : [files.file];
      
      logger.info('Files received', { count: fileList.length, filenames: fileList.map(f => f.originalFilename) });
      
      const results = [];
      const errors = [];

      // Processar cada arquivo
      for (const file of fileList) {
        try {
              // Validar tipo de arquivo
              const supportedTypes = ['pdf', 'text', 'csv', 'excel', 'spreadsheet'];
              const isSupported = supportedTypes.some(type => 
                file.mimetype.includes(type) || 
                file.originalFilename.toLowerCase().endsWith(`.${type}`) ||
                file.originalFilename.toLowerCase().endsWith('.xlsx') ||
                file.originalFilename.toLowerCase().endsWith('.xls')
              );
              
              if (!file.mimetype || !isSupported) {
                errors.push({
                  filename: file.originalFilename,
                  error: 'Tipo de arquivo não suportado. Use PDF, TXT, CSV ou Excel.'
                });
                continue;
              }

          // Validar tamanho
          if (file.size > 10 * 1024 * 1024) {
            errors.push({
              filename: file.originalFilename,
              error: 'Arquivo muito grande. Máximo 10MB.'
            });
            continue;
          }

          const buffer = await fs.readFile(file.filepath);

          // Extrair descrição do campo description (se fornecido)
          const description = fields.description ? fields.description[0] : null;

          const result = await ingestDocument({
            userId: null,
            filename: file.originalFilename,
            fileType: file.mimetype,
            buffer,
            description,
          });

          results.push({
            documentId: result.document.id,
            filename: result.document.filename,
            chunksCount: result.chunksCount,
            size: file.size
          });

          logger.info('Document ingested successfully', { 
            documentId: result.document.id, 
            filename: result.document.filename,
            chunks: result.chunksCount 
          });

          // Limpar arquivo temporário
          await fs.unlink(file.filepath);

        } catch (fileError) {
          logger.error('File processing failed', { filename: file.originalFilename }, fileError);
          errors.push({
            filename: file.originalFilename,
            error: fileError.message
          });
          
          // Limpar arquivo temporário em caso de erro
          try {
            await fs.unlink(file.filepath);
          } catch (unlinkError) {
            logger.warn('Failed to cleanup temp file', { filepath: file.filepath }, unlinkError);
          }
        }
      }

      // Resposta baseada nos resultados
      const response = {
        success: results.length > 0,
        processed: results.length,
        total: fileList.length,
        results: results,
        errors: errors
      };

      const statusCode = results.length > 0 ? 200 : 400;
      
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(response, null, 2));

    } catch (error) {
      logger.error('Upload processing failed', {}, error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ 
        success: false,
        error: error.message 
      }));
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
 * DELETE /api/documents/:id
 * Remove um documento e seus chunks
 */
async function handleDeleteRoute(req, res) {
  try {
    const urlParts = req.url.split('/');
    const documentId = urlParts[urlParts.length - 1];
    
    if (!documentId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Document ID required' }));
      return;
    }
    
    const deletedDoc = await repo.deleteDocument(documentId);
    
    if (!deletedDoc) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Document not found' }));
      return;
    }
    
    logger.info('Document deleted', { documentId, filename: deletedDoc.filename });
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      message: `Documento "${deletedDoc.filename}" removido com sucesso`,
      document: {
        id: deletedDoc.id,
        filename: deletedDoc.filename
      }
    }));
  } catch (error) {
    logger.error('Delete document failed', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * PUT /api/documents/:id/description
 * Atualiza a descrição de um documento
 */
async function handleUpdateDescriptionRoute(req, res) {
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const urlParts = req.url.split('/');
      const documentId = urlParts[urlParts.length - 2]; // /api/documents/:id/description
      
      if (!documentId) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Document ID required' }));
        return;
      }
      
      const { description } = JSON.parse(body || '{}');
      
      // Validar se description é string (pode ser null para remover)
      if (description !== null && typeof description !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Description must be a string or null' }));
        return;
      }
      
      const updatedDoc = await repo.updateDocumentDescription(documentId, description);
      
      if (!updatedDoc) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Document not found' }));
        return;
      }
      
      logger.info('Document description updated', { documentId, filename: updatedDoc.filename });
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: `Descrição do documento "${updatedDoc.filename}" atualizada com sucesso`,
        document: {
          id: updatedDoc.id,
          filename: updatedDoc.filename,
          description: updatedDoc.description
        }
      }));
    } catch (error) {
      logger.error('Update description failed', {}, error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * GET /api/documents/stats
 * Estatísticas dos documentos
 */
async function handleStatsRoute(req, res) {
  try {
    const stats = await repo.getDocumentStats();
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      stats: {
        totalDocuments: parseInt(stats.documents.total_documents),
        processedDocuments: parseInt(stats.documents.processed_documents),
        totalSize: parseInt(stats.documents.total_size || 0),
        fileTypes: parseInt(stats.documents.file_types),
        totalChunks: parseInt(stats.chunks.total_chunks)
      }
    }));
  } catch (error) {
    logger.error('Document stats failed', {}, error);
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
  
  if (url === '/api/documents/stats' && req.method === 'GET') {
    return handleStatsRoute(req, res);
  }
  
  if (url.startsWith('/api/documents/') && req.method === 'DELETE') {
    return handleDeleteRoute(req, res);
  }
  
  if (url.endsWith('/description') && req.method === 'PUT') {
    return handleUpdateDescriptionRoute(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Route not found' }));
}

module.exports = { handleDocumentsRoutes };

