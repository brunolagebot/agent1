# 🏗️ Arquitetura Multiagentes - Agent1

## Visão Geral

O Agent1 evoluiu para um **sistema multiagentes especializados**, onde cada agente possui expertise específica e trabalha em conjunto para fornecer respostas precisas e contextualizadas.

## 🤖 Agentes Especializados

### 1. **Agente Textual** 📄
**Especialidade:** Análise e processamento de documentos textuais

**Responsabilidades:**
- Análise de documentos PDF/TXT
- Extração de informações textuais
- Geração de QA pairs para fine-tuning
- Busca semântica em conteúdo textual
- Respostas baseadas em documentos

**Tecnologias:**
- RAG (Retrieval-Augmented Generation)
- Embeddings semânticos (pgvector)
- Chunking inteligente de documentos
- Fine-tuning com conteúdo textual

**APIs:**
```bash
POST /api/text/analyze          # Análise de documento
POST /api/text/search           # Busca semântica
POST /api/text/generate-qa      # Geração de QA pairs
```

### 2. **Agente Numérico** 📊
**Especialidade:** Cálculos, análise de dados e planilhas

**Responsabilidades:**
- Processamento de planilhas (CSV, XLSX, XLS)
- Análise estatística e matemática
- Cálculos complexos baseados em parâmetros
- Geração de insights numéricos
- Visualização de dados

**Tecnologias:**
- Parser de planilhas (csv-parse, xlsx)
- Análise estatística
- Cálculos matemáticos
- Geração de QA específicos para dados numéricos

**APIs:**
```bash
POST /api/numeric/analyze-sheet # Análise de planilha
POST /api/numeric/calculate     # Cálculos matemáticos
POST /api/numeric/statistics    # Análise estatística
POST /api/numeric/visualize     # Visualização de dados
```

### 3. **Agente Visual** 🖼️
**Especialidade:** Identificação e análise de objetos em imagens

**Responsabilidades:**
- Detecção de objetos em imagens
- Classificação de objetos
- Análise de cenas e contextos visuais
- Descrição de imagens
- Análise de qualidade visual

**Tecnologias:**
- YOLO v8/v9 (detecção de objetos)
- LLaVA 1.6 (análise multimodal)
- CLIP (embeddings visuais)
- OpenCV (processamento de imagem)

**APIs:**
```bash
POST /api/vision/detect-objects # Detecção de objetos
POST /api/vision/describe       # Descrição de imagem
POST /api/vision/classify       # Classificação visual
POST /api/vision/analyze-scene  # Análise de cena
```

### 4. **Agente de Monitoramento** 👥
**Especialidade:** Reconhecimento e monitoramento de pessoas

**Responsabilidades:**
- Reconhecimento facial
- Identificação de pessoas
- Monitoramento em tempo real
- Análise de comportamento
- Sistema de alertas

**Tecnologias:**
- DeepFace/InsightFace (reconhecimento facial)
- Embeddings faciais (512D)
- pgvector (armazenamento de faces)
- Sistema de alertas em tempo real

**APIs:**
```bash
POST /api/monitoring/register-face    # Registrar face
POST /api/monitoring/identify-person  # Identificar pessoa
POST /api/monitoring/search-faces     # Buscar faces
GET  /api/monitoring/events           # Eventos de monitoramento
POST /api/monitoring/alerts           # Sistema de alertas
```

## 🧠 Orquestrador Central

### **Agente Coordenador**
**Responsabilidade:** Roteamento inteligente e coordenação entre agentes

**Funcionalidades:**
- Análise da consulta do usuário
- Determinação do agente mais adequado
- Coordenação entre múltiplos agentes
- Agregação de resultados
- Resposta final contextualizada

**Fluxo de Decisão:**
```
1. Recebe consulta do usuário
2. Analisa tipo de conteúdo necessário
3. Identifica agente(s) especializado(s)
4. Coordena execução
5. Agrega resultados
6. Retorna resposta final
```

## 🔄 Fluxo de Trabalho

### **Cenário 1: Consulta Textual**
```
Usuário: "Qual é o endereço da empresa?"
↓
Coordenador: Identifica necessidade de busca textual
↓
Agente Textual: Busca em documentos
↓
Resposta: "O endereço está no documento X..."
```

### **Cenário 2: Consulta Numérica**
```
Usuário: "Calcule o total de vendas do mês"
↓
Coordenador: Identifica necessidade de cálculo
↓
Agente Numérico: Processa planilha de vendas
↓
Resposta: "Total: R$ 150.000,00"
```

