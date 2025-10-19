/**
 * Routes: /api/monitoring
 */

const { PostgresMonitoringRepository } = require('../../../infra/monitoring/postgres_monitoring_repository');
const { WatchedDirectory } = require('../../../domain/monitoring/watched_directory');
const { scanDirectory, runManualMonitoring, getGlobalSchedulerStatus } = require('../../../application/monitoring/scheduler');
const { createLogger } = require('../../../infra/logging/logger');

const logger = createLogger('routes/monitoring');
const repo = new PostgresMonitoringRepository();

/**
 * GET /api/monitoring/directories
 * Lista diretórios monitorados
 */
async function handleListDirectoriesRoute(req, res) {
  try {
    const directories = await repo.getActiveWatchedDirectories();
    
    const directoriesWithStats = await Promise.all(
      directories.map(async (dir) => {
        const stats = await repo.getDirectoryStats(dir.id);
        return {
          ...dir.toRepository(),
          stats
        };
      })
    );

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      directories: directoriesWithStats
    }, null, 2));
  } catch (error) {
    logger.error('Erro ao listar diretórios', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * POST /api/monitoring/directories
 * Adiciona novo diretório para monitoramento
 */
async function handleAddDirectoryRoute(req, res) {
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const { path, name, scanInterval, fileFilters, contentFilters, autoFinetuning } = JSON.parse(body || '{}');
      
      if (!path || !name) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'path e name são obrigatórios' }));
        return;
      }

      const watchedDirectory = WatchedDirectory.create({
        path,
        name,
        scanInterval: scanInterval || 3600000, // 1 hora
        fileFilters: fileFilters || {},
        contentFilters: contentFilters || {},
        autoFinetuning: autoFinetuning !== false
      });

      const created = await repo.createWatchedDirectory(watchedDirectory);
      
      logger.info(`Diretório adicionado para monitoramento: ${name} (${path})`);

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        directory: created.toRepository()
      }, null, 2));
    } catch (error) {
      logger.error('Erro ao adicionar diretório', {}, error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * PUT /api/monitoring/directories/:id
 * Atualiza configurações de um diretório
 */
async function handleUpdateDirectoryRoute(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.pathname.split('/').pop();
  
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const updates = JSON.parse(body || '{}');
      
      const directory = await repo.getWatchedDirectoryById(id);
      if (!directory) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Diretório não encontrado' }));
        return;
      }

      // Aplicar atualizações
      if (updates.name !== undefined) directory.name = updates.name;
      if (updates.enabled !== undefined) directory.enabled = updates.enabled;
      if (updates.scanInterval !== undefined) directory.scanInterval = updates.scanInterval;
      if (updates.fileFilters !== undefined) directory.fileFilters = { ...directory.fileFilters, ...updates.fileFilters };
      if (updates.contentFilters !== undefined) directory.contentFilters = { ...directory.contentFilters, ...updates.contentFilters };
      if (updates.autoFinetuning !== undefined) directory.autoFinetuning = updates.autoFinetuning;

      const updated = await repo.updateWatchedDirectory(directory);
      
      logger.info(`Diretório atualizado: ${updated.name}`);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        directory: updated.toRepository()
      }, null, 2));
    } catch (error) {
      logger.error('Erro ao atualizar diretório', {}, error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * DELETE /api/monitoring/directories/:id
 * Remove diretório do monitoramento
 */
async function handleDeleteDirectoryRoute(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.pathname.split('/').pop();
  
  try {
    const directory = await repo.getWatchedDirectoryById(id);
    if (!directory) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Diretório não encontrado' }));
      return;
    }

    await repo.deleteWatchedDirectory(id);
    
    logger.info(`Diretório removido do monitoramento: ${directory.name}`);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      message: 'Diretório removido com sucesso'
    }));
  } catch (error) {
    logger.error('Erro ao remover diretório', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * POST /api/monitoring/directories/:id/scan
 * Força escaneamento de um diretório
 */
async function handleScanDirectoryRoute(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.pathname.split('/')[3]; // /api/monitoring/directories/:id/scan
  
  try {
    const directory = await repo.getWatchedDirectoryById(id);
    if (!directory) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Diretório não encontrado' }));
      return;
    }

    logger.info(`Iniciando escaneamento manual do diretório: ${directory.name}`);
    
    const result = await scanDirectory(directory, repo);
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      message: 'Escaneamento concluído',
      result
    }, null, 2));
  } catch (error) {
    logger.error('Erro no escaneamento manual', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * GET /api/monitoring/files/:directoryId
 * Lista arquivos monitorados de um diretório
 */
async function handleListFilesRoute(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const directoryId = url.pathname.split('/').pop();
  
  try {
    const files = await repo.getFilesByDirectory(directoryId);
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      files: files.map(f => f.toRepository())
    }, null, 2));
  } catch (error) {
    logger.error('Erro ao listar arquivos', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * POST /api/monitoring/run
 * Executa monitoramento manual de todos os diretórios
 */
async function handleRunMonitoringRoute(req, res) {
  try {
    logger.info('Executando monitoramento manual');
    
    const result = await runManualMonitoring();
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: result.success,
      message: result.message || result.error
    }, null, 2));
  } catch (error) {
    logger.error('Erro no monitoramento manual', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * GET /api/monitoring/status
 * Obtém status do sistema de monitoramento
 */
async function handleStatusRoute(req, res) {
  try {
    const schedulerStatus = getGlobalSchedulerStatus();
    const stats = await repo.getMonitoringStats();
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      scheduler: schedulerStatus,
      stats
    }, null, 2));
  } catch (error) {
    logger.error('Erro ao obter status', {}, error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

module.exports = {
  handleListDirectoriesRoute,
  handleAddDirectoryRoute,
  handleUpdateDirectoryRoute,
  handleDeleteDirectoryRoute,
  handleScanDirectoryRoute,
  handleListFilesRoute,
  handleRunMonitoringRoute,
  handleStatusRoute
};
