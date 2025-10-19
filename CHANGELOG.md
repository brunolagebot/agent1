# Changelog

## [0.5.2] - 2025-10-19
### Adicionado
- **Sistema de Feedback Completo**
  - Botões de avaliação (😞-😍) abaixo de cada resposta do assistente
  - Avaliação de 1-5 pontos com feedback visual
  - Armazenamento de feedback no banco de dados
  - Atualização automática do status de fine-tuning
  - Interface responsiva com botões desabilitados após avaliação
- **Aba de Administração Avançada**
  - Monitor de fine-tuning em tempo real
  - Critérios automáticos: 50+ conversas, 200+ mensagens, 20+ feedbacks, média 3.5+
  - Status visual: 🔴 Precisa de mais dados, 🟡 Quase pronto, ✅ Pronto para Fine-tuning
  - Botões de administração: estatísticas, performance, export, modelos, upload, versão
  - Navegação por tabs entre Chat e Admin
- **Endpoints de Administração**
  - `/api/admin/models` - Lista modelos disponíveis no Ollama
  - `/api/admin/finetuning-status` - Status detalhado para fine-tuning
  - `/api/admin/export` - Exportação de dados de treino
  - `/api/messages/feedback` - Sistema de feedback de mensagens

### Modificado
- **LLM Otimizado para Respostas Objetivas**
  - Prompt do sistema atualizado para respostas concisas e diretas
  - Instruções claras para evitar textos desnecessários
  - Mantém contexto mas com foco na objetividade
- **Sistema de Mensagens Aprimorado**
  - Campo `messageId` retornado pelo chat para feedback
  - Campos de feedback incluídos na consulta de mensagens
  - Mapeamento completo de campos de feedback na API
  - Classe Message atualizada com campos de feedback
- **Interface de Chat Melhorada**
  - Sistema de feedback integrado na interface
  - Tabs para navegação entre Chat e Admin
  - Monitor de fine-tuning na sidebar de administração
  - Feedback visual aprimorado

### Corrigido
- Sistema de feedback não aparecia na interface
- Campos de feedback não eram retornados pela API
- Consulta de mensagens não incluía dados de feedback
- Endpoint de feedback usava parâmetros incorretos
- Status de fine-tuning não contabilizava feedbacks corretamente

## [0.5.1] - 2025-10-19
### Adicionado
- **Telemetria Detalhada em Tempo Real**
  - PerformanceTracker: rastreia 8 etapas do processamento
  - Cronometragem automática de cada stage
  - Tabela `performance_metrics`: armazena duração de operações
  - View `performance_analysis`: médias, p50, p95, min, max
  - Dados de performance acessíveis ao próprio modelo
  - Telemetry box: exibe etapas em tempo real na interface
  - Logs de performance para análise e otimização
- **Interface Escura Refinada**
  - Paleta: azul petróleo (#1a4d5e), verde escuro (#2d6a7a), cinza espacial (#0f2027)
  - Design minimalista com bordas sutis
  - Gradientes escuros e sombras profundas
  - Scrollbar customizada com cores escuras
  - Feedback visual aprimorado

### Modificado
- Modo professor permanente: seletor admin/usuário removido
- Todas conversas agora são automaticamente admin (treinamento)
- Timeout aumentado para 90 segundos
- Interface: histórico lateral + telemetria + cores escuras
- Qwen2.5:14b como modelo padrão (mais robusto)
- Colima: 16GB RAM + 6 CPUs

### Adicionado (Documentação)
- `ROLLBACK.md`: guia completo para voltar versões anteriores
- `UPGRADE_MODELO.md`: como usar modelos maiores
- `VISAO_COMPUTACIONAL.md`: roadmap análise de imagens + reconhecimento facial

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
