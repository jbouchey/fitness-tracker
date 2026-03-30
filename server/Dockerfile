FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Use monorepo root lockfile for reproducible installs
COPY package.json package-lock.json ./
COPY server/package.json ./server/

RUN npm ci --workspace=server --omit=dev

COPY server/prisma ./server/prisma
COPY server/src ./server/src

RUN npx prisma generate --schema=server/prisma/schema.prisma

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy --schema=server/prisma/schema.prisma && node server/src/index.js"]
