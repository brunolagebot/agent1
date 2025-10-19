# Projeto SaaS Modular
Leia `RULES.md`.

## Requisitos

- Docker instalado
  - macOS: execute `scripts/bootstrap_macos.sh`
  - Download: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

Verifique a instalação:

```bash
docker --version
docker info
```

## Desenvolvimento (Docker + Traefik)

Pré-requisitos: Docker Desktop.

```bash
make dev-build   # constrói imagens (usa cache)
make dev-up      # sobe sem reconstruir
```

Acesse `http://web.localhost` (app) e `http://traefik.localhost` (dashboard).

## Produção (Docker + Traefik + Let's Encrypt)

Defina variáveis no ambiente:

```bash
export LETSENCRYPT_EMAIL=seu-email@dominio.com
export WEB_HOST=app.seu-dominio.com
```

Suba os serviços:

```bash
make prod-build  # constrói imagens de produção
make prod-up     # sobe sem reconstruir
```

### Evitar rebuilds desnecessários

- Use `make dev-up`/`make prod-up` para subir containers sem rebuild.
- Rode `make dev-build`/`make prod-build` apenas quando houver mudanças no código/Dockerfile.

Acesse `https://$WEB_HOST`.

## Acesso externo fora da rede principal

- DNS público apontando para o IP/NAT do balanceador (porta 80/443 liberadas), ou
- Solução de VPN/ZTNA como Twingate. Para Twingate:
  1. Crie um tenant e um Connector em uma VM com acesso ao host Docker.
  2. Publique um Resource apontando para o host/porta 443 do Traefik.
  3. Use o Client Twingate para acessar `https://$WEB_HOST` mesmo sem IP público.

### Snippet de Connector (Twingate)

```bash
docker run -d \
  --name twingate-connector \
  --restart=unless-stopped \
  --network host \
  -e TWINGATE_NETWORK="seu-tenant" \
  -e TWINGATE_ACCESS_TOKEN="<token>" \
  -e TWINGATE_REFRESH_TOKEN="<refresh>" \
  -e TWINGATE_LABEL_HOSTNAME="agent1-host" \
  twingate/connector:latest
```
  
Alternativas:
- WireGuard: configure um servidor WG e adicione o host Docker como peer.
- Cloudflare Tunnel: exponha a porta 443 do Traefik via túnel sem IP público.
