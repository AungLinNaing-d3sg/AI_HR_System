# Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Build application
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept the API URL at build time so it gets baked into the client bundle
ARG BACKEND_API_URL
ENV BACKEND_API_URL=$BACKEND_API_URL

RUN npm run build

# Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=UAT

# Also make it available at runtime (for any server-side code reading it directly)
ARG BACKEND_API_URL
ENV BACKEND_API_URL=$BACKEND_API_URL

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./

EXPOSE 3000

CMD ["npm", "start"]