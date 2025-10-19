-- Migration 008: Sistema de Monitoramento de Diretórios

-- Tabela de diretórios monitorados
CREATE TABLE IF NOT EXISTS watched_directories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  scan_interval BIGINT DEFAULT 3600000, -- 1 hora em ms
  last_scan TIMESTAMP,
  file_filters JSONB DEFAULT '{}',
  content_filters JSONB DEFAULT '{}',
  auto_finetuning BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de arquivos monitorados
CREATE TABLE IF NOT EXISTS monitored_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watched_directory_id UUID REFERENCES watched_directories(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  last_modified TIMESTAMP,
  hash VARCHAR(32), -- MD5 hash
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, processed, error, excluded
  content_analysis JSONB DEFAULT '{}',
  processing_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_watched_directories_enabled ON watched_directories(enabled);
CREATE INDEX idx_watched_directories_path ON watched_directories(path);
CREATE INDEX idx_monitored_files_directory ON monitored_files(watched_directory_id);
CREATE INDEX idx_monitored_files_status ON monitored_files(status);
CREATE INDEX idx_monitored_files_hash ON monitored_files(hash);
CREATE INDEX idx_monitored_files_updated_at ON monitored_files(updated_at DESC);

-- Triggers para updated_at
CREATE TRIGGER update_watched_directories_updated_at BEFORE UPDATE ON watched_directories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitored_files_updated_at BEFORE UPDATE ON monitored_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE watched_directories IS 'Diretórios sob monitoramento para fine-tuning automático';
COMMENT ON TABLE monitored_files IS 'Arquivos monitorados em diretórios observados';

COMMENT ON COLUMN watched_directories.scan_interval IS 'Intervalo de escaneamento em milissegundos';
COMMENT ON COLUMN watched_directories.file_filters IS 'Filtros para tipos de arquivo (extensões, tamanho, padrões)';
COMMENT ON COLUMN watched_directories.content_filters IS 'Filtros para conteúdo (tamanho, palavras-chave)';

COMMENT ON COLUMN monitored_files.status IS 'Status do processamento: pending, processing, processed, error, excluded';
COMMENT ON COLUMN monitored_files.content_analysis IS 'Análise de qualidade e metadados do conteúdo';
COMMENT ON COLUMN monitored_files.hash IS 'Hash MD5 para detectar mudanças no arquivo';
