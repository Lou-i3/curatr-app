# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only package files first (better caching)
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY public ./public

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files for production
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install production dependencies only
RUN npm ci --production --frozen-lockfile && npm install -D prisma

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/generated ./src/generated

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Create directories for runtime
RUN mkdir -p /app/data /app/logs
# Avoid recursive chown of the whole /app (can fail on some files like wasm)
# Set ownership only on runtime-writable directories and the entrypoint script.
RUN chown -R node:node /app/data /app/logs || true
RUN [ -f ./docker-entrypoint.sh ] && chown node:node ./docker-entrypoint.sh || true

# Set environment
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/media-tracker.db"
ENV PORT=3000

# Switch to non-root user for security
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
