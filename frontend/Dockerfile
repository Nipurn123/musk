# Stage 1: Build frontend
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy package files and local deps
COPY package.build.json ./package.json
COPY local-deps ./local-deps
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY tsconfig.json ./

# Install dependencies
RUN bun install

# Build with backend URL pointing to localhost:4096
ENV VITE_API_URL=http://localhost:4096
RUN bun run build

# Stage 2: Production image
FROM oven/bun:1

WORKDIR /app

# Install nginx and tsx for running server.ts
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*
RUN bun install -g tsx

# Install @nipurn/xprompt-new globally
RUN bun install -g @nipurn/xprompt-new@dev

# Copy built frontend
COPY --from=builder /app/dist /var/www/html

# Copy server files for voice assistant (port 3001)
COPY server.ts ./
COPY package.build.json ./package.server.json

# Install server dependencies (express, cors, livekit-server-sdk, dotenv)
RUN bun add express cors livekit-server-sdk dotenv tsx

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create workspace directory
RUN mkdir -p /tmp/100xprompt-workspace

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
