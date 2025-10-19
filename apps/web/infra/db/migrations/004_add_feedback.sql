-- Migration 004: Add feedback system

-- Adicionar campo de feedback nas mensagens
ALTER TABLE messages
ADD COLUMN feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
ADD COLUMN feedback_comment TEXT,
ADD COLUMN feedback_at TIMESTAMP;

CREATE INDEX idx_messages_feedback ON messages(feedback_score) WHERE feedback_score IS NOT NULL;

-- View para análise de feedback
CREATE OR REPLACE VIEW feedback_analysis AS
SELECT
  m.feedback_score,
  COUNT(*) as count,
  AVG(LENGTH(m.content)) as avg_response_length,
  c.user_role
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE m.role = 'assistant' AND m.feedback_score IS NOT NULL
GROUP BY m.feedback_score, c.user_role
ORDER BY m.feedback_score DESC;

