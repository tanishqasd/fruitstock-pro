FROM node:18-alpine

WORKDIR /app

# Copy root and server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

# Copy source code
COPY server/ ./

# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]

