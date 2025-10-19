# Sistema de Versionamento - Agent1

## Como Funciona

### Versionamento Semântico (SemVer)
Usamos **MAJOR.MINOR.PATCH** (ex: v0.5.1):

- **MAJOR** (0.x.x): Mudanças incompatíveis, breaking changes
- **MINOR** (x.5.x): Novas funcionalidades, compatível
- **PATCH** (x.x.1): Correções de bugs, melhorias

### Onde a Versão é Registrada

#### 1. `package.json`
```json
{
  "version": "0.5.1"
}
```

#### 2. Git Tags
```bash
git tag -a v0.5.1 -m "Descrição da release"
git push origin --tags
```

#### 3. `CHANGELOG.md`
Histórico detalhado de mudanças por versão

#### 4. Commits
Mensagens seguem padrão:
```
feat: Nova funcionalidade
fix: Correção de bug
docs: Documentação
refactor: Refatoração
perf: Performance
```

---

## Histórico de Versões

### v0.5.1 (Atual) - 2025-10-19
- Telemetria detalhada com cronometragem
- Interface escura refinada
- Modo professor permanente
- Qwen2.5:14b

### v0.5.0 - 2025-10-19
- Knowledge Base permanente
- Histórico ChatGPT-style
- Qwen2.5:14b (upgrade)
- Colima 16GB RAM

### v0.4.0 - 2025-10-19
- LLM local (Qwen2.5:7b)
- RAG completo (PDF/TXT)
- Sistema de logs estruturado
- Feedback 5 níveis

### v0.2.0 - 2025-10-19
- Docker + Traefik
- Estrutura modular
- Deploy dev/prod

---

## Processo de Release

### 1. Desenvolver Feature
```bash
# Fazer mudanças
git add -A
git commit -m "feat: Nova funcionalidade X"
```

### 2. Atualizar Versão
```bash
# Editar package.json: incrementar versão
# Atualizar CHANGELOG.md: adicionar entry
git add package.json CHANGELOG.md
git commit -m "chore: Bump version to 0.6.0"
```

### 3. Criar Tag
```bash
git tag -a v0.6.0 -m "Release v0.6.0: Descrição"
```

### 4. Push
```bash
git push origin main --tags
```

### 5. GitHub Release (Opcional)
- Ir em https://github.com/brunolagebot/agent1/releases
- "Create new release" da tag
- Adicionar release notes do CHANGELOG

---

## Rollback para Versão Anterior

Ver `ROLLBACK.md` para detalhes completos.

```bash
# Listar versões
git tag -l

# Voltar para v0.4.0
git checkout v0.4.0
make dev-build
make dev-up

# Voltar para latest
git checkout main
make dev-build
make dev-up
```

---

## Docker Images - Versionamento

### Tags Atuais
- `agent1-web:dev` - Desenvolvimento (sempre latest)
- Para produção: usar tags semânticas

### Produção (Futuro)
```bash
# Build com tag de versão
docker build -t agent1-web:0.5.1 .
docker tag agent1-web:0.5.1 agent1-web:latest

# Push para registry
docker push registry.example.com/agent1-web:0.5.1
docker push registry.example.com/agent1-web:latest
```

### Limpeza de Builds Antigas
```bash
# Manual
docker system prune -a -f

# Ou no Makefile (adicionado)
make docker-clean
```

---

## Automatização (CI/CD Futuro)

### GitHub Actions (Planejado v0.7.0)
```yaml
# .github/workflows/release.yml
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker
        run: docker build -t agent1-web:${{ github.ref_name }} .
      - name: Push to Registry
        run: docker push ...
```

---

## Verificar Versão Atual

### Via Código
```javascript
const version = require('./package.json').version;
console.log(`Agent1 v${version}`);
```

### Via Git
```bash
git describe --tags --abbrev=0  # Última tag
git log -1 --oneline             # Último commit
```

### Via Interface
Agora aparece no header: **Agent1 v0.5.1**

---

## Boas Práticas

1. ✅ **Sempre atualizar CHANGELOG.md** antes de release
2. ✅ **Tags anotadas** (`git tag -a` não `git tag`)
3. ✅ **Push tags** junto com commits
4. ✅ **Mensagens descritivas** nos commits
5. ✅ **Testar** antes de criar tag
6. ✅ **Backup DB** antes de upgrade major

---

## Migração de Dados Entre Versões

### Dados Compatíveis (preservados)
- ✅ Conversas (PostgreSQL)
- ✅ Documentos (PostgreSQL + arquivos)
- ✅ Knowledge Base (PostgreSQL)
- ✅ Logs (arquivos JSON)
- ✅ Métricas de performance

### Atenção em Breaking Changes
- Migrations SQL são cumulativas (001 → 002 → 003...)
- Backup antes de `docker compose down -v`
- Volumes Docker preservam dados entre rebuilds

---

**Resumo:** Versionamento via Git tags + package.json + CHANGELOG. Todas versões no GitHub. Rollback fácil. Docker images limpas automaticamente.

