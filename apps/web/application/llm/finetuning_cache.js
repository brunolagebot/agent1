/**
 * Sistema de Cache para Fine-tuning Incremental
 * Gerencia dados de treinamento para evitar reprocessamento
 */

const fs = require('fs').promises;
const path = require('path');
const { createLogger } = require('../../infra/logging/logger');

const logger = createLogger('finetuning-cache');
const CACHE_DIR = path.join(__dirname, '..', '..', '..', 'temp', 'finetuning-cache');

/**
 * Inicializa o diretório de cache
 */
async function initCache() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    logger.info('Cache de fine-tuning inicializado', { cacheDir: CACHE_DIR });
  } catch (error) {
    logger.error('Erro ao inicializar cache', {}, error);
    throw error;
  }
}

/**
 * Salva dados de QA gerados para reutilização
 */
async function saveDocumentQA(documentId, qaData) {
  try {
    await initCache();
    const cacheFile = path.join(CACHE_DIR, `doc_qa_${documentId}.json`);
    await fs.writeFile(cacheFile, JSON.stringify(qaData, null, 2));
    logger.info('QA de documento salvo no cache', { documentId, qaCount: qaData.length });
  } catch (error) {
    logger.error('Erro ao salvar QA no cache', { documentId }, error);
    throw error;
  }
}

/**
 * Carrega QA de documento do cache
 */
async function loadDocumentQA(documentId) {
  try {
    const cacheFile = path.join(CACHE_DIR, `doc_qa_${documentId}.json`);
    const data = await fs.readFile(cacheFile, 'utf8');
    const qaData = JSON.parse(data);
    logger.info('QA de documento carregado do cache', { documentId, qaCount: qaData.length });
    return qaData;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.info('Cache não encontrado para documento', { documentId });
      return null;
    }
    logger.error('Erro ao carregar QA do cache', { documentId }, error);
    throw error;
  }
}

/**
 * Salva metadados do último fine-tuning
 */
async function saveFineTuningMetadata(metadata) {
  try {
    await initCache();
    const metadataFile = path.join(CACHE_DIR, 'last_finetuning.json');
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
    logger.info('Metadados de fine-tuning salvos', { metadata });
  } catch (error) {
    logger.error('Erro ao salvar metadados', {}, error);
    throw error;
  }
}

/**
 * Carrega metadados do último fine-tuning
 */
async function loadFineTuningMetadata() {
  try {
    const metadataFile = path.join(CACHE_DIR, 'last_finetuning.json');
    const data = await fs.readFile(metadataFile, 'utf8');
    const metadata = JSON.parse(data);
    logger.info('Metadados de fine-tuning carregados', { metadata });
    return metadata;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.info('Nenhum metadado de fine-tuning encontrado');
      return null;
    }
    logger.error('Erro ao carregar metadados', {}, error);
    throw error;
  }
}

/**
 * Verifica se um documento precisa de reprocessamento
 */
async function needsReprocessing(documentId, documentHash) {
  try {
    const metadata = await loadFineTuningMetadata();
    if (!metadata) return true;
    
    const lastProcessed = metadata.processedDocuments?.[documentId];
    if (!lastProcessed) return true;
    
    return lastProcessed.hash !== documentHash;
  } catch (error) {
    logger.error('Erro ao verificar necessidade de reprocessamento', { documentId }, error);
    return true; // Em caso de erro, reprocessa
  }
}

/**
 * Atualiza hash de documento processado
 */
async function updateDocumentHash(documentId, documentHash) {
  try {
    const metadata = await loadFineTuningMetadata() || { processedDocuments: {} };
    metadata.processedDocuments[documentId] = {
      hash: documentHash,
      processedAt: new Date().toISOString()
    };
    await saveFineTuningMetadata(metadata);
  } catch (error) {
    logger.error('Erro ao atualizar hash do documento', { documentId }, error);
  }
}

/**
 * Limpa cache antigo (mais de 30 dias)
 */
async function cleanupOldCache() {
  try {
    const files = await fs.readdir(CACHE_DIR);
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime.getTime() < thirtyDaysAgo) {
        await fs.unlink(filePath);
        logger.info('Arquivo de cache antigo removido', { file });
      }
    }
  } catch (error) {
    logger.error('Erro ao limpar cache antigo', {}, error);
  }
}

/**
 * Gera hash simples para documento
 */
function generateDocumentHash(document) {
  const crypto = require('crypto');
  const content = `${document.filename}_${document.fileSize}_${document.createdAt}_${document.description || ''}`;
  return crypto.createHash('md5').update(content).digest('hex');
}

module.exports = {
  initCache,
  saveDocumentQA,
  loadDocumentQA,
  saveFineTuningMetadata,
  loadFineTuningMetadata,
  needsReprocessing,
  updateDocumentHash,
  cleanupOldCache,
  generateDocumentHash
};
