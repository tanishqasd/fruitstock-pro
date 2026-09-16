FROM node:20-alpine

WORKDIR /app

# Copy package metadata and prisma schema from the server directory
COPY server/package*.json ./
COPY server/prisma ./prisma/

RUN npm install
RUN npx prisma generate

# Copy the rest of the server source code
COPY server/ ./

# Build TypeScript output
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]

