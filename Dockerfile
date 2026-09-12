FROM node:20-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma/

WORKDIR /app/server
RUN npm install
RUN npx prisma generate

# Copy source code and build
COPY server/ ./
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]

