# Use the latest version of the Rust base image
FROM rust:latest

# Set the working directory in the container to /my
WORKDIR /usr/src/su

# Copy the Rust project files to the working directory
COPY . .

# Build the Rust app
RUN cargo build

# Set the command to run the Rust app
CMD cargo run