# Stage 1: Build the Angular application
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy project files
COPY . .

# Build the application for production with SSR
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy built application from build stage
COPY --from=build /app/dist/german-verb-trainer ./dist/german-verb-trainer

# Copy package files for production dependencies
COPY --from=build /app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Expose port (default Angular SSR port is 4000)
EXPOSE 4000

# Set environment variable
ENV NODE_ENV=production
ENV PORT=4000

# Start the server
CMD ["node", "dist/german-verb-trainer/server/server.mjs"]