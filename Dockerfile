# ── Stage 1: Build React UI ───────────────────────────────────────────────────
FROM node:20-alpine AS ui-builder
WORKDIR /app/ui

COPY ui/package*.json ./
RUN npm ci

COPY ui/ ./
# vite outDir '../public' resolves to /app/public relative to WORKDIR /app/ui
RUN npm run build

# ── Stage 2: Build NestJS backend ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Run only nest build — UI was handled in stage 1, no need to re-run build:ui
RUN ./node_modules/.bin/nest build

# Prune dev-only packages
RUN npm prune --omit=dev

# ── Stage 3: Production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# tini as PID 1 for correct signal handling and zombie reaping
RUN apk add --no-cache tini

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder   --chown=appuser:appgroup /app/dist         ./dist
COPY --from=builder   --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder   --chown=appuser:appgroup /app/package.json ./package.json
# Built React UI served by @nestjs/serve-static from join(__dirname, '..', 'public')
COPY --from=ui-builder --chown=appuser:appgroup /app/public       ./public

# The Ed25519 private key MUST be mounted at runtime — never baked into the image.
# Mount: -v /your/host/keys:/app/keys:ro
VOLUME ["/app/keys"]

USER appuser

EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4001/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
