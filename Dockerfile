FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests directly
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Build TypeScript output
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]

