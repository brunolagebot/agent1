# Changelog

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
