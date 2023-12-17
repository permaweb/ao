# Stage 1: Build the static binary
FROM clux/muslrust:latest as builder

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
RUN cargo build --release --target x86_64-unknown-linux-musl

# Stage 2: Create the runtime image
# FROM scratch

# Copy the statically-linked binary from the builder stage
# COPY --from=builder /usr/src/su/target/x86_64-unknown-linux-musl/release/su .

# Run the binary
# CMD ["./su"]
