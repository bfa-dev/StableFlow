FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build wallet-service

CMD ["node", "dist/apps/wallet-service/main"]