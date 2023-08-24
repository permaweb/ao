# Use the official Node.js image as a base image
FROM node:18.16.0

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json (if available)
COPY package*.json ./

# Install the dependencies inside the container
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Set the API's port number
EXPOSE 3004

# Define the command to run the application
CMD ["npm", "start"]