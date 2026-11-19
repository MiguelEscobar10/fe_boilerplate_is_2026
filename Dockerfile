# syntax=docker/dockerfile:1

# ===========================================================================
# Imagen del frontend (MP4-131). Usa `output: 'standalone'` de next.config.ts:
# el build trae solo lo que hace falta para correr, sin node_modules completo.
# Ver docs/despliegue.md.
# ===========================================================================

# --- Etapa 1: dependencias -------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- Etapa 2: build --------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Etapa 3: runtime ------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# server.js escucha en estas variables; 0.0.0.0 para que se vea fuera del
# contenedor.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# El servidor mínimo no copia `public` ni `.next/static`: se copian a mano para
# que los sirva él mismo (ver la guía `output` de Next).
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000

# API_URL se lee en tiempo de ejecución (las páginas que la usan son
# dinámicas), así que la misma imagen sirve para cualquier backend.
CMD ["node", "server.js"]
