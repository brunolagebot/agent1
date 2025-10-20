/**
 * Routes: /api/admin/*
 * Admin-only endpoints para gerenciar treinamento
 */

const { PostgresConversationsRepository } = require('../../../infra/conversations/postgres_conversations_repository');
const { PostgresDocumentsRepository } = require('../../../infra/documents/postgres_documents_repository');
const { PostgresKnowledgeRepository } = require('../../../infra/knowledge/postgres_knowledge_repository');
const { OllamaClient } = require('../../../infra/llm/ollama_client');
const { executeFineTuning } = require('../../../application/llm/finetuning');
const { getSummaryMetrics, exportMetrics } = require('../../../application/llm/qa_metrics_tracker');

const conversationsRepo = new PostgresConversationsRepository();
const documentsRepo = new PostgresDocumentsRepository();
const knowledgeRepo = new PostgresKnowledgeRepository();
const ollamaClient = new OllamaClient();

/**
 * POST /api/admin/approve
 * Body: { conversationId, approved }
 * Aprova ou reprova conversa para treinamento
 */
async function handleApproveRoute(req, res) {
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const { conversationId, approved = true } = JSON.parse(body || '{}');
      
      if (!conversationId) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'conversationId is required' }));
        return;
      }

      await conversationsRepo.approveForTraining(conversationId, approved);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', conversationId, approved }));
    } catch (error) {
      console.error('[admin/approve] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

/**
 * GET /api/admin/export
 * Exporta conversas aprovadas em formato JSONL para fine-tuning
 */
async function handleExportRoute(req, res) {
  try {
    const conversations = await conversationsRepo.listConversations({ approvedForTraining: true });
    const lines = [];

    for (const conv of conversations) {
      const messages = await conversationsRepo.getMessages(conv.id);
      
      // Formato para fine-tuning (compatível com OpenAI/Llama)
      const formattedMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      lines.push(JSON.stringify({ messages: formattedMessages }));
    }

    res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
    res.end(lines.join('\n') + '\n');
  } catch (error) {
    console.error('[admin/export] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * GET /api/admin/models
 * Lista modelos disponíveis no Ollama
 */
async function handleModelsRoute(req, res) {
  try {
    const models = await ollamaClient.listModels();
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ models }));
  } catch (error) {
    console.error('[admin/models] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * GET /api/admin/finetuning-status
 * Retorna status detalhado para fine-tuning
 */
async function handleFineTuningStatusRoute(req, res) {
  try {
    const conversations = await conversationsRepo.listConversations();
    const documents = await documentsRepo.listDocuments();
    const facts = await knowledgeRepo.listFacts();
    
    // Contar mensagens com feedback
    let totalMessages = 0;
    let feedbackCount = 0;
    let totalFeedbackScore = 0;
    
    for (const conv of conversations) {
      const messages = await conversationsRepo.getMessages(conv.id);
      totalMessages += messages.length;
      
      for (const msg of messages) {
        if (msg.feedback_score !== null && msg.feedback_score !== undefined) {
          feedbackCount++;
          totalFeedbackScore += msg.feedback_score;
        }
      }
    }
    
    const avgFeedback = feedbackCount > 0 ? (totalFeedbackScore / feedbackCount).toFixed(2) : '0.00';
    
    // Contar documentos processados
    const processedDocuments = documents.filter(doc => doc.processed).length;
    
    // Critérios para fine-tuning (mais flexíveis com documentos)
    const criteria = {
      conversations: { current: conversations.length, required: 10 },
      messages: { current: totalMessages, required: 50 },
      feedback: { current: feedbackCount, required: 5 },
      documents: { current: processedDocuments, required: 1 },
      avgFeedback: { current: parseFloat(avgFeedback), required: 3.0 }
    };
    
    // Fine-tuning disponível se:
    // 1. Tem conversas suficientes E feedback suficiente, OU
    // 2. Tem documentos processados (mesmo sem conversas)
    const hasConversationData = criteria.conversations.current >= criteria.conversations.required &&
                               criteria.messages.current >= criteria.messages.required &&
                               criteria.feedback.current >= criteria.feedback.required &&
                               criteria.avgFeedback.current >= criteria.avgFeedback.required;
    
    const hasDocumentData = criteria.documents.current >= criteria.documents.required;
    
    const isReady = hasConversationData || hasDocumentData;
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      isReady,
      criteria,
      stats: {
        conversations: conversations.length,
        messages: totalMessages,
        documents: documents.length,
        processedDocuments: processedDocuments,
        facts: facts.length,
        feedback: {
          count: feedbackCount,
          average: avgFeedback
        },
        dataSources: {
          hasConversationData,
          hasDocumentData
        }
      }
    }));
  } catch (error) {
    console.error('[admin/finetuning-status] Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * POST /api/admin/finetuning/start
 * Inicia processo de fine-tuning
 */
async function handleStartFineTuningRoute(req, res) {
  let body = '';
  
  req.on('data', (chunk) => { body += chunk; });
  
  req.on('end', async () => {
    try {
      const options = JSON.parse(body || '{}');
      
      // Executar fine-tuning usando o serviço
      const result = await executeFineTuning(options);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: 'Fine-tuning executado com sucesso',
        stats: result.stats,
        model: result.model.name,
        baseModel: result.model.baseModel,
        performance: result.model.performance,
        note: result.note
      }));
      
    } catch (error) {
      console.error('[admin/finetuning] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ 
        success: false,
        error: error.message 
      }));
    }
  });
}

/**
 * Router para /api/admin/*
 */
function handleAdminRoutes(url, req, res) {
  // TODO: adicionar middleware de autenticação (verificar se é admin)
  // Por enquanto, sem auth (apenas em dev)

  if (url === '/api/admin/approve' && req.method === 'POST') {
    return handleApproveRoute(req, res);
  }
  
  if (url === '/api/admin/export' && req.method === 'GET') {
    return handleExportRoute(req, res);
  }
  
  if (url === '/api/admin/models' && req.method === 'GET') {
    return handleModelsRoute(req, res);
  }
  
  if (url === '/api/admin/finetuning-status' && req.method === 'GET') {
    return handleFineTuningStatusRoute(req, res);
  }
  
  if (url === '/api/admin/finetuning/start' && req.method === 'POST') {
    return handleStartFineTuningRoute(req, res);
  }

  // Rotas de métricas de Q&A
  if (url === '/api/admin/qa-metrics' && req.method === 'GET') {
    return handleQAMetricsRoute(req, res);
  }
  
  if (url === '/api/admin/qa-metrics/export' && req.method === 'GET') {
    return handleQAMetricsExportRoute(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Route not found' }));
}

/**
 * GET /api/admin/qa-metrics
 * Obtém métricas de qualidade do Q&A
 */
async function handleQAMetricsRoute(req, res) {
  try {
    const metrics = getSummaryMetrics();
    
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      metrics
    }, null, 2));
  } catch (error) {
    console.error('Erro ao obter métricas de Q&A:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * GET /api/admin/qa-metrics/export
 * Exporta métricas detalhadas de Q&A
 */
async function handleQAMetricsExportRoute(req, res) {
  try {
    const metrics = exportMetrics();
    
    res.writeHead(200, { 
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="qa-metrics.json"'
    });
    res.end(JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error('Erro ao exportar métricas de Q&A:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

module.exports = { handleAdminRoutes };

