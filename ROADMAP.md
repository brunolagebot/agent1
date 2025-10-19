# Roadmap - Agent1 SaaS

## ✅ v0.2.0 - Fundação (Concluído - 2025-10-19)
- [x] Estrutura modular (domain/application/interfaces/infra)
- [x] Servidor HTTP básico (Node.js)
- [x] Docker + Traefik dev/prod
- [x] Scripts bootstrap macOS
- [x] Documentação inicial (README, COMANDOS, CHANGELOG)
- [x] Acesso remoto (guias DNS/VPN/Twingate)

## 🚧 v0.3.0 - Módulo Exemplo Completo + Testes
**Objetivo:** Criar um módulo funcional seguindo todas as camadas + testes automatizados

### Backend
- [ ] Módulo `tasks` (gerenciador de tarefas simples)
  - [ ] `domain/tasks/task.js` - entidade Task pura
  - [ ] `domain/tasks/task_repository.js` - interface do repositório
  - [ ] `application/tasks/create_task.js` - use case
  - [ ] `application/tasks/list_tasks.js` - use case
  - [ ] `infra/tasks/in_memory_task_repository.js` - implementação
  - [ ] `interfaces/http/routes/tasks.js` - rotas REST
  - [ ] Garantir arquivos <100 linhas
  - [ ] README do módulo

### Testes
- [ ] Configurar framework de testes (mocha/chai ou jest)
- [ ] Testes unitários domain (Task)
- [ ] Testes unitários application (use cases)
- [ ] Testes de integração HTTP (rotas)
- [ ] Alvo `make test` no Makefile
- [ ] Coverage mínimo 80%

### Documentação
- [ ] Atualizar README principal com novo módulo
- [ ] Exemplos de uso no COMANDOS.md

---

## 🔮 v0.4.0 - Persistência + CI/CD
**Objetivo:** Adicionar banco de dados e automação de testes

### Persistência
- [ ] Adicionar PostgreSQL ao docker-compose
- [ ] `infra/tasks/postgres_task_repository.js`
- [ ] Migrations (script ou Knex.js)
- [ ] Variáveis de ambiente para config DB

### CI/CD
- [ ] GitHub Actions ou GitLab CI
  - [ ] Rodar testes em cada push
  - [ ] Lint/quality checks
  - [ ] Build de imagens Docker
- [ ] Pre-commit hooks (lint, format)
- [ ] Badge de status no README

### DevOps
- [ ] Health checks detalhados (DB connection)
- [ ] Logs estruturados (pino ou winston)
- [ ] Métricas básicas (Prometheus/Grafana - opcional)

---

## 🤖 v0.5.0 - LLM Local (Ollama) + API
**Objetivo:** Integrar LLM local (Qwen2.5 ou Llama 3.1) via Ollama

### Infraestrutura LLM
- [ ] Adicionar Ollama ao docker-compose.dev.yml
- [ ] Script pull modelo (Qwen2.5:7b ou Llama3.1:8b)
- [ ] Configurar volume para modelos

### Backend
- [ ] Módulo `llm`
  - [ ] `infra/llm/ollama_client.js` - client HTTP para Ollama
  - [ ] `application/llm/generate_text.js` - use case
  - [ ] `interfaces/http/routes/llm.js` - endpoint `/api/llm/generate`
- [ ] Rate limiting (evitar abuse)
- [ ] Streaming de respostas (SSE ou WebSocket)

### Frontend Básico
- [ ] Página HTML+JS simples para testar chat
- [ ] Interface de prompt/resposta
- [ ] Histórico de conversas (opcional)

---

## 📚 v0.6.0 - RAG (Retrieval-Augmented Generation)
**Objetivo:** Permitir que o LLM use "seus arquivos" como contexto

### Vector Store
- [ ] Adicionar Qdrant ou ChromaDB (vector database)
- [ ] Script de ingestão de documentos (.txt, .md, .pdf)
- [ ] Embeddings (OpenAI ada-002 ou modelo local via Ollama)

### RAG Pipeline
- [ ] Módulo `rag`
  - [ ] `application/rag/ingest_document.js` - chunking + embed + store
  - [ ] `application/rag/search_context.js` - semantic search
  - [ ] `application/rag/generate_answer.js` - retrieve + prompt + LLM
  - [ ] Endpoint `/api/rag/ask` (pergunta + contexto)

### Fine-tuning (planejamento)
- [ ] Documentar processo LoRA/QLoRA
- [ ] Script de conversão HF -> GGUF -> Ollama
- [ ] Guia de fine-tuning em GPU cloud (opcional)

---

## 🔐 v0.7.0 - Autenticação + Multi-tenancy
**Objetivo:** Adicionar usuários e isolamento de dados

### Auth
- [ ] JWT ou sessões (express-session)
- [ ] Registro/login/logout
- [ ] Middleware de autenticação
- [ ] Roles básicos (admin/user)

### Multi-tenancy
- [ ] Modelo `User` e `Workspace`
- [ ] Filtros por tenant_id em repositórios
- [ ] Migrations para ACLs

### Frontend
- [ ] Tela de login/registro
- [ ] Proteção de rotas

---

## 🌐 v0.8.0 - Frontend Moderno (React/Vue) + UX
**Objetivo:** Interface profissional

