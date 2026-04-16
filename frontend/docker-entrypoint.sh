#!/bin/sh
set -e

echo "Installing @nipurn/xprompt-new@dev..."
npm install -g @nipurn/xprompt-new@dev

echo "Starting 100xprompt backend on port 4096..."
mkdir -p /tmp/100xprompt-workspace
cd /tmp/100xprompt-workspace
100xprompt serve --port 4096 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in 1 2 3 4 5 6 7 8 9 10; do
    if wget --no-verbose --tries=1 --spider http://localhost:4096/health 2>/dev/null; then
        echo "Backend is ready!"
        break
    fi
    echo "Waiting for backend... ($i/10)"
    sleep 1
done

echo "Starting voice assistant server on port 3001..."
cd /app
bun run tsx server.ts &
VOICE_PID=$!

# Wait for voice assistant to be ready
sleep 2

echo "Starting nginx frontend..."
exec nginx -c /app/frontend/nginx.conf -g "daemon off;"
