FROM node:20-slim

WORKDIR /app

# Copia dependências primeiro (cache de camadas)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copia o resto do código
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Cria pasta de dados
RUN mkdir -p backend/data/uploads

EXPOSE 3000

CMD ["node", "backend/src/server.js"]
