# Multi-stage build for the API (bot can share image or run as separate service).
FROM node:22-slim AS build
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY shared ./shared
COPY api ./api
RUN npm install --workspaces --include-workspace-root && npm run build
FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 8080
# Secrets are injected by Cloud Run from Secret Manager (NOT baked into image).
CMD ["node", "api/dist/server.js"]
