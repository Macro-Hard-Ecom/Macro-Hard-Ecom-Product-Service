FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./

RUN npm ci

COPY . .

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Production Image
# Only install production dependencies — keeps the image small and secure
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Run as non-root user for security (principle of least privilege)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code from builder stage
COPY --from=builder /app/src ./src

# Set ownership to non-root user
RUN chown -R nodeuser:nodejs /app

USER nodeuser

# Expose the application port
EXPOSE 3000

# Health check — Docker will mark container as unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "src/app.js"]
