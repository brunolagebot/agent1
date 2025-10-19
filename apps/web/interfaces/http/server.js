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
const { createLogger } = require('../../infra/logging/logger');

const logger = createLogger('server');
const PORT = Number(process.env.PORT || 3000);

function requestListener(req, res) {
  const url = req.url || '/';

  if (url === '/' && req.method === 'GET') {
    const htmlPath = path.join(__dirname, 'static', 'index.html');
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf-8');
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

  logger.warn('Route not found', { url, method: req.method });
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}

function startServer() {
  const server = http.createServer(requestListener);
  server.listen(PORT, () => {
    logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development' });
  });
  return server;
}

module.exports = { startServer };

if (require.main === module) {
  startServer();
}

