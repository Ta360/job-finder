# syntax=docker/dockerfile:1
# Job Finder — single production image: Express API serves the built React app.
# Persistence: SQLite via node:sqlite (no native deps). Mount a volume at
# /app/backend/data to keep data across deploys.

# --- 1. build frontend --------------------------------------------------
FROM node:24-bookworm-slim AS web
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build            # -> /src/frontend/dist

# --- 2. runtime -------------------------------------------------------
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=4200 \
    DATA_DIR=/app/backend/data
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY backend/ ./
COPY --from=web /src/frontend/dist /app/frontend/dist

RUN mkdir -p /app/backend/data && chown -R node:node /app
USER node

EXPOSE 4200
HEALTHCHECK --interval=30s --timeout=3s --start-period=8s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4200)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
