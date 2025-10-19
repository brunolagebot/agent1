# REGRAS GERAIS DO PROJETO (SAAS)
## Objetivo
- SaaS modular, auditável e barato em tokens. A IA deve obedecer a estas regras. Em conflito, pergunte.
## Arquitetura & Módulos
- PROIBIDO arquivo >100 linhas. Se passar, quebre.
- Cada módulo: README próprio (propósito, API, exemplos de uso, erros).
- Atualize o README principal a cada novo módulo/alteração de API.
- Camadas: domain (regras puras) / application (use-cases) / interfaces (http/cli/jobs) / infra (db/cache/fila).
