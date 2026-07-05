# Unified container: HTTP (health + NOWPayments IPN) + Telegram bot (polling) + generation worker.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY bot/package.json ./bot/
COPY workers/package.json ./workers/
COPY api/package.json ./api/
RUN npm install --workspaces --include-workspace-root
COPY shared ./shared
COPY bot ./bot
COPY workers ./workers
COPY api ./api
COPY db ./db
COPY assets ./assets
RUN npm run build -w shared && npm run build -w bot && npm run build -w workers && npm run build -w api

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core ffmpeg && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
EXPOSE 8080
CMD ["node", "api/dist/server.js"]
