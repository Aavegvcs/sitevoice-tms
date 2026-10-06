# Build from the repo root (npm workspaces share one lockfile):
#   docker build -f apps/web/Dockerfile .
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/web
COPY apps/web apps/web
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time. They come from
# apps/web/.env.local; set NEXT_PUBLIC_API_URL in .env.production to override that file.
ARG NEXT_PUBLIC_API_URL=
RUN if [ -z "$NEXT_PUBLIC_API_URL" ]; then unset NEXT_PUBLIC_API_URL; fi; npm run build -w apps/web

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
