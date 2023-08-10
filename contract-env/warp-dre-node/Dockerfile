FROM node:18.16.0

# Set environment variable
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Copy the warp directory first
COPY ./warp ./warp

# Change into the warp directory
WORKDIR /app/warp

# Run yarn install and build in the warp directory
RUN yarn install
RUN yarn add rimraf typescript --production=false
RUN yarn build

# Change back to the /app directory
WORKDIR /app

# Copy package.json and yarn.lock and install dependencies
COPY ["package.json", "yarn.lock", "./"]
RUN yarn install

# Copy the rest of the application
COPY . .

# Uncomment if you want to move .env.defaults to .env
# RUN mv .env.defaults .env

# Save git commit hash and remove .git directory
RUN echo $(git rev-parse HEAD) > GIT_HASH
RUN rm -rf .git/

# Define volumes
VOLUME /app/sqlite
VOLUME /app/cache

# Set the command to run your app
CMD ["node", "src/listener.js"]