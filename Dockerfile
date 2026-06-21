# Base node image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for dependency installation
COPY client/package*.json ./client/
COPY client/package-lock.json ./client/

WORKDIR /app/client
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY client ./client
COPY shared ./shared

WORKDIR /app/client

# Disable Next.js telemetry during the build
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js builds environment variables (NEXT_PUBLIC_*) at build time.
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app/client

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets and modules
COPY --from=builder /app/client/package.json ./
COPY --from=builder /app/client/node_modules ./node_modules
COPY --from=builder /app/client/.next ./.next
COPY --from=builder /app/client/public ./public

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
