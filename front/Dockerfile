# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20-alpine
ARG NGINX_VERSION=1.27-alpine
ARG VITE_API_URL=/api

FROM node:${NODE_VERSION} AS build
WORKDIR /app

# Install dependencies
COPY front/package.json front/package-lock.json ./
RUN npm ci

# Copy sources
COPY front/tsconfig.json front/tsconfig.app.json front/tsconfig.node.json front/vite.config.ts front/tailwind.config.js front/postcss.config.js front/eslint.config.js ./
COPY front/index.html ./
COPY front/src ./src
COPY front/public ./public

# Build with API endpoint baked in
RUN VITE_API_URL=${VITE_API_URL} npm run build

FROM nginx:${NGINX_VERSION} AS final
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
