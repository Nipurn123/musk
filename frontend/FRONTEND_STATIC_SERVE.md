# Frontend Static Serve - No Reload/Crash Setup

This guide explains how to serve the frontend as static files to avoid Vite crashes caused by the inotify watcher limit (`ENOSPC`) and prevent auto-refresh loops.

---

## The Problem

In the Emergent preview environment:
1. **Low inotify limit** (12288) - causes Vite dev server to crash with `ENOSPC`
2. **Platform reload injection** - `e1_monitor` injects `refresh.js` that causes WebSocket errors
3. **Auto-refresh loops** - when Vite crashes, browser keeps reloading

---

## The Solution

Serve the **built static files** with nginx instead of running the Vite dev server.

---

## Files to Update

### 1. `/etc/supervisor/conf.d/supervisord.conf`

Change the frontend command from `yarn start` (Vite) to nginx serving static files:

```ini
# BEFORE
[program:frontend]
command=yarn start
environment=HOST="0.0.0.0",PORT="3000",
directory=/app/frontend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
stopsignal=TERM
stopwaitsecs=50
stopasgroup=true
killasgroup=true

# AFTER
[program:frontend]
command=/usr/sbin/nginx -g "daemon off;" -c /app/frontend/nginx.conf
directory=/app/frontend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
stopsignal=TERM
stopwaitsecs=50
stopasgroup=true
killasgroup=true
```

---

### 2. `/app/frontend/nginx.conf`

Update nginx to:
- Listen on port 3000 (instead of 8080)
- Serve from `/app/frontend/dist` (instead of `/var/www/html`)

```nginx
# BEFORE
server {
    listen 8080;
    server_name localhost;
    root /var/www/html;
    index index.html;

# AFTER
server {
    listen 3000;
    server_name localhost;
    root /app/frontend/dist;
    index index.html;
```

Full config should look like:

```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    map $uri $backend {
        default 0;
        ~/^\/(agent|auth|command|config|event|experimental|file|find|formatter|global|instance|log|lsp|mcp|path|project|provider|pty|session|ws)(\/|$) 1;
    }

    server {
        listen 3000;
        server_name localhost;
        root /app/frontend/dist;
        index index.html;

        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }

        # Voice assistant API
        location ^~ /api/ai-assistant {
            proxy_pass http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Proxy backend API routes to port 4096
        location ~ ^/(api|agent|auth|command|config|event|experimental|file|find|formatter|global|instance|log|lsp|mcp|path|project|provider|pty|session|ws)(/.*)?$ {
            proxy_pass http://127.0.0.1:4096;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;

            # Disable buffering for SSE streaming (nginx level)
            proxy_buffering off;
            proxy_cache off;
            proxy_request_buffering off;
            gzip off;
            chunked_transfer_encoding on;

            # Tell all proxies (Cloudflare, preview platform) to not buffer
            add_header X-Accel-Buffering no always;
            add_header Cache-Control "no-cache, no-store, no-transform" always;
            add_header X-Content-Type-Options "nosniff" always;
        }

        # Static files with cache
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Frontend SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
        }

        location = /index.html {
            add_header Cache-Control "no-cache";
        }
    }
}
```

---

### 3. Build the Frontend

Before starting, build the production bundle:

```bash
cd /app/frontend && npm run build
```

This creates the `dist/` folder with static files.

---

### 4. Stop Platform Reload (Optional but Recommended)

```bash
# Stop the e1_monitor process (injects refresh.js)
kill -TERM $(pgrep -f e1_monitor) 2>/dev/null

# Create dummy refresh.js to override platform injection
echo 'console.log("refresh.js: Disabled by 100xprompt");' > /app/frontend/public/refresh.js
```

---

### 5. Fix Nginx Proxy Cache Permissions

Nginx needs write access to its proxy cache directory:

```bash
chown -R www-data:www-data /var/lib/nginx/proxy/
chmod -R 755 /var/lib/nginx/proxy/
```

**Why this is needed:** If permissions are wrong, you'll see `ERR_HTTP2_PROTOCOL_ERROR` in the browser and `Permission denied` in nginx error logs when loading large responses (like messages).

---

### 6. Restart Services

```bash
supervisorctl reread && supervisorctl update && supervisorctl restart frontend
```

---

## Quick Setup (Copy & Paste All)

```bash
# 1. Build frontend
cd /app/frontend && npm run build

# 2. Stop platform reload monitor
kill -TERM $(pgrep -f e1_monitor) 2>/dev/null

# 3. Create dummy refresh.js
echo 'console.log("refresh.js: Disabled by 100xprompt");' > /app/frontend/public/refresh.js

# 4. Fix nginx proxy cache permissions
chown -R www-data:www-data /var/lib/nginx/proxy/
chmod -R 755 /var/lib/nginx/proxy/

# 5. Update the supervisor config (need to edit manually due to readonly sections)
# Or just restart after manually editing

# 6. Restart frontend
supervisorctl reread && supervisorctl update && supervisorctl restart frontend
```

---

## Trade-offs

| Aspect | Vite Dev Server | Static Serve (nginx) |
|--------|-----------------|---------------------|
| File watching | Yes (causes crash) | No |
| HMR (hot reload) | Yes | No |
| Stability | Crashes on low inotify limit | Stable |
| Need to rebuild on changes | No | Yes (`npm run build`) |

---

## After Code Changes

When you modify frontend code, rebuild:

```bash
cd /app/frontend && npm run build
```

Then refresh the browser to see changes.

---

## Verification

```bash
# Check frontend is running
supervisorctl status frontend

# Check nginx is serving on port 3000
curl -s http://localhost:3000/ | head -5

# Check API proxy works
curl -s http://localhost:3000/session?directory=/app | head -1
```

---

## SSE Heartbeat Injection

