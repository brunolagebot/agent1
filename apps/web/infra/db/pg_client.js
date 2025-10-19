/**
 * PostgreSQL Client (singleton)
 * Gerencia pool de conexões
 */

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL || 'postgres://agent1:dev_password@localhost:5432/agent1_dev';
    pool = new Pool({ connectionString: dbUrl });
    
    pool.on('error', (err) => {
      console.error('[pg_client] Pool error:', err.message);
    });
  }
  return pool;
}

async function query(text, params) {
  const client = getPool();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (err) {
    console.error('[pg_client] Query error:', err.message, { text, params });
    throw err;
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { query, close, getPool };

