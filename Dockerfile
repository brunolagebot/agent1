FROM node:20-alpine AS base

WORKDIR /app

# Nenhuma dependência ainda; manter imagem mínima.

COPY apps/web /app/apps/web

EXPOSE 3000

CMD ["node", "/app/apps/web/interfaces/http/server.js"]

