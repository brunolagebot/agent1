/**
 * Use Case: Directory Watcher
 * Monitora diretórios e atualiza fine-tuning automaticamente
 */

const fs = require('fs').promises;
const path = require('path');
const { analyzeFile } = require('./file_content_analyzer');
const { createLogger } = require('../../infra/logging/logger');
const { generateDocumentQA } = require('../llm/document_qa_generator');
const { executeFineTuning } = require('../llm/finetuning');

const logger = createLogger('directory_watcher');

/**
 * Escaneia um diretório e processa arquivos novos/modificados
 * @param {Object} watchedDirectory - Diretório sendo monitorado
 * @param {Object} repository - Repositório de arquivos monitorados
 * @returns {Promise<Object>} Resultado do escaneamento
 */
async function scanDirectory(watchedDirectory, repository) {
  const startTime = Date.now();
  logger.info(`Iniciando escaneamento do diretório: ${watchedDirectory.path}`);

  try {
    // Verificar se o diretório existe
    await fs.access(watchedDirectory.path);
    
    // Obter lista de arquivos no diretório
    const files = await getDirectoryFiles(watchedDirectory.path);
    logger.info(`Encontrados ${files.length} arquivos no diretório`);

    // Obter arquivos já monitorados
    const existingFiles = await repository.getFilesByDirectory(watchedDirectory.id);
    const existingFileMap = new Map(existingFiles.map(f => [f.filePath, f]));

    const results = {
      totalFiles: files.length,
      newFiles: 0,
      modifiedFiles: 0,
      processedFiles: 0,
      excludedFiles: 0,
      errorFiles: 0,
      files: []
    };

    // Processar cada arquivo
    for (const filePath of files) {
      try {
        const fileResult = await processFile(
          filePath, 
          watchedDirectory, 
          existingFileMap.get(filePath),
          repository
        );
        
        results.files.push(fileResult);
        
        switch (fileResult.status) {
          case 'new':
            results.newFiles++;
            break;
          case 'modified':
            results.modifiedFiles++;
            break;
          case 'processed':
            results.processedFiles++;
            break;
          case 'excluded':
            results.excludedFiles++;
            break;
          case 'error':
            results.errorFiles++;
            break;
        }
        
      } catch (error) {
        logger.error(`Erro ao processar arquivo ${filePath}`, {}, error);
        results.errorFiles++;
        results.files.push({
          filePath,
          status: 'error',
          error: error.message
        });
      }
    }

    // Atualizar timestamp do último escaneamento
    watchedDirectory.updateLastScan();
    await repository.updateWatchedDirectory(watchedDirectory);

    const duration = Date.now() - startTime;
    logger.info(`Escaneamento concluído em ${duration}ms`, results);

    return results;

  } catch (error) {
    logger.error(`Erro ao escanear diretório ${watchedDirectory.path}`, {}, error);
    throw error;
  }
}

/**
 * Processa um arquivo individual
 */
