# 🚀 Início Rápido - Agent1 v0.5.1

## Para Ver Mudanças na Interface

**Se a interface parecer antiga após update:**

### macOS/Linux
```bash
# Hard refresh no navegador (limpa cache)
Cmd + Shift + R  (Safari/Chrome/Brave)
```

### Windows
```bash
Ctrl + Shift + R  (Chrome/Edge)
Ctrl + F5         (Firefox)
```

### Ou feche e reabra
```bash
# Fechar navegador completamente
# Reabrir e acessar
open http://web.localhost
```

---

## Iniciar Sistema

```bash
cd /Users/lagebruno/Projetos/Agent1

# Se primeira vez
scripts/bootstrap_macos.sh  # Instala Docker
make dev-build              # Build das imagens
make dev-up                 # Sobe containers
scripts/pull_model.sh       # Baixa Qwen 14b

# Próximas vezes (sistema já configurado)
make dev-up                 # Apenas sobe

# Acessar
open http://web.localhost
```

---

## Usar Interface

### Aba Chat (Padrão)
1. Digite mensagem
2. Veja telemetria em tempo real (8 etapas)
3. Aguarde resposta (~20-40s com Qwen 14b)
4. Avalie com emoji (😞-😍)
5. Histórico salvo automaticamente

### Aba Admin (Nova!)
1. Clique **"⚙️ Admin"** na sidebar
2. Botões disponíveis:
   - 📊 Ver Estatísticas
   - 🔍 Análise de Performance
   - 📥 Exportar para Treino
   - 🤖 Listar Modelos
   - 📖 Ver Versão

---

## Adicionar Dados Permanentes

```bash
# Via API
curl -X POST http://web.localhost/api/knowledge/add \
  -H "Content-Type: application/json" \
  -d '{
    "category": "pecuaria",
    "title": "Seu fato aqui",
    "content": "Descrição detalhada do fato",
    "autoVerify": true
  }'

# Via interface (futuro)
# Digite: "adicionar fato: ..."
```

---

## Exportar para Fine-tuning

### Via Interface
1. Clique "⚙️ Admin"
2. Clique "Exportar Conversas (Fine-tuning)"
3. Arquivo JSONL baixa automaticamente

### Via Terminal
```bash
curl http://web.localhost/api/admin/export > training.jsonl
```

---

## Troubleshooting

### Interface não atualiza
```bash
# Hard refresh
Cmd + Shift + R

# Ou rebuild forçado
docker compose -f docker-compose.dev.yml restart web
```

### Chat demora muito
- Normal: Qwen 14b leva 20-40s por resposta
- Veja telemetria para identificar etapa lenta
- Maioria do tempo: "Gerar resposta (LLM)"

### Erro ao enviar mensagem
```bash
# Ver logs
docker compose -f docker-compose.dev.yml logs web --tail=50

# Ver análise de logs
curl http://web.localhost/api/logs/analyze
```

### Voltar versão anterior
```bash
# Ver versões disponíveis
git tag -l

# Voltar para v0.4.0
git checkout v0.4.0
make dev-build
make dev-up
```

---

## Comandos Úteis

```bash
# Parar sistema
docker compose -f docker-compose.dev.yml down

# Reiniciar
make dev-up

# Limpar Docker
make docker-clean

# Ver logs
docker compose -f docker-compose.dev.yml logs -f web

# Análise de performance
curl http://web.localhost/api/logs/analyze
```

---

## Versão e Estado

```bash
# Ver versão
cat package.json | grep version

# Ver commit atual
git log -1 --oneline

# Ver tag
git describe --tags
```

---

**✅ Sistema funcionando. Recarregue navegador com Cmd+Shift+R para ver interface atualizada!**

