/**
 * Use Case: Ingest Document
 * Processa documento (PDF/TXT), gera chunks e embeddings
 */

const { Document } = require('../../domain/documents/document');
const { Chunk } = require('../../domain/documents/chunk');
const { PostgresDocumentsRepository } = require('../../infra/documents/postgres_documents_repository');
const { parsePDF, chunkText } = require('../../infra/documents/pdf_parser');
const { parseText } = require('../../infra/documents/text_parser');
const { parseSpreadsheet } = require('../../infra/documents/spreadsheet_parser');
const { generateEmbeddings } = require('../../infra/llm/embeddings_client');

const repo = new PostgresDocumentsRepository();

async function ingestDocument({ userId, filename, fileType, buffer, description = null }) {
  // 1. Parse baseado no tipo
  let parsed;
  if (fileType === 'application/pdf' || filename.endsWith('.pdf')) {
    parsed = await parsePDF(buffer);
  } else if (fileType.includes('csv') || fileType.includes('excel') || 
             filename.endsWith('.csv') || filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    parsed = await parseSpreadsheet(buffer, filename, fileType);
  } else {
    parsed = parseText(buffer);
  }

  // 2. Criar documento
  const doc = Document.create({
    userId,
    filename,
    fileType,
    fileSize: buffer.length,
    contentText: parsed.text,
    metadata: parsed.metadata || {},
    description,
  });
  const savedDoc = await repo.createDocument(doc);

  // 3. Chunk text
  const chunks = chunkText(parsed.text);

  // 4. Gerar embeddings
  const embeddings = await generateEmbeddings(chunks);

  // 5. Salvar chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = Chunk.create({
      documentId: savedDoc.id,
      chunkIndex: i,
      content: chunks[i],
      embedding: embeddings[i],
    });
    await repo.createChunk(chunk);
  }

  // 6. Marcar como processado
  await repo.markDocumentProcessed(savedDoc.id);

  return { document: savedDoc, chunksCount: chunks.length };
}

module.exports = { ingestDocument };

