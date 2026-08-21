FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev

# ── build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# ── runtime ───────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
