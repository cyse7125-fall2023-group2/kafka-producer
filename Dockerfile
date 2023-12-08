FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ADD ./entrypoint.sh /entrypoint.sh

RUN ["chmod", "+x", "/entrypoint.sh"]

RUN apk --no-cache add curl

ENTRYPOINT ["/entrypoint.sh"]

CMD ["node","index.js"]