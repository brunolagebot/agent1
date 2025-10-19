/**
 * Repository: PostgreSQL implementation for Monitoring
 */

const { query } = require('../db/pg_client');
const { WatchedDirectory } = require('../../domain/monitoring/watched_directory');
const { MonitoredFile } = require('../../domain/monitoring/monitored_file');

class PostgresMonitoringRepository {
  // Watched Directories
  
  async createWatchedDirectory(watchedDirectory) {
    const data = watchedDirectory.toRepository();
    const result = await query(
      `INSERT INTO watched_directories (path, name, enabled, scan_interval, file_filters, content_filters, auto_finetuning)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.path, 
        data.name, 
        data.enabled, 
        data.scan_interval, 
        JSON.stringify(data.file_filters), 
        JSON.stringify(data.content_filters), 
        data.auto_finetuning
      ]
    );
    return WatchedDirectory.fromRepository(result.rows[0]);
  }

  async getWatchedDirectoryById(id) {
    const result = await query('SELECT * FROM watched_directories WHERE id = $1', [id]);
    return result.rows.length > 0 ? WatchedDirectory.fromRepository(result.rows[0]) : null;
  }

  async getActiveWatchedDirectories() {
    const result = await query('SELECT * FROM watched_directories WHERE enabled = true ORDER BY created_at');
    return result.rows.map(row => WatchedDirectory.fromRepository(row));
  }

  async updateWatchedDirectory(watchedDirectory) {
    const data = watchedDirectory.toRepository();
    const result = await query(
      `UPDATE watched_directories 
       SET path = $2, name = $3, enabled = $4, scan_interval = $5, 
           file_filters = $6, content_filters = $7, auto_finetuning = $8, 
           last_scan = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        data.id, data.path, data.name, data.enabled, data.scan_interval,
        JSON.stringify(data.file_filters), JSON.stringify(data.content_filters),
        data.auto_finetuning, data.last_scan
      ]
    );
    return WatchedDirectory.fromRepository(result.rows[0]);
  }

  async deleteWatchedDirectory(id) {
    await query('DELETE FROM watched_directories WHERE id = $1', [id]);
  }

  // Monitored Files

  async createMonitoredFile(monitoredFile) {
    const data = monitoredFile.toRepository();
    const result = await query(
      `INSERT INTO monitored_files (watched_directory_id, filename, file_path, file_size, last_modified, hash, status, content_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.watched_directory_id, data.filename, data.file_path, data.file_size,
        data.last_modified, data.hash, data.status, JSON.stringify(data.content_analysis)
      ]
    );
    return MonitoredFile.fromRepository(result.rows[0]);
  }

  async getMonitoredFileById(id) {
    const result = await query('SELECT * FROM monitored_files WHERE id = $1', [id]);
    return result.rows.length > 0 ? MonitoredFile.fromRepository(result.rows[0]) : null;
  }

  async getFilesByDirectory(watchedDirectoryId) {
    const result = await query(
      'SELECT * FROM monitored_files WHERE watched_directory_id = $1 ORDER BY created_at DESC',
      [watchedDirectoryId]
    );
    return result.rows.map(row => MonitoredFile.fromRepository(row));
  }

  async getRecentProcessedFiles(watchedDirectoryId, timeWindowMs) {
    const timeWindow = new Date(Date.now() - timeWindowMs);
    const result = await query(
      `SELECT * FROM monitored_files 
       WHERE watched_directory_id = $1 
         AND status = 'processed' 
         AND updated_at > $2
       ORDER BY updated_at DESC`,
      [watchedDirectoryId, timeWindow]
    );
    return result.rows.map(row => MonitoredFile.fromRepository(row));
  }

  async updateMonitoredFile(monitoredFile) {
    const data = monitoredFile.toRepository();
    const result = await query(
      `UPDATE monitored_files 
       SET filename = $2, file_path = $3, file_size = $4, last_modified = $5, 
           hash = $6, status = $7, content_analysis = $8, processing_error = $9, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        data.id, data.filename, data.file_path, data.file_size, data.last_modified,
        data.hash, data.status, JSON.stringify(data.content_analysis), data.processing_error
      ]
    );
    return MonitoredFile.fromRepository(result.rows[0]);
  }

  async deleteMonitoredFile(id) {
    await query('DELETE FROM monitored_files WHERE id = $1', [id]);
  }

  // Statistics

  async getMonitoringStats() {
    const result = await query(`
      SELECT 
        (SELECT COUNT(*) FROM watched_directories WHERE enabled = true) as active_directories,
        (SELECT COUNT(*) FROM monitored_files) as total_files,
        (SELECT COUNT(*) FROM monitored_files WHERE status = 'processed') as processed_files,
        (SELECT COUNT(*) FROM monitored_files WHERE status = 'pending') as pending_files,
        (SELECT COUNT(*) FROM monitored_files WHERE status = 'error') as error_files,
        (SELECT COUNT(*) FROM monitored_files WHERE status = 'excluded') as excluded_files,
        (SELECT MAX(last_scan) FROM watched_directories) as last_scan
    `);
    return result.rows[0];
  }

  async getDirectoryStats(watchedDirectoryId) {
    const result = await query(`
      SELECT 
        wd.name,
        wd.path,
        wd.last_scan,
        COUNT(mf.id) as total_files,
        COUNT(CASE WHEN mf.status = 'processed' THEN 1 END) as processed_files,
        COUNT(CASE WHEN mf.status = 'pending' THEN 1 END) as pending_files,
        COUNT(CASE WHEN mf.status = 'error' THEN 1 END) as error_files,
        COUNT(CASE WHEN mf.status = 'excluded' THEN 1 END) as excluded_files,
        SUM(CASE WHEN mf.status = 'processed' THEN mf.file_size ELSE 0 END) as total_size
      FROM watched_directories wd
      LEFT JOIN monitored_files mf ON wd.id = mf.watched_directory_id
      WHERE wd.id = $1
      GROUP BY wd.id, wd.name, wd.path, wd.last_scan
    `, [watchedDirectoryId]);
    return result.rows[0];
  }
}

module.exports = { PostgresMonitoringRepository };
