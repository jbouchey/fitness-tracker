FROM node:20-alpine AS builder

WORKDIR /app

# Declare build args so Vite can pick them up at build time
ARG VITE_API_URL
ARG VITE_MAPBOX_TOKEN
ARG VITE_APP_NAME
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
ENV VITE_APP_NAME=$VITE_APP_NAME

# Use the monorepo root lockfile for reproducible installs
COPY package.json package-lock.json ./
COPY client/package.json ./client/

RUN npm ci --workspace=client

COPY client/ ./client/

RUN npm run build --workspace=client

FROM nginx:alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
