# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/frontend/node_modules ./frontend/node_modules
COPY frontend/ ./frontend
COPY backend/convex/ ./backend/convex

WORKDIR /app/frontend

# NEXT_PUBLIC_* values are embedded in the browser bundle by Next.js.
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CONVEX_SITE_URL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_SITE_URL=$NEXT_PUBLIC_CONVEX_SITE_URL
RUN if [ -z "$NEXT_PUBLIC_CONVEX_URL" ] || [ -z "$NEXT_PUBLIC_CONVEX_SITE_URL" ]; then \
      echo >&2 "ERROR: NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL are required Docker build arguments."; \
      echo >&2 "In Dokploy: Environment -> Build Time Arguments (setting runtime variables alone is not enough)."; \
      exit 1; \
    fi \
    && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone/frontend ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
