# Módulo: Conversations

**Propósito:** Gerenciar conversas (threads) entre usuário e assistente, com armazenamento de todas as mensagens para fine-tuning.

## Camadas

### Domain
- `conversation.js` - Entidade Conversation (thread)
- `message.js` - Entidade Message (user/assistant/system)

### Infra
- `postgres_conversations_repository.js` - Implementação PostgreSQL

### Application
- (futuro) `create_conversation.js`, `add_message.js`, etc.

## API do Repositório

### `createConversation(conversation)`
```javascript
const conv = Conversation.create({ userId: null, title: 'Nova conversa' });
const saved = await repo.createConversation(conv);
```

### `findConversationById(id)`
```javascript
const conv = await repo.findConversationById('uuid-here');
```

### `listConversations({ userId, limit, offset })`
```javascript
const conversations = await repo.listConversations({ limit: 10 });
```

### `addMessage(message)`
```javascript
const msg = Message.createUserMessage(conversationId, 'Olá!');
const saved = await repo.addMessage(msg);
```

### `getMessages(conversationId)`
```javascript
const messages = await repo.getMessages(conversationId);
```

### `deleteConversation(id)`
```javascript
await repo.deleteConversation(id);
```

## Schema (PostgreSQL)

### `conversations`
- `id` UUID PK
- `user_id` UUID (null por enquanto, para auth futura)
- `title` VARCHAR(255)
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### `messages`
- `id` UUID PK
- `conversation_id` UUID FK -> conversations(id)
- `role` VARCHAR(20) ('user', 'assistant', 'system')
- `content` TEXT
- `created_at` TIMESTAMP
- `metadata` JSONB (para fine-tuning: model, tokens, etc)

## Erros Possíveis
- `Error: Invalid role` - role deve ser 'user', 'assistant' ou 'system'
- `Error: Message content cannot be empty` - content vazio
- Query errors do PostgreSQL (connection, constraint violations)

## Exemplos de Uso

### Criar conversa e adicionar mensagens
```javascript
const { PostgresConversationsRepository } = require('./infra/conversations/postgres_conversations_repository');
const { Conversation } = require('./domain/conversations/conversation');
const { Message } = require('./domain/conversations/message');

const repo = new PostgresConversationsRepository();

// 1. Criar conversa
const conv = Conversation.create();
const saved = await repo.createConversation(conv);

// 2. Adicionar mensagem de usuário
const userMsg = Message.createUserMessage(saved.id, 'Como fazer deploy em Docker?');
await repo.addMessage(userMsg);

// 3. Adicionar resposta do assistente
const assistantMsg = Message.createAssistantMessage(saved.id, 'Para fazer deploy...');
await repo.addMessage(assistantMsg);

// 4. Buscar histórico
const messages = await repo.getMessages(saved.id);
console.log(messages);
```

## Preparação para Fine-tuning

Todas as mensagens são armazenadas com:
- `role` (user/assistant/system)
- `content` (texto)
- `metadata` (JSONB - pode incluir model, tokens, temperature, etc)

Formato de export (JSONL):
```jsonl
{"messages":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}
{"messages":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}
```

Ver endpoint `/api/conversations/export` (v0.5.0).

