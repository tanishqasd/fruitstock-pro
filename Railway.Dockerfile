FROM node:20-alpine

WORKDIR /app

# Ensure working directory is set before copying assets
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . ./
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]

