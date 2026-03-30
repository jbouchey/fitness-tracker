FROM node:20-alpine AS builder

WORKDIR /app

# Declare build args so Vite can pick them up at build time
ARG VITE_API_URL
ARG VITE_MAPBOX_TOKEN
ARG VITE_APP_NAME
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
ENV VITE_APP_NAME=$VITE_APP_NAME

COPY client/package.json client/package-lock.json* ./
RUN npm install

COPY client/ .

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
