# Build from the repo root (npm workspaces share one lockfile):
#   docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api
COPY apps/api apps/api
WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

# Dev dependencies are kept on purpose: the Prisma CLI runs migrations on start-up and
# `npx prisma db seed` (ts-node) can be run inside the container.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api ./apps/api
WORKDIR /app/apps/api
RUN rm -rf src test && mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
