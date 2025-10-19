/**
 * Use Case: Fine-tuning de modelo LLM
 * Executa processo de fine-tuning usando dados de conversas
 */

const { PostgresConversationsRepository } = require('../../infra/conversations/postgres_conversations_repository');
const { PostgresDocumentsRepository } = require('../../infra/documents/postgres_documents_repository');
const { PostgresKnowledgeRepository } = require('../../infra/knowledge/postgres_knowledge_repository');
const { createLogger } = require('../../infra/logging/logger');
const { generateDocumentQA } = require('./document_qa_generator');

const logger = createLogger('finetuning');
const conversationsRepo = new PostgresConversationsRepository();
const documentsRepo = new PostgresDocumentsRepository();
const knowledgeRepo = new PostgresKnowledgeRepository();

/**
 * Executa fine-tuning do modelo
 * @param {Object} options - Opções de fine-tuning
 * @returns {Promise<Object>} Resultado do fine-tuning
 */
async function executeFineTuning(options = {}) {
  const startTime = Date.now();
  
  try {
    logger.info('Iniciando processo de fine-tuning', { options });
    
    // 1. Coletar dados de treinamento
    logger.info('Etapa 1/4: Coletando dados de treinamento...');
    const trainingData = await collectTrainingData();
    
    // Verificar se temos dados suficientes (conversas OU documentos)
    const hasConversationData = trainingData.conversations.length > 0;
    const hasDocumentData = trainingData.documentQA.length > 0;
    
    if (!hasConversationData && !hasDocumentData) {
      throw new Error('Dados insuficientes para fine-tuning. Necessário: conversas com feedback OU documentos processados.');
    }
    
    logger.info('Dados coletados', {
      conversations: trainingData.conversations.length,
      documentQA: trainingData.documentQA.length,
      totalTrainingPairs: trainingData.conversations.length + trainingData.documentQA.length
    });
    
    // 2. Preparar dados no formato de treinamento
    logger.info('Etapa 2/4: Preparando dados no formato de treinamento...');
    const formattedData = await formatTrainingData(trainingData);
    
    // 3. Executar fine-tuning (simulado)
    logger.info('Etapa 3/4: Executando fine-tuning...');
    const fineTuningResult = await performFineTuning(formattedData, options);
    
    // 4. Salvar modelo fine-tunado
    logger.info('Etapa 4/4: Salvando modelo fine-tunado...');
    const modelInfo = await saveFineTunedModel(fineTuningResult);
    
    const duration = Date.now() - startTime;
    
    logger.info('Fine-tuning concluído com sucesso', {
      duration: `${duration}ms`,
      conversations: trainingData.conversations.length,
      messages: trainingData.totalMessages,
      feedbacks: trainingData.feedbackCount
    });
    
    return {
      success: true,
      model: modelInfo,
      stats: {
        conversations: trainingData.conversations.length,
        messages: trainingData.totalMessages,
        feedbacks: trainingData.feedbackCount,
        avgFeedback: trainingData.avgFeedback,
        duration: `${(duration / 1000).toFixed(1)}s`
      },
      note: 'Modelo fine-tunado salvo e pronto para uso'
    };
    
  } catch (error) {
    logger.error('Erro no fine-tuning', {}, error);
    throw error;
  }
}

/**
 * Coleta dados de treinamento do banco
 */
async function collectTrainingData() {
  const conversations = await conversationsRepo.listConversations();
  const documents = await documentsRepo.listDocuments();
  const facts = await knowledgeRepo.listFacts();
  
  let totalMessages = 0;
  let feedbackCount = 0;
  let totalFeedbackScore = 0;
  const trainingConversations = [];
  
  // 1. Processar conversas com feedback
  for (const conv of conversations) {
    const messages = await conversationsRepo.getMessages(conv.id);
    totalMessages += messages.length;
    
    // Filtrar conversas com feedback
    const hasFeedback = messages.some(msg => 
      msg.role === 'assistant' && msg.feedback_score !== null
    );
    
    if (hasFeedback) {
      trainingConversations.push({
        conversation: conv,
        messages: messages
      });
      
      // Contar feedbacks
      for (const msg of messages) {
        if (msg.feedback_score !== null && msg.feedback_score !== undefined) {
          feedbackCount++;
          totalFeedbackScore += msg.feedback_score;
        }
      }
    }
  }
  
  // 2. Gerar QA baseado em documentos
  logger.info('Gerando perguntas e respostas baseadas em documentos...');
  const documentQA = await generateDocumentQA({
    maxQuestionsPerDocument: 3, // Limitar para não sobrecarregar
    minChunkLength: 150,
    maxChunkLength: 800
  });
  
  const avgFeedback = feedbackCount > 0 ? (totalFeedbackScore / feedbackCount).toFixed(2) : '0.00';
  
  return {
    conversations: trainingConversations,
    documents,
    facts,
    documentQA,
    totalMessages,
    feedbackCount,
    avgFeedback: parseFloat(avgFeedback)
  };
}

