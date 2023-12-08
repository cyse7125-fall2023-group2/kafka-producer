FROM node:14

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ADD ./entrypoint.sh /entrypoint.sh

RUN ["chmod", "+x", "/entrypoint.sh"]

RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*
    
ENTRYPOINT ["/entrypoint.sh"]

CMD ["node","index.js"]