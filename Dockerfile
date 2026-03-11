# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runtime
WORKDIR /app

COPY --from=build /app/dist dist
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/drizzle.config.ts drizzle.config.ts
COPY --from=build /app/drizzle drizzle
COPY --from=build /app/src/db src/db

RUN mkdir -p /app/uploads
VOLUME /app/uploads

EXPOSE 3000

CMD ["npx", "srvx", "--prod", "-s", "../client", "dist/server/server.js"]
