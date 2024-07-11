FROM node:alpine as downloader
ARG BRANCH
ARG REPO

# RUN apk --no-cache --update upgrade && apk --no-cache add ca-certificates
RUN apk add git

WORKDIR /download
RUN git clone --branch=${BRANCH} --depth=1 ${REPO}

WORKDIR /usr/src/su
COPY ./deploy-scheduler ./
COPY wallet.json .
WORKDIR /usr/src/su/deploy-scheduler
RUN npm i && npm run deploy


# Stage 1: Build the dynamic binary
FROM rust:1.75.0 as builder

# # Set the working directory in the container
WORKDIR /usr/src/su

# Install required dependencies for building
RUN apt-get update && apt-get install -y \
    llvm-dev \
    libclang-dev \
    clang \
    librocksdb-dev \
    libpq5

# Copy the manifests
COPY --from=downloader /download/ao/servers/su/Cargo.toml /download/ao/servers/su/Cargo.lock .

# This step is to cache your dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -f target/release/deps/su*

# Now copy the actual source code and build the application
COPY --from=downloader /download/ao/servers/su/src ./src
COPY --from=downloader /download/ao/servers/su/migrations ./migrations

RUN cargo build --release

EXPOSE 9000
ENTRYPOINT  ["./target/release/su", "su", "9000"]
