FROM node:22

WORKDIR /usr/app

COPY ./package.json .
COPY ./package-lock.json .
COPY ./src ./src

RUN npm install --omit=dev

ENV NODE_ENV=production

EXPOSE 6363

ENTRYPOINT ["npm"]

CMD ["run", "start"]
