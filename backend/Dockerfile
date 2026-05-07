FROM node:20-alpine

WORKDIR /app

ARG CACHEBUST=1

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]