# Use an official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Expose port (Render assigns this dynamically)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
