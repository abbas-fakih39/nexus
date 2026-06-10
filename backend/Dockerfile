# ─── Stage 1 : Build ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Stage 2 : Production ───────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Toutes les dépendances (prisma + ts-node en devDep, nécessaires pour migrate deploy)
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Client Prisma généré + schéma + migrations
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Config Prisma 7 (prisma.config.ts lit DATABASE_URL et pilote migrate deploy)
COPY prisma.config.ts ./
COPY tsconfig.json ./

# Application compilée
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Applique les migrations manquantes puis démarre l'app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
