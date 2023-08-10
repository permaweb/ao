FROM node:18.16.0
ENV NODE_ENV=production

WORKDIR /app
COPY ./warp ./warp
COPY ["package.json", "yarn.lock", "./"]
RUN yarn install

COPY . .
# RUN mv .env.defaults .env

# Save git commit hash
RUN echo $(git rev-parse HEAD) > GIT_HASH
RUN rm -rf .git/

VOLUME /app/sqlite
VOLUME /app/cache

CMD ["node", "src/listener.js"]