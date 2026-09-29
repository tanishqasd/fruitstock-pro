FROM node:18-alpine

WORKDIR /app

COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

COPY server/ ./

RUN npx prisma generate
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]

