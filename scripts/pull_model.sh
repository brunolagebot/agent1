#!/usr/bin/env bash
set -euo pipefail

# Pull modelos para Ollama
echo "[pull_model] Baixando qwen2.5:7b-instruct-q4_K_M (LLM principal)..."
docker exec agent1-ollama-1 ollama pull qwen2.5:7b-instruct-q4_K_M

echo "[pull_model] Baixando nomic-embed-text (embeddings para RAG)..."
docker exec agent1-ollama-1 ollama pull nomic-embed-text

echo "[pull_model] Modelos baixados!"
echo "[pull_model] Testando LLM..."
docker exec agent1-ollama-1 ollama run qwen2.5:7b-instruct-q4_K_M "Olá, responda em português: qual é a capital do Brasil?"

echo "[pull_model] Modelos prontos para uso (chat + RAG)."

