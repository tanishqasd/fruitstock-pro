FROM node:18-alpine

WORKDIR /app

# Copy only the server package files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

# Copy only the server source code
COPY server/ ./

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]