### Frontend Framework
- [ ] Setup Vite + React (ou Vue/Svelte)
- [ ] Componentes reutilizáveis
- [ ] Design system básico (Tailwind CSS)
- [ ] Estado global (Zustand/Pinia)

### Features UI
- [ ] Dashboard principal
- [ ] Chat com LLM (interface rica)
- [ ] Upload/gestão de documentos (RAG)
- [ ] Gestão de tarefas (CRUD visual)

### Mobile-friendly
- [ ] Design responsivo
- [ ] PWA (Progressive Web App)

---

## 🚀 v1.0.0 - Produção Ready
**Objetivo:** Sistema completo, documentado e escalável

### Produção
- [ ] Testes E2E (Playwright/Cypress)
- [ ] Monitoring (Sentry, Datadog ou similar)
- [ ] Backup automático DB
- [ ] CDN para assets estáticos
- [ ] Rate limiting global (Traefik/Redis)

### Documentação
- [ ] API docs (Swagger/OpenAPI)
- [ ] Guia de contribuição
- [ ] Vídeos/tutoriais
- [ ] Changelog completo

### Performance
- [ ] Cache (Redis) para queries frequentes
- [ ] Otimização de queries DB
- [ ] Lazy loading no frontend
- [ ] Compressão de assets

---

## 🔮 Futuro (v1.1+)
- [ ] Agents autônomos (multi-step reasoning)
- [ ] Plugins/extensões de terceiros
- [ ] Marketplace de modelos fine-tunados
- [ ] API pública para desenvolvedores
- [ ] Webhooks e integrações (Slack, Discord, Zapier)
- [ ] Mobile apps nativos (React Native/Flutter)
- [ ] Suporte a múltiplos LLMs (OpenAI, Anthropic, local)

---

## Prioridades Imediatas (Próximos Passos)

### Opção A: Foco em Produto (MVP rápido)
1. v0.3.0 - Módulo exemplo + testes
2. v0.5.0 - LLM (pular DB por enquanto, usar in-memory)
3. v0.6.0 - RAG básico
4. v0.7.0 - Auth simples
5. v0.8.0 - Frontend

### Opção B: Foco em Fundação (qualidade/escalabilidade)
1. v0.3.0 - Módulo exemplo + testes
2. v0.4.0 - PostgreSQL + CI/CD
3. v0.5.0 - LLM
4. v0.6.0 - RAG
5. v0.7.0 - Auth + multi-tenancy
6. v0.8.0 - Frontend

### Opção C: Foco em LLM (sua prioridade mencionada)
1. v0.5.0 - Ollama + API básica (pular módulo exemplo por enquanto)
2. v0.6.0 - RAG (seus arquivos)
3. v0.3.0 - Módulo exemplo + testes (depois)
4. v0.8.0 - Frontend para chat
5. v0.4.0 - DB + CI/CD (estabilizar)

---

## ✅ Decisão: Plano Custom - MVP Chat Interativo
**Objetivo:** Chat funcional com armazenamento total de conversas para fine-tuning + preparação de auth em níveis

### v0.3.0 - DB + Modelo Conversations (PRÓXIMO)
- [ ] PostgreSQL no docker-compose
- [ ] Migrations básicas
- [ ] Módulo `conversations`
  - [ ] `domain/conversations/conversation.js` - entidade
  - [ ] `domain/conversations/message.js` - entidade
  - [ ] `infra/conversations/postgres_repository.js`
  - [ ] Schema: conversations(id, user_id, created_at) + messages(id, conversation_id, role, content, timestamp)
- [ ] Preparar campo `user_id` (null por enquanto, para auth futura)

### v0.4.0 - Ollama + LLM + Chat API (DEPOIS)
- [ ] Ollama no docker-compose.dev.yml
- [ ] Script pull Qwen2.5:7b ou Llama3.1:8b
- [ ] Módulo `llm`
  - [ ] `infra/llm/ollama_client.js`
  - [ ] `application/llm/chat.js` - use case (+ salvar conversas)
  - [ ] `interfaces/http/routes/chat.js` - POST /api/chat
- [ ] Streaming SSE (opcional)
- [ ] Frontend HTML/JS básico para chat

### v0.5.0 - Export Fine-tuning + Frontend Melhorado (DEPOIS)
- [ ] Endpoint GET `/api/conversations/export` (JSONL para fine-tuning)
- [ ] Filtros (data, user_id, etc)
- [ ] Frontend melhorado (histórico, nova conversa, etc)
- [ ] Documentação de fine-tuning (LoRA/QLoRA)

### v0.6.0 - Autenticação Multi-nível (DEPOIS)
- [ ] Modelo `User` + roles (guest, user, advanced, admin)
- [ ] JWT ou sessões
- [ ] Middleware de autenticação
- [ ] ACL por role:
  - `guest`: apenas leitura, conversas limitadas
  - `user`: CRUD próprias conversas
  - `advanced`: acesso a modelos avançados, mais tokens
  - `admin`: gestão de usuários, export completo
- [ ] Associar `user_id` em conversas
- [ ] Frontend: login/registro

### v0.7.0+ - RAG, Testes, Produção
- [ ] RAG com seus arquivos (quando necessário)
- [ ] Testes automatizados
- [ ] CI/CD
- [ ] Monitoring

