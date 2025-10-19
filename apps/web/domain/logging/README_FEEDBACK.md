# Sistema de Feedback e Melhoria Contínua

## Objetivo
Coletar feedback do usuário em 5 níveis para melhorar respostas do modelo através de fine-tuning.

## Como Funciona

### 1. Interface (5 Emojis)
Após cada resposta do assistente, aparecem 5 botões:
- 😞 (1 estrela) - Muito ruim
- 😕 (2 estrelas) - Ruim
- 😐 (3 estrelas) - Regular
- 🙂 (4 estrelas) - Bom
- 😍 (5 estrelas) - Excelente

### 2. Armazenamento
Feedback salvo em `messages.feedback_score`:
```sql
ALTER TABLE messages
ADD COLUMN feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
ADD COLUMN feedback_comment TEXT,
ADD COLUMN feedback_at TIMESTAMP;
```

### 3. Análise
View `feedback_analysis` agrega por score e role:
```sql
SELECT feedback_score, COUNT(*), AVG(response_length), user_role
FROM messages
WHERE role = 'assistant' AND feedback_score IS NOT NULL
GROUP BY feedback_score, user_role;
```

## APIs

### POST /api/messages/feedback
```bash
curl -X POST http://web.localhost/api/messages/feedback \
  -H "Content-Type: application/json" \
  -d '{"messageId": "msg-123", "score": 5, "comment": "Ótima resposta!"}'
```

### GET /api/messages/feedback-stats
```bash
curl http://web.localhost/api/messages/feedback-stats
```

## Uso para Fine-tuning

### 1. Exportar conversas com alto score
```sql
SELECT c.id, m.content, m.feedback_score
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE m.feedback_score >= 4
  AND c.approved_for_training = TRUE
ORDER BY m.feedback_score DESC, c.updated_at DESC;
```

### 2. Priorizar no dataset
```python
# Exemplo: ponderar por feedback
import json

with open('training.jsonl') as f:
    data = []
    for line in f:
        conv = json.loads(line)
        # Duplicar conversas de alta qualidade
        if conv.get('avg_score', 0) >= 4:
            data.extend([conv] * 2)  # 2x weight
        else:
            data.append(conv)

# Salvar dataset ponderado
with open('training_weighted.jsonl', 'w') as f:
    for item in data:
        f.write(json.dumps(item) + '\n')
```

### 3. Filtrar ruins
Conversas com média de feedback < 2 podem ser excluídas ou revisadas antes do treino.

## Barra de Progresso

### Estados Visuais
Durante processamento de mensagem, mostra:
1. **20%** - 🔍 Buscando contexto em documentos
2. **50%** - 🤖 Gerando resposta (LLM processando)
3. **80%** - ✨ Finalizando
4. **100%** - ✅ Pronto!

Durante upload de documento:
1. 📄 Lendo arquivo
2. ✂️ Dividindo em chunks
3. 🧠 Gerando embeddings
4. ✅ Processado (N chunks)

## Benefícios

1. **Melhoria Contínua**: Modelo aprende com feedback real
2. **Priorização**: Treinar com exemplos de alta qualidade
3. **Detecção de Problemas**: Identificar tipos de pergunta que funcionam mal
4. **UX Transparente**: Usuário vê o que está acontecendo
5. **Timeout Aumentado**: 60s para respostas complexas

## Próximos Passos

- [ ] Comentários textuais no feedback (além do score)
- [ ] Dashboard de analytics de feedback
- [ ] A/B testing de prompts baseado em feedback
- [ ] Alertas automáticos para score médio < 3

