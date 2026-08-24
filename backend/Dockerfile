# ── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

# Install production deps only
RUN npm ci --frozen-lockfile --omit=dev

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 --ingroup nodejs express

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source (exclude dev files via .dockerignore)
COPY --chown=express:nodejs . .

# Remove any test/migration scripts from the production image
RUN rm -rf src/tests src/test

USER express

EXPOSE 5000

ENV NODE_ENV=production \
    PORT=5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]