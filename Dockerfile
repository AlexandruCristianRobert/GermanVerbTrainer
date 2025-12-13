# Stage 1: Build the Angular application
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy project files
COPY . .

# Build the application for production (client-side only)
RUN npm run build

# Stage 2: Production image with simple static server
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install serve package globally
RUN npm install -g serve

# Copy built browser files from build stage
COPY --from=build /app/dist/german-verb-trainer/browser ./dist

# Expose port
EXPOSE 4000

# Set environment variable
ENV NODE_ENV=production

# Start the static file server
CMD ["serve", "-s", "dist", "-l", "4000"]