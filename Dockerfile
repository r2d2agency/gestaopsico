FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm install
COPY backend/prisma ./prisma/
RUN npx prisma generate
COPY backend/ .
EXPOSE 3001
CMD ["npm", "start"]
