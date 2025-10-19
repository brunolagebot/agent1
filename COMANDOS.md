# Comandos e Instruções

## Setup Inicial (macOS)

### 1. Instalar Docker
```bash
# Executa bootstrap: instala Homebrew, Docker Desktop ou Colima
scripts/bootstrap_macos.sh
```

### 2. Validar Docker
```bash
docker --version
docker info | head -20
docker ps
```

### 3. Corrigir credenciais/plugin (se necessário)
```bash
# Configura plugin path do docker compose
python3 scripts/fix_docker_compose_plugin.py

# Remove helpers de credencial inválidos
python3 scripts/fix_docker_credentials.py
```

## Desenvolvimento

### Build e Up (primeira vez ou após mudanças)
```bash
# Constrói imagens (usa cache)
make dev-build

# Sobe stack em background
make dev-up
```

### Up rápido (sem rebuild)
```bash
# Apenas sobe containers já construídos
make dev-up
```

### Testar endpoints
```bash
# Healthcheck
curl -s http://web.localhost/healthz

# Hello-world com parâmetro
curl -s "http://web.localhost/hello?name=Bruno"

# Página inicial
curl -s http://web.localhost/

# Dashboard do Traefik
open http://traefik.localhost
```

### Ver logs
```bash
# Todos os serviços
docker compose -f docker-compose.dev.yml logs -f

# Apenas web
docker compose -f docker-compose.dev.yml logs -f web

# Apenas traefik
docker compose -f docker-compose.dev.yml logs -f traefik
```

### Parar ambiente
```bash
# Para containers mas mantém volumes
docker compose -f docker-compose.dev.yml stop

# Para e remove containers (mantém volumes)
docker compose -f docker-compose.dev.yml down

# Para, remove containers e volumes
docker compose -f docker-compose.dev.yml down -v
```

### Reconstruir do zero
```bash
# Remove tudo e reconstrói
docker compose -f docker-compose.dev.yml down -v
make dev-build
make dev-up
```

## Produção

### Configurar variáveis de ambiente
```bash
# Email para Let's Encrypt (certificados TLS)
export LETSENCRYPT_EMAIL=seu-email@dominio.com

# Domínio público da aplicação
export WEB_HOST=app.seu-dominio.com
```

### Build e Deploy
```bash
# Constrói imagens de produção
make prod-build

# Sobe em produção (background com restart automático)
make prod-up
```

### Ver logs em produção
```bash
docker compose -f docker-compose.prod.yml logs -f web
```

### Parar produção
```bash
docker compose -f docker-compose.prod.yml down
```

## Acesso Remoto (fora da rede local)

### Opção 1: DNS Público
1. Configure DNS apontando para IP público do servidor
2. Libere portas 80/443 no firewall/NAT
3. Acesse via `https://$WEB_HOST`

### Opção 2: Twingate (ZTNA)
```bash
# Instalar connector no host Docker
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

Depois:
1. Crie um Resource no Twingate apontando para `localhost:443`
2. Instale o Client Twingate na máquina de acesso
3. Acesse `https://$WEB_HOST` mesmo sem IP público

### Opção 3: Cloudflare Tunnel
```bash
# Instalar cloudflared
brew install cloudflare/cloudflare/cloudflared

# Autenticar
cloudflared tunnel login

# Criar túnel
cloudflared tunnel create agent1

# Expor porta 443
cloudflared tunnel route dns agent1 app.seu-dominio.com
cloudflared tunnel run --url https://localhost:443 agent1
```

### Opção 4: WireGuard VPN
1. Configure servidor WireGuard
2. Adicione o host Docker como peer
3. Acesse via IP privado da VPN

## Quality Assurance

### Rodar pre-commit hooks
```bash
make qa
```

## Comandos Docker úteis

### Ver containers rodando
```bash
docker ps
```

### Ver todas as imagens
```bash
docker images
```

### Entrar no container web
```bash
docker exec -it agent1-web-1 sh
```

### Limpar imagens/containers órfãos
```bash
# Remove containers parados
docker container prune -f

# Remove imagens não usadas
docker image prune -a -f

# Remove tudo (cuidado!)
docker system prune -a --volumes -f
```

### Verificar uso de recursos
```bash
docker stats
```

## Estrutura do Projeto

```
Agent1/
├── apps/web/              # Aplicação web modular
│   ├── domain/            # Regras de negócio puras
│   ├── application/       # Casos de uso (use-cases)
│   ├── interfaces/http/   # Servidor HTTP (Node.js)
│   └── infra/             # DB, cache, fila (futuro)
├── deploy/traefik/        # Configuração Traefik (proxy reverso)
├── scripts/               # Scripts de setup e automação
├── docker-compose.dev.yml # Stack desenvolvimento
├── docker-compose.prod.yml# Stack produção
├── Dockerfile             # Imagem da aplicação
├── Makefile               # Comandos make
├── RULES.md               # Regras de arquitetura
└── COMANDOS.md            # Este arquivo
```

## Troubleshooting

### Erro: "permission denied" ao executar scripts
```bash
chmod +x scripts/*.sh
```

### Erro: "docker compose" não encontrado
```bash
# Instalar docker-compose via Homebrew
brew install docker-compose

# Configurar plugin path
python3 scripts/fix_docker_compose_plugin.py
```

### Erro: "docker daemon indisponível"
```bash
# Colima
colima start

# Ou Docker Desktop
open -a Docker
```

### Porta 80/443 já em uso
```bash
# Ver processos usando portas
sudo lsof -i :80
sudo lsof -i :443

# Parar serviços conflitantes ou alterar portas no docker-compose
```

### Containers não iniciam
```bash
# Ver logs de erro
docker compose -f docker-compose.dev.yml logs

# Reconstruir do zero
docker compose -f docker-compose.dev.yml down -v
docker system prune -f
make dev-build
make dev-up
```

## Referências

- [Docker Compose](https://docs.docker.com/compose/)
- [Traefik](https://doc.traefik.io/traefik/)
- [Twingate](https://docs.twingate.com/)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