### **Cenário 3: Consulta Visual**
```
Usuário: "O que há nesta imagem?"
↓
Coordenador: Identifica necessidade de análise visual
↓
Agente Visual: Analisa imagem
↓
Resposta: "A imagem mostra 2 pessoas e um carro..."
```

### **Cenário 4: Consulta de Monitoramento**
```
Usuário: "Quem está na câmera agora?"
↓
Coordenador: Identifica necessidade de reconhecimento
↓
Agente de Monitoramento: Analisa faces
↓
Resposta: "João Silva (95% confiança)"
```

## 🏗️ Arquitetura Técnica

### **Estrutura de Diretórios**
```
apps/web/
├── agents/
│   ├── textual/           # Agente Textual
│   ├── numeric/           # Agente Numérico
│   ├── visual/            # Agente Visual
│   ├── monitoring/        # Agente de Monitoramento
│   └── coordinator/       # Agente Coordenador
├── shared/
│   ├── llm/              # LLM compartilhado
│   ├── embeddings/       # Embeddings
│   └── database/         # Banco de dados
└── interfaces/
    ├── http/             # APIs REST
    └── websocket/        # Comunicação em tempo real
```

### **Comunicação Entre Agentes**
- **Síncrona:** APIs REST para consultas diretas
- **Assíncrona:** Message Queue para processamento em background
- **Compartilhada:** Banco de dados centralizado
- **Cache:** Redis para performance

## 📊 Banco de Dados

### **Tabelas Específicas por Agente**

#### **Agente Textual**
```sql
documents, document_chunks, knowledge_facts
```

#### **Agente Numérico**
```sql
spreadsheets, numeric_data, calculations, statistics
```

#### **Agente Visual**
```sql
images, detected_objects, visual_embeddings
```

#### **Agente de Monitoramento**
```sql
faces, persons, monitoring_events, alerts
```

## 🚀 Roadmap de Implementação

### **Fase 1 (v0.6.0)** - Agente Numérico
- [ ] Implementar processamento de planilhas
- [ ] APIs de cálculo e análise estatística
- [ ] Integração com Agente Textual

### **Fase 2 (v0.7.0)** - Agente Visual
- [ ] Implementar detecção de objetos
- [ ] APIs de análise de imagens
- [ ] Integração com YOLO e LLaVA

### **Fase 3 (v0.8.0)** - Agente de Monitoramento
- [ ] Implementar reconhecimento facial
- [ ] Sistema de monitoramento em tempo real
- [ ] APIs de identificação e alertas

### **Fase 4 (v0.9.0)** - Orquestração Avançada
- [ ] Agente Coordenador inteligente
- [ ] Comunicação assíncrona entre agentes
- [ ] Sistema de cache distribuído

## 🔧 Tecnologias por Agente

### **Agente Textual** (Atual)
- Node.js + PostgreSQL
- pgvector para embeddings
- Ollama (Qwen2.5:14b)

### **Agente Numérico** (Planejado)
- Node.js + Python (pandas, numpy)
- PostgreSQL para dados estruturados
- Chart.js para visualizações

### **Agente Visual** (Planejado)
- Python (ultralytics, transformers)
- Node.js para APIs
- Redis para cache de imagens

### **Agente de Monitoramento** (Planejado)
- Python (insightface, opencv)
- PostgreSQL + pgvector
- WebSocket para tempo real

## 📈 Benefícios da Arquitetura Multiagentes

1. **Especialização:** Cada agente é otimizado para sua área
2. **Escalabilidade:** Agentes podem ser escalados independentemente
3. **Manutenibilidade:** Código modular e separado por responsabilidade
4. **Performance:** Processamento paralelo e otimizado
5. **Flexibilidade:** Fácil adição de novos agentes especializados
6. **Confiabilidade:** Falha de um agente não afeta os outros

## 🎯 Casos de Uso

### **Empresarial**
- Análise de contratos (Agente Textual)
- Relatórios financeiros (Agente Numérico)
- Monitoramento de segurança (Agente de Monitoramento)

### **Educacional**
- Análise de documentos acadêmicos (Agente Textual)
- Cálculos matemáticos (Agente Numérico)
- Análise de imagens científicas (Agente Visual)

### **Industrial**
- Análise de manuais técnicos (Agente Textual)
- Controle de qualidade visual (Agente Visual)
- Monitoramento de pessoal (Agente de Monitoramento)

---

**Status:** Em desenvolvimento | **Versão Atual:** v0.5.2 (Agente Textual implementado)
