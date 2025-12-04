# ──────────────────────────────────────────────────────────────
# Stage 1: Builder
# ──────────────────────────────────────────────────────────────
FROM node:20-bullseye AS builder
SHELL ["/bin/bash", "-c"]

WORKDIR /opt/wallet/frontend

RUN npm -g install pnpm@10

# Copy monorepo workspace files
COPY packages packages
COPY patches patches
COPY *.json .
COPY *.yaml .

RUN rm -rf packages/agent || true

# Install dependencies and build web-wallet
WORKDIR /opt/wallet/frontend/packages/web-wallet

# Full install (Refine needs full node_modules, including dev deps)
RUN pnpm install

# Build using Refine (this runs `refine build`)
RUN pnpm build

# ──────────────────────────────────────────────────────────────
# Stage 2: Runner
# ──────────────────────────────────────────────────────────────
FROM node:20-bullseye AS runner
SHELL ["/bin/bash", "-c"]

WORKDIR /opt/wallet/frontend

# Install pnpm to run scripts like `pnpm start:prod`
RUN npm -g install pnpm@10

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

# Copy everything built in the builder stage, including node_modules,
# .next, packages, patches, etc. This is what Refine expects.
COPY --from=builder /opt/wallet/frontend /opt/wallet/frontend

WORKDIR /opt/wallet/frontend/packages/web-wallet

ENTRYPOINT ["pnpm", "start:prod"]
