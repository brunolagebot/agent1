# Visão Computacional - Agente Visual

## Objetivo
Implementar o **Agente Visual** como parte do sistema multiagentes, especializado em análise de imagens com detecção de objetos, pessoas e reconhecimento facial.

## Arquitetura Multiagentes
O Agente Visual será um dos 4 agentes especializados:
- ✅ **Agente Textual** (v0.5.2) - Documentos PDF/TXT
- 🚧 **Agente Numérico** (v0.6.0) - Planilhas e cálculos
- 🔮 **Agente Visual** (v0.7.0) - Análise de imagens
- 🔮 **Agente de Monitoramento** (v0.8.0) - Reconhecimento facial

## Escopo do Agente Visual (v0.7.0)

### 1. Modelo de Visão
**Opções para Apple Silicon (M4):**
- **LLaVA 1.6** (Llama + CLIP) - melhor para chat multimodal
- **BakLLaVA** (Mistral + visual) - mais leve
- **Qwen-VL** - nativo da família Qwen

**Recomendado**: LLaVA 1.6 13B (via Ollama)
```bash
ollama pull llava:13b-v1.6-q4_K_M
```

### 2. Detecção de Objetos/Pessoas
**YOLO v8/v9** (via ultralytics):
- Detecção em tempo real
- 80 classes (pessoa, carro, animal, etc)
- Roda em GPU/CPU

### 3. Reconhecimento Facial
**DeepFace** ou **InsightFace**:
- Embedding de faces (512D)
- Similaridade coseno para matching
- Armazenar em pgvector

### 4. Arquitetura Proposta

#### Domain
- `vision/image.js` - Entidade Image
- `vision/detected_object.js` - Objeto detectado
- `vision/face.js` - Face detectada

#### Infra
- `vision/llava_client.js` - Cliente LLaVA (Ollama)
- `vision/yolo_detector.js` - Wrapper YOLO
- `vision/face_recognizer.js` - Reconhecimento facial
- `vision/postgres_faces_repository.js` - Banco de faces

#### Migrations
```sql
CREATE TABLE images (
  id UUID PRIMARY KEY,
  filename VARCHAR(255),
  file_path TEXT,
  uploaded_at TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE
);

CREATE TABLE detected_objects (
  id UUID PRIMARY KEY,
  image_id UUID REFERENCES images(id),
  class VARCHAR(50),
  confidence FLOAT,
  bbox JSONB,
  created_at TIMESTAMP
);

CREATE TABLE faces (
  id UUID PRIMARY KEY,
  person_id UUID,
  image_id UUID REFERENCES images(id),
  embedding vector(512),
  bbox JSONB,
  confidence FLOAT,
  metadata JSONB,
  created_at TIMESTAMP
);

CREATE INDEX idx_faces_embedding ON faces USING ivfflat (embedding vector_cosine_ops);
```

### 5. APIs Planejadas

#### Upload e Análise
```bash
POST /api/vision/analyze
FormData: image=foto.jpg

Response:
{
  "imageId": "...",
  "objects": [
    {"class": "person", "confidence": 0.95, "bbox": {...}},
    {"class": "car", "confidence": 0.89, "bbox": {...}}
  ],
  "faces": [
    {"personId": "john-123", "confidence": 0.92, "match": "João Silva"},
    {"personId": null, "confidence": 0.88, "match": "Unknown"}
  ],
  "description": "Imagem mostra 2 pessoas próximas a um carro..."
}
```

#### Registrar Face
```bash
POST /api/vision/faces/register
Body: {"imageId": "...", "personName": "João Silva", "faceIndex": 0}
```

#### Buscar por Face
```bash
POST /api/vision/faces/search
FormData: image=query.jpg

Response:
{
  "matches": [
    {"personId": "...", "name": "João Silva", "similarity": 0.94},
    {"personId": "...", "name": "Maria Santos", "similarity": 0.87}
  ]
}
```

#### Monitoramento
```bash
GET /api/vision/events?personId=...&from=2025-10-19

Response:
{
  "events": [
    {
      "timestamp": "2025-10-19T10:30:00Z",
      "imageId": "...",
      "personId": "...",
      "location": "Câmera 1",
      "confidence": 0.93
    }
  ]
}
```

### 6. Frontend

**Interface de Upload de Imagem:**
- Drag & drop de imagens
- Preview com bounding boxes
- Lista de objetos detectados
- Galeria de faces

**Dashboard de Monitoramento:**
- Timeline de eventos
- Alertas de pessoa específica
- Estatísticas (quantas vezes apareceu)

### 7. Dependências

```json
{
  "dependencies": {
    "@xenova/transformers": "^2.10.0",  // CLIP embeddings
    "sharp": "^0.33.0",                  // Processamento de imagem
    "canvas": "^2.11.2"                  // Drawing bboxes
  }
}
```

Python (opcional, via microserviço):
```bash
pip install ultralytics insightface onnxruntime
```

### 8. Considerações de Privacidade

⚠️ **IMPORTANTE - LGPD/GDPR:**
- Consentimento explícito para armazenar faces
- Criptografia de embeddings faciais
- Direito ao esquecimento (delete cascade)
- Logs de acesso a dados biométricos
- Retenção limitada (ex: 90 dias)

### 9. Performance

**Estimativas M4 Pro/Max:**
- LLaVA 13B: ~20-30s por imagem (descrição completa)
- YOLO v8: ~100-200ms por imagem (detecção)
- Face recognition: ~50-100ms por face

**Otimizações:**
- Batch processing para múltiplas imagens
- Cache de embeddings
- Thumbnail para preview rápido

### 10. Implementação Gradual

**Fase 1 (v0.6.0)**: Descrição de imagem com LLaVA
```bash
POST /api/vision/describe
FormData: image=foto.jpg
```

**Fase 2 (v0.7.0)**: Detecção de objetos (YOLO)

**Fase 3 (v0.8.0)**: Reconhecimento facial + banco de faces

**Fase 4 (v0.9.0)**: Monitoramento em tempo real

## Status

- [ ] Implementar LLaVA para descrição de imagens
- [ ] Adicionar YOLO para detecção
- [ ] Implementar reconhecimento facial
- [ ] Criar banco de faces com pgvector
- [ ] Dashboard de monitoramento
- [ ] Sistema de alertas
- [ ] Compliance LGPD/GDPR

**Prioridade**: Após estabilizar Knowledge Base e fine-tuning

