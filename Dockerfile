FROM node:20-alpine AS base

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install

# Copiar código da aplicação
COPY apps/web /app/apps/web

EXPOSE 3000

CMD ["node", "/app/apps/web/interfaces/http/server.js"]

