# ==============================================================================
# Multi-stage Dockerfile for Frontend (Next.js 14 Standalone)
# ==============================================================================

# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

# ==============================================================================
# Stage 2: Build the Next.js application
# ==============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build time
ARG NEXT_PUBLIC_API_URL=http://localhost:5000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==============================================================================
# Stage 3: Lightweight Production Runner
# ==============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root system user for container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
