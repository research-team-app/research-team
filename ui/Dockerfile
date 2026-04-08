# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Docker Compose: browser calls API at host:8080 (no proxy; rewrites don't work with output: export)
ARG NEXT_PUBLIC_IS_LOCAL=true
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_IS_LOCAL=$NEXT_PUBLIC_IS_LOCAL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js app
RUN npm run build


# ---------- Stage 2: Runtime ----------
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy only what runtime needs
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
