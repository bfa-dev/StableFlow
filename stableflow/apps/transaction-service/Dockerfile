FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build transaction-service

CMD ["node", "dist/apps/transaction-service/main"]