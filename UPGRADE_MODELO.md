# Como Usar Modelos Maiores (14B, 32B)

## Problema Atual
Colima com 7GB RAM → Qwen2.5:14b precisa de ~10GB

## Solução: Aumentar RAM do Colima

### 1. Parar Colima
```bash
colima stop
```

### 2. Recriar com mais RAM e CPU
```bash
# Para Qwen 14B: 12GB RAM
colima start --cpu 6 --memory 12

# Para Qwen 32B ou Mixtral 8x7B: 20GB RAM
colima start --cpu 8 --memory 20
```

### 3. Reconfigurar contexto Docker
```bash
docker context use colima
```

### 4. Subir ambiente
```bash
cd /Users/lagebruno/Projetos/Agent1
make dev-up
```

### 5. Baixar modelo maior
```bash
# Qwen2.5:14b (~9GB)
docker exec agent1-ollama-1 ollama pull qwen2.5:14b-instruct-q4_K_M

# OU Mixtral 8x7B (~26GB, precisa 20GB RAM no Colima)
docker exec agent1-ollama-1 ollama pull mixtral:8x7b-instruct-v0.1-q4_K_M
```

### 6. Atualizar modelo default
Edite `apps/web/infra/llm/ollama_client.js`:
```javascript
const DEFAULT_MODEL = 'qwen2.5:14b-instruct-q4_K_M';
// ou
const DEFAULT_MODEL = 'mixtral:8x7b-instruct-v0.1-q4_K_M';
```

### 7. Rebuild e restart
```bash
make dev-build
docker compose -f docker-compose.dev.yml up -d web
```

## Recomendações

| Modelo | RAM Colima | CPU | Velocidade | Qualidade |
|--------|------------|-----|------------|-----------|
| Qwen 7B | 8GB | 4 | ⚡⚡⚡ | ⭐⭐⭐ |
| **Qwen 14B** | **12GB** | **6** | **⚡⚡** | **⭐⭐⭐⭐** |
| Qwen 32B | 20GB+ | 8 | ⚡ | ⭐⭐⭐⭐⭐ |
| Mixtral 8x7B | 20GB+ | 8 | ⚡⚡ | ⭐⭐⭐⭐⭐ |

## Status Atual
- ✅ Qwen2.5:7b - Funcionando (RAM atual: 7GB)
- ⏳ Qwen2.5:14b - Baixado, precisa mais RAM
- 📥 Para usar: siga passos acima

## Alternativa: Docker Desktop
Se preferir Docker Desktop ao invés de Colima:
1. Abra Docker Desktop
2. Settings → Resources
3. RAM: 12-20GB, CPU: 6-8 cores
4. Apply & Restart
5. `make dev-up`

