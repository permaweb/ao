FROM node:21

RUN apt update && apt install -y bash git awscli

WORKDIR /usr/app

COPY ./package.json .
COPY ./package-lock.json .
COPY ./src ./src
COPY ./entrypoint.sh ./entrypoint.sh

RUN chmod +x /usr/app/entrypoint.sh

RUN npm install --ignore-engines

ENV NODE_ENV=production

EXPOSE 3005

ENTRYPOINT ["/usr/app/entrypoint.sh"]