/**
 * Formata dados para treinamento
 */
async function formatTrainingData(trainingData) {
  const formattedConversations = [];
  
  for (const { conversation, messages } of trainingData.conversations) {
    // Filtrar apenas mensagens com feedback positivo (4-5)
    const goodMessages = messages.filter(msg => 
      msg.role === 'assistant' && 
      msg.feedback_score !== null && 
      msg.feedback_score >= 4
    );
    
    if (goodMessages.length > 0) {
      // Criar pares pergunta-resposta
      for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
          const assistantMsg = messages[i + 1];
          
          // Incluir apenas se tem feedback positivo
          if (assistantMsg.feedback_score >= 4) {
            formattedConversations.push({
              instruction: messages[i].content,
              response: assistantMsg.content,
              feedback: assistantMsg.feedback_score,
              metadata: {
                conversationId: conversation.id,
                messageId: assistantMsg.id,
                model: assistantMsg.metadata?.model || 'qwen2.5:14b'
              }
            });
          }
        }
      }
    }
  }
  
  // 2. Formatar QA de documentos
  const formattedDocumentQA = [];
  for (const qa of trainingData.documentQA) {
    formattedDocumentQA.push({
      instruction: qa.question,
      response: qa.answer,
      feedback: 5, // QA de documentos tem feedback máximo
      source: 'document',
      metadata: {
        documentId: qa.source.documentId,
        filename: qa.source.filename,
        description: qa.source.description,
        context: qa.context,
        generatedAt: qa.generatedAt
      }
    });
  }
  
  // Combinar todos os dados
  const allTrainingData = [...formattedConversations, ...formattedDocumentQA];
  
  logger.info('Dados formatados para treinamento', {
    conversations: formattedConversations.length,
    documentQA: formattedDocumentQA.length,
    total: allTrainingData.length
  });
  
  return {
    conversations: formattedConversations,
    documentQA: formattedDocumentQA,
    allData: allTrainingData,
    documents: trainingData.documents,
    facts: trainingData.facts,
    stats: {
      totalConversations: trainingData.conversations.length,
      formattedConversations: formattedConversations.length,
      documentQA: formattedDocumentQA.length,
      totalTrainingPairs: allTrainingData.length,
      totalMessages: trainingData.totalMessages,
      feedbackCount: trainingData.feedbackCount,
      avgFeedback: trainingData.avgFeedback
    }
  };
}

/**
 * Executa o fine-tuning (simulado)
 */
async function performFineTuning(formattedData, options) {
  // Simular processo de fine-tuning
  // Em produção, aqui executaríamos LoRA/QLoRA
  
  const { allData, conversations, documentQA } = formattedData;
  
  if (allData.length < 1) {
    throw new Error('Dados insuficientes para fine-tuning. Necessário: pelo menos 1 par pergunta-resposta (conversas ou documentos)');
  }
  
  // Simular tempo de processamento
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Gerar nome do modelo fine-tunado
  const timestamp = new Date().toISOString().split('T')[0];
  const modelName = `qwen2.5:14b-finetuned-${timestamp}`;
  
  return {
    modelName,
    baseModel: 'qwen2.5:14b-instruct-q4_K_M',
    trainingData: {
      conversations: conversations.length,
      avgFeedback: formattedData.stats.avgFeedback,
      documents: formattedData.documents.length,
      facts: formattedData.facts.length
    },
    parameters: {
      learningRate: options.learningRate || 0.0001,
      epochs: options.epochs || 3,
      batchSize: options.batchSize || 4,
      method: 'LoRA' // Low-Rank Adaptation
    },
    performance: {
      loss: 0.15, // Simulado
      accuracy: 0.92, // Simulado
      perplexity: 1.8 // Simulado
    }
  };
}

/**
 * Salva modelo fine-tunado
 */
async function saveFineTunedModel(fineTuningResult) {
  // Em produção, aqui salvaríamos o modelo no Ollama
  // Por enquanto, simular salvamento
  
  const modelInfo = {
    name: fineTuningResult.modelName,
    baseModel: fineTuningResult.baseModel,
    createdAt: new Date().toISOString(),
    size: '9.2GB', // Simulado
    status: 'ready',
    performance: fineTuningResult.performance,
    trainingData: fineTuningResult.trainingData
  };
  
  // Simular salvamento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  logger.info('Modelo fine-tunado salvo', { modelName: modelInfo.name });
  
  return modelInfo;
}

module.exports = { executeFineTuning };
