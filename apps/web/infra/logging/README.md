# Módulo: Logging

**Propósito:** Sistema de logging estruturado com análise automática de inconsistências.

## Estrutura

### Domain
- `log_entry.js` - Entidade LogEntry (debug/info/warn/error)

### Infra
- `logger.js` - Logger principal (cria por módulo)
- `file_writer.js` - Escrita em arquivos JSON com rotação por data
- `log_analyzer.js` - Análise automática de padrões de erro

## Uso

### Criar logger para um módulo
```javascript
const { createLogger } = require('./infra/logging/logger');
const logger = createLogger('meu-modulo');

logger.debug('Debug message', { key: 'value' });
logger.info('Info message', { userId: 123 });
logger.warn('Warning message', { resource: 'xyz' });
logger.error('Error message', { context }, errorObject);
```

### Formato dos logs

Logs são escritos em:
- `logs/debug-YYYY-MM-DD.log`
- `logs/info-YYYY-MM-DD.log`
- `logs/warn-YYYY-MM-DD.log`
- `logs/error-YYYY-MM-DD.log`

Formato JSON (um por linha):
```json
{
  "timestamp": "2025-10-19T17:46:04.957Z",
  "level": "info",
  "message": "Upload request started",
  "context": {"module": "routes/documents"},
  "error": null
}
```

## Análise Automática

### Endpoint
```bash
curl http://web.localhost/api/logs/analyze
```

Retorna:
- **patterns**: Erros recorrentes (≥3 ocorrências)
- **topErrors**: Erros mais frequentes
- **suggestions**: Sugestões automáticas de correção

### Sugestões Automáticas

O analisador detecta padrões comuns e sugere:
- Connection errors → Verificar serviços dependentes
- Timeouts → Ajustar configurações
- Not found → Verificar migrations/rotas
- Parse errors → Validar formato de dados

## APIs

### `GET /api/logs/analyze`
Analisa logs do dia atual e detecta inconsistências

### Response
```json
{
  "status": "ok",
  "date": "2025-10-19",
  "patterns": [
    {
      "severity": "high",
      "pattern": "routes/documents: Failed to parse PDF",
      "count": 5,
      "suggestion": "Verificar formato de request/response"
    }
  ],
  "topErrors": [...],
  "totalErrorGroups": 3
}
```

## Benefícios

1. **Debug Rápido**: Logs estruturados facilitam busca
2. **Detecção Automática**: Padrões de erro identificados sem intervenção
3. **Rotação Diária**: Arquivos organizados por data
4. **Contexto Rico**: Cada log inclui módulo e metadados
5. **Sugestões Inteligentes**: Sistema sugere correções

## Arquivos <100 linhas

✅ log_entry.js: 60 linhas
✅ logger.js: 42 linhas  
✅ file_writer.js: 52 linhas
✅ log_analyzer.js: 95 linhas

Todos os arquivos respeitam a regra de modularidade!

