# Roadmap - Agent1 Sistema Multiagentes

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

---

## 🏗️ **NOVA ARQUITETURA: Sistema Multiagentes**

### ✅ v0.5.2 - Agente Textual (ATUAL)
**Status:** ✅ Implementado e Funcionando
- [x] **Agente Textual** - Especialista em documentos PDF/TXT
- [x] RAG com busca semântica
- [x] Knowledge Base permanente
- [x] Sistema de feedback e fine-tuning
- [x] Citação de fontes nas respostas
- [x] Interface administrativa

### 🚧 v0.6.0 - Agente Numérico
**Objetivo:** Especialista em cálculos e planilhas

#### Backend
- [ ] **Módulo `numeric`** - Agente especializado em dados numéricos
  - [ ] `domain/numeric/spreadsheet.js` - entidade Planilha
  - [ ] `domain/numeric/calculation.js` - entidade Cálculo
  - [ ] `application/numeric/analyze_sheet.js` - análise de planilhas
  - [ ] `application/numeric/calculate.js` - cálculos matemáticos
  - [ ] `application/numeric/statistics.js` - análise estatística
  - [ ] `infra/numeric/spreadsheet_parser.js` - parser CSV/XLSX
  - [ ] `infra/numeric/postgres_numeric_repository.js`
  - [ ] `interfaces/http/routes/numeric.js` - APIs REST

#### APIs
- [ ] `POST /api/numeric/analyze-sheet` - Análise de planilha
- [ ] `POST /api/numeric/calculate` - Cálculos matemáticos
- [ ] `POST /api/numeric/statistics` - Análise estatística
- [ ] `POST /api/numeric/visualize` - Visualização de dados

#### Frontend
- [ ] Interface para upload de planilhas
- [ ] Visualização de dados e gráficos
- [ ] Calculadora integrada

### 🔮 v0.7.0 - Agente Visual
**Objetivo:** Especialista em análise de imagens

#### Backend
- [ ] **Módulo `visual`** - Agente especializado em imagens
  - [ ] `domain/visual/image.js` - entidade Imagem
  - [ ] `domain/visual/detected_object.js` - entidade Objeto Detectado
  - [ ] `application/visual/detect_objects.js` - detecção de objetos
  - [ ] `application/visual/describe_image.js` - descrição de imagens
  - [ ] `infra/visual/yolo_detector.js` - YOLO v8/v9
  - [ ] `infra/visual/llava_client.js` - LLaVA 1.6
  - [ ] `infra/visual/postgres_visual_repository.js`

#### APIs
- [ ] `POST /api/visual/detect-objects` - Detecção de objetos
- [ ] `POST /api/visual/describe` - Descrição de imagem
- [ ] `POST /api/visual/classify` - Classificação visual
- [ ] `POST /api/visual/analyze-scene` - Análise de cena

#### Frontend
- [ ] Interface para upload de imagens
- [ ] Preview com bounding boxes
- [ ] Galeria de objetos detectados

### 🔮 v0.8.0 - Agente de Monitoramento
**Objetivo:** Especialista em reconhecimento e monitoramento de pessoas

#### Backend
- [ ] **Módulo `monitoring`** - Agente especializado em pessoas
  - [ ] `domain/monitoring/face.js` - entidade Face
  - [ ] `domain/monitoring/person.js` - entidade Pessoa
  - [ ] `domain/monitoring/event.js` - entidade Evento
  - [ ] `application/monitoring/register_face.js` - registro de faces
  - [ ] `application/monitoring/identify_person.js` - identificação
  - [ ] `application/monitoring/monitor_realtime.js` - monitoramento
  - [ ] `infra/monitoring/face_recognizer.js` - DeepFace/InsightFace
  - [ ] `infra/monitoring/postgres_monitoring_repository.js`

#### APIs
- [ ] `POST /api/monitoring/register-face` - Registrar face
- [ ] `POST /api/monitoring/identify-person` - Identificar pessoa
- [ ] `POST /api/monitoring/search-faces` - Buscar faces
- [ ] `GET /api/monitoring/events` - Eventos de monitoramento
- [ ] `POST /api/monitoring/alerts` - Sistema de alertas

#### Frontend
- [ ] Dashboard de monitoramento
- [ ] Timeline de eventos
- [ ] Sistema de alertas
- [ ] Galeria de pessoas conhecidas

### 🔮 v0.9.0 - Orquestrador Inteligente
**Objetivo:** Coordenação avançada entre agentes

#### Backend
- [ ] **Módulo `coordinator`** - Agente coordenador
  - [ ] `domain/coordinator/query_analyzer.js` - análise de consultas
  - [ ] `domain/coordinator/agent_router.js` - roteamento de agentes
  - [ ] `application/coordinator/route_query.js` - roteamento inteligente
  - [ ] `application/coordinator/aggregate_results.js` - agregação
  - [ ] `infra/coordinator/agent_communication.js` - comunicação

#### Funcionalidades
- [ ] Análise automática do tipo de consulta
- [ ] Roteamento inteligente para agente(s) adequado(s)
- [ ] Coordenação entre múltiplos agentes
- [ ] Agregação de resultados
- [ ] Cache distribuído entre agentes
- [ ] Comunicação assíncrona

#### Frontend
- [ ] Interface unificada para todos os agentes
- [ ] Indicadores de qual agente está processando
- [ ] Histórico de consultas multiagentes
- [ ] Dashboard de performance por agente

---

## 🎯 **Benefícios da Arquitetura Multiagentes**

1. **Especialização:** Cada agente otimizado para sua área específica
2. **Escalabilidade:** Agentes podem ser escalados independentemente
3. **Manutenibilidade:** Código modular e separado por responsabilidade
4. **Performance:** Processamento paralelo e otimizado
5. **Flexibilidade:** Fácil adição de novos agentes especializados
6. **Confiabilidade:** Falha de um agente não afeta os outros
7. **Evolução Gradual:** Implementação incremental sem quebrar funcionalidades existentes

### v0.7.0+ - RAG, Testes, Produção
- [ ] RAG com seus arquivos (quando necessário)
- [ ] Testes automatizados
- [ ] CI/CD
- [ ] Monitoring

