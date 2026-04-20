FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm install
COPY . .
RUN npm run build --workspace apps/api

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]

