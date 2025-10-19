/**
 * Ollama HTTP Client
 * Comunica com API do Ollama para geração de texto
 */

const http = require('http');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:14b-instruct-q4_K_M';

/**
 * Gera resposta via Ollama
 */
async function generate({ model = DEFAULT_MODEL, messages, temperature = 0.7, maxTokens = 2048 } = {}) {
  // Parse OLLAMA_URL (ex: http://ollama:11434)
  const url = new URL(OLLAMA_URL);
  const payload = {
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: false,
    options: {
      temperature,
      num_predict: maxTokens,
    },
  };

  return new Promise((resolve, reject) => {
    const reqOptions = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || 11434,
      path: '/api/chat',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          console.log('[ollama_client] Raw response:', data.slice(0, 500));
          const parsed = JSON.parse(data);
          console.log('[ollama_client] Parsed:', JSON.stringify(parsed).slice(0, 200));
          
          if (parsed.message && parsed.message.content) {
            resolve({
              content: parsed.message.content,
              model: parsed.model || model,
              done: parsed.done,
            });
          } else {
            console.error('[ollama_client] Missing message.content:', JSON.stringify(parsed));
            reject(new Error(`Invalid response from Ollama: ${JSON.stringify(parsed).slice(0, 200)}`));
          }
        } catch (err) {
          console.error('[ollama_client] Parse error:', err.message, 'Data:', data.slice(0, 500));
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Lista modelos disponíveis
 */
async function listModels() {
  const url = new URL('/api/tags', OLLAMA_URL);

  return new Promise((resolve, reject) => {
    const reqOptions = {
      method: 'GET',
      hostname: url.hostname,
      port: url.port || 11434,
      path: url.pathname,
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.models || []);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

module.exports = { generate, listModels };