SSE (Server-Sent Events) streams can get stuck during long "Thinking..." periods because Cloudflare and the preview platform proxy buffer responses when no data is being sent. The solution is to inject heartbeat comments (`: heartbeat\n\n`) every 5 seconds into SSE streams.

### `server.ts` - SSE Proxy with Heartbeat

Add this to `/app/frontend/server.ts`:

```typescript
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import http from 'http'

const app = express()
app.use(cors())
app.use(express.json())

const BACKEND_URL = 'http://127.0.0.1:4096'
const HEARTBEAT_INTERVAL = 5000

function createSSEProxy(pathPattern: RegExp) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const path = req.originalUrl
    
    if (!pathPattern.test(path)) {
      return next()
    }

    const options = {
      hostname: '127.0.0.1',
      port: 4096,
      path: path,
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:4096' }
    }

    const proxyReq = http.request(options, (proxyRes) => {
      const isSSE = proxyRes.headers['content-type']?.includes('text/event-stream') ||
                    path.includes('/event') ||
                    path.includes('/message')

      if (!isSSE) {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
        proxyRes.pipe(res)
        return
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      })

      const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n')
      }, HEARTBEAT_INTERVAL)

      proxyRes.on('data', (chunk) => {
        res.write(chunk)
      })

      proxyRes.on('end', () => {
        clearInterval(heartbeat)
        res.end()
      })

      proxyRes.on('error', (err) => {
        clearInterval(heartbeat)
        console.error('SSE proxy error:', err)
        res.end()
      })

      req.on('close', () => {
        clearInterval(heartbeat)
        proxyReq.destroy()
      })
    })

    proxyReq.on('error', (err) => {
      console.error('Proxy request error:', err)
      res.status(502).json({ error: 'Proxy error' })
    })

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (req.body && Object.keys(req.body).length > 0) {
        proxyReq.write(JSON.stringify(req.body))
      }
    }
    proxyReq.end()
  }
}

app.use(createSSEProxy(/\/(global\/event|session\/.*\/message)/))

// ... rest of the existing code (LIVEKIT config, routes, etc.)
```

### Updated nginx.conf

Add SSE endpoint location BEFORE the general backend proxy:

```nginx
server {
    listen 3000;
    server_name localhost;
    root /app/frontend/dist;
    index index.html;

    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    # Voice assistant API
    location ^~ /api/ai-assistant {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE endpoints with heartbeat injection - proxy to port 3001
    location ~ ^/(global/event|session/.*/message) {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_buffering off;
        proxy_cache off;
        gzip off;
        chunked_transfer_encoding on;
        add_header X-Accel-Buffering no always;
    }

    # Proxy all other backend API routes to port 4096
    location ~ ^/(api|agent|auth|command|config|event|experimental|file|find|formatter|global|instance|log|lsp|mcp|path|project|provider|pty|session|ws)(/.*)?$ {
        proxy_pass http://127.0.0.1:4096;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;

        # Disable buffering for SSE streaming (nginx level)
        proxy_buffering off;
        proxy_cache off;
        proxy_request_buffering off;
        gzip off;
        chunked_transfer_encoding on;

        # Tell all proxies (Cloudflare, preview platform) to not buffer
        add_header X-Accel-Buffering no always;
        add_header Cache-Control "no-cache, no-store, no-transform" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # Static files with cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

### How Heartbeat Works

```
Browser → Cloudflare → Preview Platform → nginx (port 3000) 
    → Express Proxy (port 3001) → Backend (port 4096)
```

1. nginx routes `/global/event` and `/session/*/message` to port 3001
2. Express server proxies these to backend (port 4096)
3. Every 5 seconds, injects `: heartbeat\n\n` comment
4. SSE comment lines (`: ...`) are ignored by frontend but keep connection alive
5. Proxies see continuous data flow and don't buffer

### Auto-restart Script

Create `/app/frontend/start-server-3001.sh`:

```bash
#!/bin/bash
cd /app/frontend
while true; do
  npx tsx server.ts
  echo "Server crashed, restarting in 2 seconds..."
  sleep 2
done
```

Make it executable:
```bash
chmod +x /app/frontend/start-server-3001.sh
```

### Apply Changes

```bash
# Kill existing processes
pkill -f "tsx server.ts" 2>/dev/null
pkill -f "start-server-3001" 2>/dev/null

# Start the auto-restart script
bash /app/frontend/start-server-3001.sh &

# Restart nginx
supervisorctl restart frontend
```

### Verify

```bash
# Test SSE with heartbeat (should see ": heartbeat" every 5 seconds)
curl -s -N -H "Accept: text/event-stream" "http://localhost:3000/global/event" --max-time 12
```

Expected output:
```
data: {"payload":{"type":"server.connected","properties":{}}}

: heartbeat

: heartbeat

```

### Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `HEARTBEAT_INTERVAL` | 5000 | Milliseconds between heartbeats |
| SSE endpoints | `/global/event`, `/session/*/message` | Routes that get heartbeat injection |

### Notes

- Heartbeat is an SSE comment (`: heartbeat\n\n`), ignored by EventSource clients
- Only applies to SSE endpoints, not regular API calls
- Works alongside existing nginx SSE buffering settings
- The Express proxy on port 3001 must stay running

---

## Related Files

| File | Purpose |
|------|---------|
| `/app/frontend/nginx.conf` | Nginx config for static serve + API proxy |
| `/app/frontend/server.ts` | Express server with SSE heartbeat injection |
| `/etc/supervisor/conf.d/supervisord.conf` | Supervisor service definitions |
| `/app/frontend/dist/` | Built static files |
| `/app/frontend/vite.config.ts` | Vite build config (still used for `npm run build`) |
| `/app/REFRESH_JS_FIX.md` | Additional platform reload fixes |
