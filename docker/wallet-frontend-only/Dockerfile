# Stage 1: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache \
    build-base \
    pkgconf \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    sed

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy source files
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

WORKDIR /app/packages/web-wallet

# Add standalone output to next.config.mjs for Docker build
RUN sed -i "s/const nextConfig = {/const nextConfig = {\n  output: 'standalone',/" next.config.mjs

# Build the application
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install pnpm in runner
RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HUSKY=0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs


# Install production-only dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml* ./
COPY --from=builder /app/patches ./patches
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

COPY --from=builder --chown=nextjs:nodejs /app/packages/web-wallet/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web-wallet/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/packages/web-wallet/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/packages/web-wallet/.next/standalone/packages/web-wallet ./



USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]