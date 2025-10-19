#!/usr/bin/env bash
set -euo pipefail

echo "[bootstrap] macOS - verificando/instalando Docker..."

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

require_brew() {
  if ! has_cmd brew; then
    echo "[bootstrap] Homebrew não encontrado. Instale via https://brew.sh e reexecute."
    exit 1
  fi
}

wait_docker_ready() {
  echo "[bootstrap] Aguardando Docker daemon ficar disponível..."
  local attempts=60
  local sleep_seconds=2
  for i in $(seq 1 "$attempts"); do
    if docker info >/dev/null 2>&1; then
      echo "[bootstrap] Docker está pronto."
      return 0
    fi
    sleep "$sleep_seconds"
  done
  return 1
}

require_brew

# 1) Tenta Docker Desktop sem sudo (appdir no diretório do usuário)
if ! has_cmd docker; then
  echo "[bootstrap] Tentando instalar Docker Desktop (user appdir)..."
  export HOMEBREW_NO_AUTO_UPDATE=1
  brew install --cask --appdir="$HOME/Applications" docker || true
fi

echo "[bootstrap] Tentando iniciar Docker Desktop..."
open -a "$HOME/Applications/Docker.app" || open -a Docker || true
if wait_docker_ready; then
  exit 0
fi

# 2) Fallback: Colima + docker (sem privilégios)
echo "[bootstrap] Fallback: instalando Colima + docker (CLI)"
brew install colima docker || true

echo "[bootstrap] Iniciando Colima..."
colima start --cpu 4 --memory 8 || true

echo "[bootstrap] Selecionando contexto docker=colima (se disponível)..."
docker context use colima >/dev/null 2>&1 || true

if wait_docker_ready; then
  exit 0
fi

echo "[bootstrap] Não foi possível iniciar um daemon Docker automaticamente. Abra o Docker Desktop ou rode 'colima start' e reexecute."
exit 1
