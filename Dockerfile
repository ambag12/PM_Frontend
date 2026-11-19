# syntax=docker/dockerfile:1
# Production image for the SocketSoft PM frontend (pm.socketsoft.io).
# Built by .github/workflows/deploy.yml; the server never builds.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# API base URL is compiled into the bundle (read by src/api/client.js)
ARG VITE_API_URL=https://pm-api.socketsoft.io/api/v1/
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# nginx-unprivileged runs as the non-root "nginx" user and listens on 8080
FROM nginxinc/nginx-unprivileged:1.27-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
