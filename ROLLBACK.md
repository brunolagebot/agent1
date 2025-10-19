# Guia de Rollback - Voltar para Versão Anterior

## Versões Disponíveis

### v0.5.0 (Atual) - Qwen 14b + Knowledge Base + Histórico
- Qwen2.5:14b (modelo robusto)
- Knowledge Base permanente
- Histórico lateral ChatGPT-style
- Feedback 5 níveis

### v0.4.0 - LLM + RAG + Logs
- Qwen2.5:7b (modelo leve)
- RAG com PDF/TXT
- Sistema de logs estruturado
- Interface moderna

### v0.2.0 - Estrutura Base
- Docker + Traefik
- Servidor HTTP básico
- Sem LLM

---

## Como Voltar para Versão Anterior

### 1. Ver tags disponíveis
```bash
git tag -l
```

### 2. Voltar para versão específica
```bash
# Opção A: Apenas visualizar (não muda arquivos)
git checkout v0.4.0

# Opção B: Criar branch a partir da tag
git checkout -b hotfix-v0.4.0 v0.4.0

# Opção C: Resetar main para tag (CUIDADO!)
git reset --hard v0.4.0
```

### 3. Rebuild e subir
```bash
# Parar ambiente atual
docker compose -f docker-compose.dev.yml down

# Rebuild com código da versão anterior
make dev-build

# Subir
make dev-up
```

### 4. Voltar para versão mais recente
```bash
# Voltar para main
git checkout main

# Ou puxar do GitHub
git pull origin main

# Rebuild
make dev-build
make dev-up
```

---

## Rollback Rápido (1 comando)

```bash
# Parar, voltar v0.4.0, rebuild, subir
docker compose -f docker-compose.dev.yml down && \
git checkout v0.4.0 && \
make dev-build && \
make dev-up
```

Para voltar ao atual:
```bash
git checkout main && make dev-build && make dev-up
```

---

## Backup Manual (Segurança Extra)

### Antes de grandes mudanças:
```bash
# 1. Criar tag de backup
git tag backup-$(date +%Y%m%d-%H%M%S)

# 2. Push
git push origin --tags

# 3. Backup do banco de dados
docker exec agent1-postgres-1 pg_dump -U agent1 agent1_dev > backup-db-$(date +%Y%m%d).sql

# 4. Backup dos volumes
docker run --rm -v agent1_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup-$(date +%Y%m%d).tar.gz /data
docker run --rm -v agent1_ollama_data:/data -v $(pwd):/backup alpine tar czf /backup/ollama-backup-$(date +%Y%m%d).tar.gz /data
```

---

## Restaurar Banco de Dados

```bash
# Se precisar restaurar DB
docker exec -i agent1-postgres-1 psql -U agent1 -d agent1_dev < backup-db-20251019.sql
```

---

## Ver Mudanças Entre Versões

```bash
# Comparar v0.4.0 com v0.5.0
git diff v0.4.0..v0.5.0

# Ver log detalhado
git log v0.4.0..v0.5.0 --oneline

# Ver arquivos modificados
git diff v0.4.0..v0.5.0 --name-status
```

---

## Dica: Testar Nova Versão Sem Afetar Produção

```bash
# 1. Clonar em outro diretório
git clone https://github.com/brunolagebot/agent1.git agent1-test
cd agent1-test

# 2. Testar versão específica
git checkout v0.5.0

# 3. Subir em porta diferente
# Editar docker-compose.dev.yml: mudar porta 80 para 8080

# 4. Testar
make dev-build && make dev-up
open http://localhost:8080
```

---

## Proteção contra Perda de Dados

### Backup Automático (opcional)
Crie um cron job:
```bash
# Editar crontab
crontab -e

# Adicionar (backup diário 3h da manhã)
0 3 * * * cd /Users/lagebruno/Projetos/Agent1 && docker exec agent1-postgres-1 pg_dump -U agent1 agent1_dev > ~/backups/agent1-$(date +\%Y\%m\%d).sql
```

### Antes de `git pull`
```bash
# Sempre crie tag de backup antes de atualizar
git tag backup-before-pull-$(date +%Y%m%d)
git pull origin main
```

---

## Emergência: Recuperar Tudo

Se algo der muito errado:

```bash
# 1. Clonar repositório fresco
git clone https://github.com/brunolagebot/agent1.git agent1-recovery

# 2. Ir para última versão estável
cd agent1-recovery
git checkout v0.4.0  # ou outra versão que funcionava

# 3. Subir
make dev-build
make dev-up

# 4. Restaurar backup do DB (se tiver)
docker exec -i agent1-postgres-1 psql -U agent1 -d agent1_dev < ~/backups/agent1-latest.sql
```

---

## Verificar Integridade

```bash
# Ver status do repositório
git status

# Ver commit atual
git log -1

# Ver tag atual
git describe --tags

# Verificar se está sincronizado com GitHub
git fetch origin
git status
```

---

**Resumo:** Com Git tags, você pode voltar para qualquer versão em segundos. Todos os commits estão no GitHub como backup.

