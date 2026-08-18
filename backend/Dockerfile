# ==============================================================================
# Multi-stage Dockerfile for Backend (Node.js + Express + TypeScript)
# ==============================================================================

# Stage 1: Build TypeScript application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig.json ./

# Install dependencies (including devDependencies for tsc)
RUN npm install

# Copy source code
COPY src/ ./src/

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# ==============================================================================
# Stage 2: Production Lightweight Runtime
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user for cybersecurity hardening
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copy production artifacts from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Set ownership to non-root user
USER nodeuser

EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "dist/index.js"]
