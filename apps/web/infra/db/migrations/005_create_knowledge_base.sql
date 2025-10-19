-- Migration 005: Knowledge Base permanente

-- Tabela de fatos (conhecimento estruturado)
CREATE TABLE IF NOT EXISTS knowledge_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB,
  source VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_facts_category ON knowledge_facts(category);
CREATE INDEX idx_facts_verified ON knowledge_facts(verified);
CREATE INDEX idx_facts_embedding ON knowledge_facts USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_facts_created_at ON knowledge_facts(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_facts_updated_at BEFORE UPDATE ON knowledge_facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função de busca semântica em fatos
CREATE OR REPLACE FUNCTION search_knowledge(query_embedding vector(768), match_threshold float, match_count int)
RETURNS TABLE (
  fact_id UUID,
  category VARCHAR(100),
  title VARCHAR(255),
  content TEXT,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kf.id,
    kf.category,
    kf.title,
    kf.content,
    1 - (kf.embedding <=> query_embedding) AS similarity
  FROM knowledge_facts kf
  WHERE 1 - (kf.embedding <=> query_embedding) > match_threshold
    AND kf.verified = TRUE
  ORDER BY kf.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Inserir alguns exemplos (você pode adicionar os seus)
COMMENT ON TABLE knowledge_facts IS 'Base de conhecimento permanente - dados estruturados que sempre são consultados durante chat';

