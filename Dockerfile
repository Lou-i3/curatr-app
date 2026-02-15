# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy only package files first (better caching)
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --frozen-lockfile

# Copy source code
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY public ./public
COPY components.json ./

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
RUN npm run build

# Prisma dependencies stage - install only what's needed for migrations and workers
FROM node:24-alpine AS prisma-deps

WORKDIR /prisma-deps

# Create a minimal package.json for prisma CLI and worker dependencies
# Workers need @prisma/client and @prisma/adapter-better-sqlite3 at runtime
RUN echo '{"name":"prisma-deps","private":true,"dependencies":{"prisma":"7.4.0","@prisma/client":"7.4.0","@prisma/adapter-better-sqlite3":"7.4.0","better-sqlite3":"12.6.2","dotenv":"16.6.1"}}' > package.json

# Install prisma CLI and worker dependencies
RUN npm install --production && npm cache clean --force

# Runtime stage - minimal image
FROM node:24-alpine AS runner

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init su-exec shadow

# Set environment
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/media-tracker.db"
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# PUID/PGID for user mapping (like linuxserver.io)
ENV PUID=1000
ENV PGID=1000

# Copy standalone build output (includes traced app dependencies)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema and migrations
COPY --from=builder /app/prisma ./prisma
COPY prisma.config.ts ./

# Copy Prisma CLI dependencies from dedicated stage
COPY --from=prisma-deps /prisma-deps/node_modules ./node_modules

# Copy generated Prisma client from builder (required for worker threads)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy package.json for version display
COPY package.json ./

# Copy worker script for background tasks (built during npm run build)
COPY --from=builder /app/src/lib/tasks/task-worker.js ./task-worker.js

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Create directories for runtime
RUN mkdir -p /app/data /app/logs

# Health check (unauthenticated endpoint, returns 503 if DB is unreachable)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
