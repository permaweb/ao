# Stage 1: Build the static binary
FROM clux/muslrust:1.75.0 as builder

# Set the working directory in the container
WORKDIR /usr/src/su

# Copy the manifests
COPY Cargo.toml Cargo.lock ./

# This step is to cache your dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release --target x86_64-unknown-linux-musl && \
    rm -f target/x86_64-unknown-linux-musl/release/deps/su*

# Now copy the actual source code and build the application
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release --target x86_64-unknown-linux-musl

# Stage 2: Create the runnable image using the statically-linked binary
FROM scratch as runner

# Set the working directory in the container
WORKDIR /app

# Copy the statically-linked binary from your local file system to the container
COPY --from=builder /usr/src/su/target/x86_64-unknown-linux-musl/release/su /app/su

# Provide instructions for building the binary
# (This will be displayed when someone runs `docker build`)
LABEL build_instructions="To build just the binary, run the following command: docker build --target builder -t su ."

# Run the binary - provide args on execution
ENTRYPOINT [ "/app/su" ]
