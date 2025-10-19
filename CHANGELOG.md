# Changelog

## [0.4.0] - 2025-10-19
### Adicionado
- **Sistema de Logging Estruturado**
  - Módulo logging (domain/infra) com rotação diária
  - Logs em JSON (debug/info/warn/error)
  - Endpoint `/api/logs/analyze` para análise automática
  - Detecção de padrões e sugestões inteligentes
  - Volume `./logs` montado no Docker
- **Ollama + LLM Local (Qwen2.5:7b)**
  - Container Ollama no docker-compose
  - Modelo Qwen2.5 (PT-BR) + nomic-embed-text (embeddings)
  - Cliente HTTP para geração de texto
  - Use case chat com histórico
- **RAG (Retrieval-Augmented Generation)**
  - Upload de PDFs/TXT via `/api/documents/upload`
  - Parser de PDF (pdf-parse) e TXT
  - Chunking automático com overlap
  - Embeddings via Ollama (nomic-embed-text)
  - PostgreSQL + pgvector para busca semântica
  - Busca automática em documentos durante chat
  - Contexto relevante injetado no prompt
- **Sistema de Treinamento Automático**
  - Campo `approved_for_training` em conversations
  - Conversas de admin aprovadas automaticamente (trigger DB)
  - Endpoint `/api/admin/export` (JSONL para fine-tuning)
  - Endpoint `/api/admin/approve` (aprovação manual)
- **Módulos Domain/Application/Infra**
  - `conversations` - gerenciamento de conversas
  - `documents` - RAG e embeddings
  - `llm` - clientes Ollama (chat + embeddings)
  - `logging` - sistema de logs
- **Interface Web Moderna**
  - Design gradient roxo/azul
  - Animações e transições suaves
  - Upload drag & drop
  - Modo Admin/Usuário
  - Chat com scrollbar customizada

### Modificado
- PostgreSQL: migrado para `ankane/pgvector` (suporte vector search)
- Migrations: 001 (conversations), 002 (training fields), 003 (documents+pgvector)
- docker-compose.dev.yml: adicionado Ollama e volume de logs
- Todas as rotas com logging estruturado

### Corrigido
- Import do formidable (era `require('formidable')` → `require('formidable').formidable`)
- API de embeddings do Ollama (`/api/embed` com campo `input`)
- Dependências no package.json (pg, pdf-parse, formidable)

## [0.2.0] - 2025-10-19
### Adicionado
- Estrutura modular (domain/application/interfaces/infra) para app web
- Servidor HTTP Node.js com rotas `/`, `/hello`, `/healthz`
- Docker + Traefik para desenvolvimento e produção
- Suporte a TLS automático (Let's Encrypt) em produção
- Scripts de bootstrap macOS (Docker/Colima)
- Scripts de correção de credenciais e plugin Docker Compose
- Makefile com alvos para build/up dev/prod (evita rebuilds)
- Documentação completa em COMANDOS.md
- Guias de acesso remoto (DNS, Twingate, Cloudflare Tunnel, WireGuard)
- README atualizado com requisitos e instruções

### Modificado
- bootstrap_macos.sh: instala Docker Desktop ou Colima automaticamente
- Dockerfile: Node.js 20 Alpine com estrutura apps/web
- docker-compose.dev.yml: HTTP (sem redirect HTTPS) para desenvolvimento
- docker-compose.prod.yml: HTTPS com certificados automáticos

## [0.1.0] - 2025-10-17
- Estrutura inicial.
