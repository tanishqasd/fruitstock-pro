FROM node:20-alpine

WORKDIR /app

# Copy package metadata and prisma schema from server
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma/

WORKDIR /app/server
RUN npm install
RUN npx prisma generate

# Copy remaining source code
COPY server/ ./

# Build TypeScript output
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]

