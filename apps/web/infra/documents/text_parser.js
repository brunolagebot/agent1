/**
 * Text Parser
 * Processa arquivos de texto puro (.txt, .md, etc)
 */

/**
 * Extrai texto de buffer
 */
function parseText(buffer) {
  const text = buffer.toString('utf-8');
  return {
    text,
    metadata: {},
  };
}

/**
 * Divide texto em chunks (reusa do pdf_parser)
 */
const { chunkText } = require('./pdf_parser');

module.exports = { parseText, chunkText };

