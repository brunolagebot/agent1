-- Migration 002: Add training approval fields

-- Adicionar campo para aprovação de treinamento
ALTER TABLE conversations
ADD COLUMN approved_for_training BOOLEAN DEFAULT FALSE,
ADD COLUMN user_role VARCHAR(20) DEFAULT 'user' CHECK (user_role IN ('guest', 'user', 'advanced', 'admin'));

CREATE INDEX idx_conversations_approved_training ON conversations(approved_for_training);
CREATE INDEX idx_conversations_user_role ON conversations(user_role);

-- Conversas de admin são automaticamente aprovadas
CREATE OR REPLACE FUNCTION auto_approve_admin_conversations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_role = 'admin' THEN
    NEW.approved_for_training = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_approve_admin BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION auto_approve_admin_conversations();

