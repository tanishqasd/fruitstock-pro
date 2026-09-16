FROM node:20-alpine
# Force cache refresh for build sequence
WORKDIR /app

COPY server/package*.json ./
COPY server/prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY server/ ./
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]

