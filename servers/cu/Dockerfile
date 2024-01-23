FROM node:21

RUN apt update && apt install -y bash git awscli

WORKDIR /usr/app

COPY ./package.json .
COPY ./package-lock.json .
COPY ./src ./src

RUN npm install --ignore-engines

ENV NODE_ENV=production

EXPOSE 6363

ENTRYPOINT ["npm"]

CMD ["run", "start"]
