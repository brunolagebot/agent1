const http = require('node:http');
const { getHelloMessage } = require('../../application/index.js');

const PORT = Number(process.env.PORT || 3000);

function requestListener(req, res) {
  const url = req.url || '/';

  if (url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Agent1 - Web</h1><p>Servidor em execução.</p>');
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

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}

function startServer() {
  const server = http.createServer(requestListener);
  server.listen(PORT);
  return server;
}

module.exports = { startServer };

if (require.main === module) {
  startServer();
}

