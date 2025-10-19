/**
 * PDF Parser
 * Extrai texto de arquivos PDF
 */

const pdfParse = require('pdf-parse');

/**
 * Extrai texto de PDF buffer
 */
async function parsePDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pages: data.numpages,
      metadata: {
        info: data.info,
        metadata: data.metadata,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Divide texto em chunks (pedaços)
 * Estratégia: ~500 caracteres com overlap de 50
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start += chunkSize - overlap;
  }

  return chunks;
}

module.exports = { parsePDF, chunkText };

