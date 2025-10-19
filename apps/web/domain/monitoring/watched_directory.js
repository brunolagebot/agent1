/**
 * Domain: Watched Directory
 * Representa um diretório sob observação para fine-tuning automático
 */

class WatchedDirectory {
  constructor({ 
    id, 
    path, 
    name, 
    enabled = true, 
    scanInterval = 3600000, // 1 hora em ms
    lastScan = null,
    fileFilters = {},
    contentFilters = {},
    autoFinetuning = true,
    createdAt,
    updatedAt 
  }) {
    this.id = id;
    this.path = path;
    this.name = name;
    this.enabled = enabled;
    this.scanInterval = scanInterval;
    this.lastScan = lastScan;
    this.fileFilters = fileFilters;
    this.contentFilters = contentFilters;
    this.autoFinetuning = autoFinetuning;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create({ path, name, scanInterval = 3600000, fileFilters = {}, contentFilters = {} }) {
    return new WatchedDirectory({
      id: null,
      path,
      name,
      enabled: true,
      scanInterval,
      lastScan: null,
      fileFilters: {
        allowedExtensions: ['.pdf', '.txt', '.md', '.docx', '.csv', '.xlsx'],
        maxFileSize: 50 * 1024 * 1024, // 50MB
        excludePatterns: ['*.tmp', '*.log', '*.cache'],
        ...fileFilters
      },
      contentFilters: {
        minContentLength: 100,
        maxContentLength: 1000000, // 1MB de texto
        excludeKeywords: ['confidencial', 'privado', 'secreto'],
        requireKeywords: [],
        ...contentFilters
      },
      autoFinetuning: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  static fromRepository(data) {
    return new WatchedDirectory({
      id: data.id,
      path: data.path,
      name: data.name,
      enabled: data.enabled,
      scanInterval: data.scan_interval,
      lastScan: data.last_scan,
      fileFilters: data.file_filters || {},
      contentFilters: data.content_filters || {},
      autoFinetuning: data.auto_finetuning,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  }

  toRepository() {
    return {
      id: this.id,
      path: this.path,
      name: this.name,
      enabled: this.enabled,
      scan_interval: this.scanInterval,
      last_scan: this.lastScan,
      file_filters: this.fileFilters,
      content_filters: this.contentFilters,
      auto_finetuning: this.autoFinetuning,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  shouldScan() {
    if (!this.enabled) return false;
    if (!this.lastScan) return true;
    
    const now = new Date();
    const timeSinceLastScan = now.getTime() - this.lastScan.getTime();
    return timeSinceLastScan >= this.scanInterval;
  }

  updateLastScan() {
    this.lastScan = new Date();
    this.updatedAt = new Date();
  }

  isFileAllowed(filename, fileSize) {
    const { allowedExtensions, maxFileSize, excludePatterns } = this.fileFilters;
    
    // Verificar extensão
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      return false;
    }
    
    // Verificar tamanho
    if (fileSize > maxFileSize) {
      return false;
    }
    
    // Verificar padrões de exclusão
    for (const pattern of excludePatterns) {
      if (this.matchesPattern(filename, pattern)) {
        return false;
      }
    }
    
    return true;
  }

  isContentAllowed(content) {
    const { minContentLength, maxContentLength, excludeKeywords, requireKeywords } = this.contentFilters;
    
    // Verificar tamanho do conteúdo
    if (content.length < minContentLength || content.length > maxContentLength) {
      return false;
    }
    
    // Verificar palavras-chave de exclusão
    const contentLower = content.toLowerCase();
    for (const keyword of excludeKeywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        return false;
      }
    }
    
    // Verificar palavras-chave obrigatórias
    if (requireKeywords.length > 0) {
      const hasRequiredKeyword = requireKeywords.some(keyword => 
        contentLower.includes(keyword.toLowerCase())
      );
      if (!hasRequiredKeyword) {
        return false;
      }
    }
    
    return true;
  }

  matchesPattern(filename, pattern) {
    // Implementação simples de matching de padrões
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(filename);
  }
}

module.exports = { WatchedDirectory };
