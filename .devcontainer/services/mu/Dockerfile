FROM node:alpine as downloader
ARG BRANCH
ARG REPO

# RUN apk --no-cache --update upgrade && apk --no-cache add ca-certificates
RUN apk add git

WORKDIR /download
RUN git clone --branch=${BRANCH} --depth=1 ${REPO}


FROM node:alpine

WORKDIR /usr/src/mu

COPY --from=downloader /download/ao/servers/mu .

RUN sed -i '/postinstall/d' package.json
RUN sed -i '/heapdump/d' package.json
RUN sed -i '/heapdump/d' src/app.js

RUN npm install --ignore-engines --omit=dev

EXPOSE 3004
ENTRYPOINT  ["npm", "start"]
