/**
 * Embeddings Client (Ollama)
 * Gera embeddings para busca semântica usando nomic-embed-text
 */

const http = require('http');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

/**
 * Gera embedding para um texto
 */
async function generateEmbedding(text) {
  // Parse OLLAMA_URL
  const url = new URL(OLLAMA_URL);
  const payload = {
    model: EMBEDDING_MODEL,
    input: text,
  };

  return new Promise((resolve, reject) => {
    const reqOptions = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || 11434,
      path: '/api/embed',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // API retorna { embeddings: [[...]] } para batch ou { embedding: [...] } para single
          const embedding = parsed.embeddings ? parsed.embeddings[0] : parsed.embedding;
          if (embedding) {
            resolve(embedding); // Array de floats
          } else {
            reject(new Error(`Invalid embedding response: ${JSON.stringify(parsed)}`));
          }
        } catch (err) {
          reject(new Error(`Embedding parse error: ${err.message}, data: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Gera embeddings para múltiplos textos (batch)
 */
async function generateEmbeddings(texts) {
  const embeddings = [];
  for (const text of texts) {
    const emb = await generateEmbedding(text);
    embeddings.push(emb);
  }
  return embeddings;
}

module.exports = { generateEmbedding, generateEmbeddings };

