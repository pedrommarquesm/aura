# syntax=docker/dockerfile:1

# Build context is apps/web. The image carries only the standalone server and
# the dependencies Next traced into it, not the full node_modules tree.

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1


FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci


FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# have to be present here rather than only in the running container. Railway
# exposes service variables to Dockerfile builds as build arguments.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_USE_MOCK_API
ARG NEXT_PUBLIC_APP_DOWNLOAD_URL
ARG NEXT_PUBLIC_APP_STORE_URL
ARG NEXT_PUBLIC_PLAY_STORE_URL
ARG NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_USE_MOCK_API=$NEXT_PUBLIC_USE_MOCK_API \
    NEXT_PUBLIC_APP_DOWNLOAD_URL=$NEXT_PUBLIC_APP_DOWNLOAD_URL \
    NEXT_PUBLIC_APP_STORE_URL=$NEXT_PUBLIC_APP_STORE_URL \
    NEXT_PUBLIC_PLAY_STORE_URL=$NEXT_PUBLIC_PLAY_STORE_URL \
    NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID

ENV NODE_ENV=production
RUN npm run build


FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets live outside the standalone bundle. Without these two copies the
# server answers 200 but every stylesheet and chunk 404s.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

# Railway injects PORT; 3000 is the fallback for a plain `docker run`.
ENV PORT=3000
# Next binds localhost by default, which is unreachable from outside the container.
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
