# App Web

Camadas:
- domain: regras de negócio puras
- application: orquestra casos de uso
- interfaces: HTTP (este app), CLI, jobs
- infra: acesso a db/cache/fila

## Rodando localmente (sem Docker)

Requer Node.js 18+.

```bash
node apps/web/interfaces/http/server.js
```

## Rotas
- GET `/` - página básica
- GET `/hello` - exemplo hello-world
- GET `/healthz` - healthcheck

