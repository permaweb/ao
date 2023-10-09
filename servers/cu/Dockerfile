# Use the official Node.js image as a base image
FROM node:18-slim

# Placeholder for the private key environment variable
ENV WALLET=

# Set the working directory inside the container
WORKDIR /ao

# Copy the package.json and package-lock.json (if available)
COPY package*.json ./

# Install the dependencies inside the container
RUN npm install

# Copy the rest of the application code into the container
COPY src ./src

# Set the API's port number
EXPOSE 3005

# Define the command to run the application
CMD ["npm", "start"]