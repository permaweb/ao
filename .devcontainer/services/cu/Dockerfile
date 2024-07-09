FROM node:alpine as downloader
ARG BRANCH
ARG REPO

# RUN apk --no-cache --update upgrade && apk --no-cache add ca-certificates

RUN apk add git

WORKDIR /download
RUN git clone --branch=${BRANCH} --depth=1 ${REPO}


FROM node:alpine

WORKDIR /usr/src/cu

COPY --from=downloader /download/ao/servers/cu .

RUN npm install --ignore-engines --omit=dev

EXPOSE 6363
ENTRYPOINT  ["npm", "start"]
