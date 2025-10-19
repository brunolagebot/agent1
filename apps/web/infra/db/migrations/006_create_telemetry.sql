-- Migration 006: Telemetria de performance

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  operation VARCHAR(100) NOT NULL,
  stage VARCHAR(100),
  duration_ms INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_perf_operation ON performance_metrics(operation);
CREATE INDEX idx_perf_stage ON performance_metrics(stage);
CREATE INDEX idx_perf_created_at ON performance_metrics(created_at DESC);

-- View para análise de performance média
CREATE OR REPLACE VIEW performance_analysis AS
SELECT
  operation,
  stage,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY operation, stage
ORDER BY operation, stage;

COMMENT ON TABLE performance_metrics IS 'Telemetria de performance - usado pelo próprio modelo para estimar tempos de operação';

