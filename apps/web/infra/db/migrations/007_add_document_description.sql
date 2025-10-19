-- Migration 007: Add description field to documents table

-- Adicionar campo de descrição na tabela documents
ALTER TABLE documents 
ADD COLUMN description TEXT;

-- Adicionar índice para busca por descrição
CREATE INDEX idx_documents_description ON documents USING gin(to_tsvector('portuguese', description));

-- Comentário para documentar o campo
COMMENT ON COLUMN documents.description IS 'Descrição manual do documento fornecida pelo usuário durante o upload';
