const http = require('node:http');
const fs = require('fs');
const path = require('path');
const { getHelloMessage } = require('../../application/index.js');
const { handleConversationsRoutes } = require('./routes/conversations.js');
const { handleChatRoute } = require('./routes/chat.js');
const { handleAdminRoutes } = require('./routes/admin.js');
const { handleDocumentsRoutes } = require('./routes/documents.js');
const { handleLogsRoutes } = require('./routes/logs.js');
const { handleMessagesRoutes } = require('./routes/messages.js');
const { handleKnowledgeRoutes } = require('./routes/knowledge.js');
const { handleSystemRoutes } = require('./routes/system.js');
const { 
  handleListDirectoriesRoute,
  handleAddDirectoryRoute,
  handleUpdateDirectoryRoute,
  handleDeleteDirectoryRoute,
  handleScanDirectoryRoute,
  handleListFilesRoute,
  handleRunMonitoringRoute,
  handleStatusRoute
} = require('./routes/monitoring.js');
const { createLogger } = require('../../infra/logging/logger');
const { startGlobalScheduler } = require('../../application/monitoring/scheduler');

const logger = createLogger('server');
const PORT = Number(process.env.PORT || 3000);

function requestListener(req, res) {
  const url = req.url || '/';

  if (url === '/' && req.method === 'GET') {
    // Tentar index-simple.html primeiro (versão funcional garantida)
    const simpleHtmlPath = path.join(__dirname, 'static', 'index-simple.html');
    const htmlPath = path.join(__dirname, 'static', 'index.html');
    
    let filePath = simpleHtmlPath;
    if (!fs.existsSync(simpleHtmlPath) && fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
    
    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Agent1 - Web</h1><p>Servidor em execução.</p>');
    }
    return;
  }

  if (url.startsWith('/hello') && req.method === 'GET') {
    const urlObj = new URL(url, `http://localhost:${PORT}`);
    const name = urlObj.searchParams.get('name') || undefined;
    const message = getHelloMessage(name);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ message }));
    return;
  }

  if (url === '/healthz' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // API routes
  if (url.startsWith('/api/conversations')) {
    return handleConversationsRoutes(url, req, res);
  }

  if (url === '/api/chat' && req.method === 'POST') {
    return handleChatRoute(req, res);
  }

  if (url.startsWith('/api/admin')) {
    return handleAdminRoutes(url, req, res);
  }

  if (url.startsWith('/api/documents')) {
    return handleDocumentsRoutes(url, req, res);
  }

  if (url.startsWith('/api/logs')) {
    return handleLogsRoutes(url, req, res);
  }

  if (url.startsWith('/api/messages')) {
    return handleMessagesRoutes(url, req, res);
  }

  if (url.startsWith('/api/knowledge')) {
    return handleKnowledgeRoutes(url, req, res);
  }

  if (url.startsWith('/api/system')) {
    return handleSystemRoutes(url, req, res);
  }

  // Rotas de Monitoramento
  if (url === '/api/monitoring/directories' && req.method === 'GET') {
    return handleListDirectoriesRoute(req, res);
  }
  
  if (url === '/api/monitoring/directories' && req.method === 'POST') {
    return handleAddDirectoryRoute(req, res);
  }
  
  if (url.startsWith('/api/monitoring/directories/') && req.method === 'PUT') {
    return handleUpdateDirectoryRoute(req, res);
  }
  
  if (url.startsWith('/api/monitoring/directories/') && req.method === 'DELETE') {
    return handleDeleteDirectoryRoute(req, res);
  }
  
  if (url.includes('/api/monitoring/directories/') && url.endsWith('/scan') && req.method === 'POST') {
    return handleScanDirectoryRoute(req, res);
  }
  
  if (url.startsWith('/api/monitoring/files/') && req.method === 'GET') {
    return handleListFilesRoute(req, res);
  }
  
  if (url === '/api/monitoring/run' && req.method === 'POST') {
    return handleRunMonitoringRoute(req, res);
  }
  
  if (url === '/api/monitoring/status' && req.method === 'GET') {
    return handleStatusRoute(req, res);
  }

  logger.warn('Route not found', { url, method: req.method });
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}

function startServer() {
  const server = http.createServer(requestListener);
  server.listen(PORT, () => {
    logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development' });
    
    // Iniciar scheduler de monitoramento
    try {
      startGlobalScheduler();
      logger.info('Scheduler de monitoramento iniciado');
    } catch (error) {
      logger.error('Erro ao iniciar scheduler de monitoramento', {}, error);
    }
  });
  return server;
}

module.exports = { startServer };

if (require.main === module) {
  startServer();
}

