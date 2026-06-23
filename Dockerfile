FROM node:lts-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js index.handlebars ./

EXPOSE 8080

CMD ["node", "index.js"]