async function processFile(filePath, watchedDirectory, existingFile, repository) {
  const filename = path.basename(filePath);
  
  try {
    // Analisar o arquivo
    const analysis = await analyzeFile(
      filePath, 
      watchedDirectory.fileFilters, 
      watchedDirectory.contentFilters
    );

    if (!analysis.included) {
      // Arquivo excluído pelos filtros
      if (existingFile) {
        existingFile.markAsExcluded(analysis.reason);
        await repository.updateMonitoredFile(existingFile);
      }
      
      return {
        filePath,
        filename,
        status: 'excluded',
        reason: analysis.reason
      };
    }

    // Verificar se é um arquivo novo ou modificado
    if (!existingFile) {
      // Arquivo novo
      const monitoredFile = await repository.createMonitoredFile({
        watchedDirectoryId: watchedDirectory.id,
        filename: analysis.filename,
        filePath: analysis.filePath,
        fileSize: analysis.fileSize,
        lastModified: analysis.lastModified,
        hash: analysis.hash
      });

      // Processar o arquivo
      await processFileForFinetuning(monitoredFile, analysis, repository);
      
      return {
        filePath,
        filename,
        status: 'new',
        monitoredFileId: monitoredFile.id,
        contentType: analysis.contentType
      };
      
    } else if (existingFile.hasChanged(analysis.hash, analysis.lastModified)) {
      // Arquivo modificado
      existingFile.hash = analysis.hash;
      existingFile.lastModified = analysis.lastModified;
      existingFile.markAsProcessing();
      await repository.updateMonitoredFile(existingFile);

      // Reprocessar o arquivo
      await processFileForFinetuning(existingFile, analysis, repository);
      
      return {
        filePath,
        filename,
        status: 'modified',
        monitoredFileId: existingFile.id,
        contentType: analysis.contentType
      };
    } else {
      // Arquivo não modificado
      return {
        filePath,
        filename,
        status: 'unchanged',
        monitoredFileId: existingFile.id
      };
    }

  } catch (error) {
    logger.error(`Erro ao processar arquivo ${filePath}`, {}, error);
    
    if (existingFile) {
      existingFile.markAsError(error);
      await repository.updateMonitoredFile(existingFile);
    }
    
    return {
      filePath,
      filename,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Processa um arquivo para fine-tuning
 */
async function processFileForFinetuning(monitoredFile, analysis, repository) {
  try {
    monitoredFile.markAsProcessing();
    await repository.updateMonitoredFile(monitoredFile);

    // Gerar QA para o arquivo
    const qaPairs = await generateDocumentQA({
      maxQuestionsPerDocument: 3,
      specificDocuments: [{
        id: monitoredFile.id,
        filename: monitoredFile.filename,
        contentText: analysis.contentPreview,
        description: analysis.suggestedDescription
      }]
    });

    // Marcar como processado
    monitoredFile.markAsProcessed({
      contentType: analysis.contentType,
      contentLength: analysis.contentLength,
      qualityScore: analysis.qualityScore,
      qaPairsGenerated: qaPairs.length,
      suggestedDescription: analysis.suggestedDescription
    });

    await repository.updateMonitoredFile(monitoredFile);

    logger.info(`Arquivo processado: ${monitoredFile.filename} (${qaPairs.length} QA pairs)`);

  } catch (error) {
    logger.error(`Erro ao processar arquivo para fine-tuning: ${monitoredFile.filename}`, {}, error);
    monitoredFile.markAsError(error);
    await repository.updateMonitoredFile(monitoredFile);
    throw error;
  }
}

/**
 * Executa fine-tuning automático se necessário
 */
async function triggerAutoFinetuning(watchedDirectory, repository) {
  if (!watchedDirectory.autoFinetuning) {
    logger.info('Fine-tuning automático desabilitado para este diretório');
    return;
  }

  try {
    // Verificar se há arquivos processados recentemente
    const recentFiles = await repository.getRecentProcessedFiles(watchedDirectory.id, 24 * 60 * 60 * 1000); // 24 horas
    
    if (recentFiles.length === 0) {
      logger.info('Nenhum arquivo processado recentemente, pulando fine-tuning');
      return;
    }

    logger.info(`Iniciando fine-tuning automático para ${recentFiles.length} arquivos processados`);
    
    // Executar fine-tuning
    const result = await executeFineTuning();
    
    logger.info('Fine-tuning automático concluído', {
      success: result.success,
      qaPairs: result.stats?.totalQAPairs || 0
    });

    return result;

  } catch (error) {
    logger.error('Erro no fine-tuning automático', {}, error);
    throw error;
  }
}

/**
 * Obtém lista de arquivos em um diretório (recursivo)
 */
async function getDirectoryFiles(dirPath, files = []) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Pular diretórios ocultos e node_modules
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await getDirectoryFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  } catch (error) {
    logger.error(`Erro ao ler diretório ${dirPath}`, {}, error);
    return files;
  }
}

/**
 * Inicia o monitoramento automático de todos os diretórios
 */
async function startAutoMonitoring(repository) {
  logger.info('Iniciando monitoramento automático de diretórios');
  
  const watchedDirectories = await repository.getActiveWatchedDirectories();
  
  for (const directory of watchedDirectories) {
    if (directory.shouldScan()) {
      try {
        logger.info(`Escaneando diretório: ${directory.name}`);
        
        const scanResult = await scanDirectory(directory, repository);
        
        // Se houve arquivos processados, executar fine-tuning
        if (scanResult.processedFiles > 0) {
          await triggerAutoFinetuning(directory, repository);
        }
        
      } catch (error) {
        logger.error(`Erro no monitoramento do diretório ${directory.name}`, {}, error);
      }
    }
  }
}

module.exports = { 
  scanDirectory, 
  processFile, 
  triggerAutoFinetuning, 
  startAutoMonitoring 
};
