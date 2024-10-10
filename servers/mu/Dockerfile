FROM node:22

RUN apt update && apt install -y bash git awscli

WORKDIR /usr/app

COPY ./package.json .
COPY ./package-lock.json .
COPY ./src ./src

RUN mkdir /usr/app/mu-data/

RUN npm install --ignore-engines

EXPOSE 3005

CMD ["node", "src/app.js"]
