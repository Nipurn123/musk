# Vite Static Build Guide (Instead of Dev/Watcher Mode)

## Overview

This guide explains how to use Vite's **static build** mode instead of the dynamic **dev/watcher** mode. This is important for production deployments where you want pre-built static files served by Nginx, rather than a running Vite dev server with hot module replacement (HMR).

---

## ❌ No Auto-Refresh in Static Build

### Important: Static Build Has No Hot Reload

With **Vite static build**, there is:

| Feature | Dev Mode (`npm run dev`) | Static Build (`npm run build`) |
|---------|-------------------------|-------------------------------|
| Hot Module Replacement (HMR) | ✅ Yes | ❌ No |
| Automatic browser refresh | ✅ Yes | ❌ No |
| File watcher | ✅ Yes | ❌ No |
| Live reload | ✅ Yes | ❌ No |
| Instant updates on save | ✅ Yes | ❌ No |

### Workflow Comparison

**Dev Mode (npm run dev):**
```
Edit file → Save → Watcher detects → Browser auto-updates (instant, no refresh)
```

**Static Build (npm run build):**
```
Edit file → Save → Run build → Reload nginx → Manual browser refresh (Ctrl+R)
```

### Recommendation

| Environment | Command | Use Case |
|-------------|---------|----------|
| **Development** | `npm run dev` | Active coding, instant feedback |
| **Production** | `npm run build` + nginx | Deployment, optimized performance |

### For Active Development

If you want instant updates while coding:
```bash
npm run dev          # Start dev server with HMR
# OR
npm run dev:all      # Dev server + Express API on port 3001
```

The browser will automatically update when you save files.

### For Production Deployment

After code changes:
```bash
npm run build        # Rebuild static files
nginx -s reload      # Reload nginx
# Then hard refresh browser: Ctrl + Shift + R
```

---

## Static Build vs Dev/Watcher Mode

### Dev/Watcher Mode (`npm run dev`)

```
┌─────────────────┐     ┌─────────────────┐
│  Source Files   │     │  Vite Dev Server│
│  src/**/*.tsx   │────▶│  Port 3000      │
│  (Hot Reload)   │     │  (Watch Mode)   │
└─────────────────┘     └─────────────────┘
                               │
                               ▼
                        Browser receives
                        dynamically compiled
                        modules on request
```

**Characteristics:**
- Files are compiled on-demand
- Hot Module Replacement (HMR) enabled
- Source maps included
- Slower initial load
- Uses more memory (watcher process)
- Good for development

### Static Build Mode (`npm run build`)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Source Files   │     │  Vite Build     │     │  dist/ folder   │
│  src/**/*.tsx   │────▶│  npm run build  │────▶│  index.html     │
│  (One-time)     │     │  (Compile all)  │     │  assets/*.js    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                 ┌─────────────────┐
                                                 │  Nginx Server   │
                                                 │  Port 3000      │
                                                 │  (Serve static) │
                                                 └─────────────────┘
```

**Characteristics:**
- Files are pre-compiled once
- No watcher process running
- Optimized and minified
- Fast serving (static files)
- Lower memory usage
- Good for production

---

## File Structure

```
/app/frontend/
├── src/                          # Source code (you edit these)
│   ├── sdk/
│   │   └── v2/gen/core/
│   │       └── serverSentEvents.gen.ts
│   ├── components/
│   ├── hooks/
│   └── pages/
│
├── dist/                         # Built output (auto-generated, DO NOT EDIT)
│   ├── index.html                # Entry point
│   ├── assets/
│   │   ├── index-[hash].js       # Bundled JavaScript (2.1MB)
│   │   └── index-[hash].css      # Bundled CSS
│   ├── favicon.svg
│   └── env-config.js
│
├── nginx.conf                    # Nginx serves from dist/
├── server.ts                     # Express server on port 3001
├── vite.config.ts                # Vite configuration
└── package.json                  # Build scripts
```

---

## Build Commands

### Development (Dev/Watcher Mode)

```bash
# Start Vite dev server with hot reload
npm run dev

# Or start both dev server and Express API server
npm run dev:all
```

### Production (Static Build Mode)

```bash
# 1. Build static files
npm run build

# 2. Preview build locally (optional testing)
npm run preview

# 3. Serve via Nginx (production)
nginx -s reload
# OR
supervisorctl restart frontend
```

---

## Complete Deployment Workflow

### Step 1: Make Code Changes

Edit source files in `src/`:

```bash
# Example: Edit SSE client
vim /app/frontend/src/sdk/v2/gen/core/serverSentEvents.gen.ts
```

### Step 2: Build Static Files

```bash
cd /app/frontend
npm run build
```

**Output:**
```
vite v6.4.2 building for production...
✓ 2304 modules transformed.
dist/index.html                     0.90 kB
dist/assets/index-LBMkp9lu.css     58.36 kB
dist/assets/index-BVbJn9Vg.js   2,102.95 kB
✓ built in 6.48s
```

### Step 3: Verify Build Contains Changes

```bash
# Check if your code changes are in the build
grep -o "Stream ended unexpectedly" /app/frontend/dist/assets/index*.js
# Output: Stream ended unexpectedly
```

### Step 4: Reload Nginx

```bash
# Test nginx config first
nginx -t -c /app/frontend/nginx.conf

# Reload nginx to serve new files
nginx -s reload
# OR if using supervisor
supervisorctl restart frontend
```

### Step 5: Clear Browser Cache

The browser may cache old JS files. Force refresh:
- **Chrome/Edge**: `Ctrl + Shift + R` or `Cmd + Shift + R`
- **Firefox**: `Ctrl + F5`
- Or open DevTools → Network → "Disable cache"

---

## Nginx Configuration for Static Build

The nginx config serves from `dist/` folder:

```nginx
server {
    listen 3000;
    server_name localhost;
    root /app/frontend/dist;        # Serve from dist/
    index index.html;

    # Static files with cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API routes - proxy to backend
    location ~ ^/(api|global|session) {
        proxy_pass http://127.0.0.1:4096;
        # ... proxy settings
    }
}
```

---

## Hash-Based Cache Busting

Vite automatically adds content hashes to filenames:

```
Before build:  src/index.tsx
After build:    dist/assets/index-BVbJn9Vg.js
                              ^^^^^^^^
                              Content hash
```

When you change code and rebuild:
```
Old build:  dist/assets/index-BVbJn9Vg.js
New build:  dist/assets/index-NEW_HASH.js
```

This ensures browsers always get the latest version because the filename changes.

**Important:** If you see old code, the build didn't include your changes. Always verify:
```bash
grep "your_new_code" dist/assets/index*.js
```

---

## Environment Variables

### Build-Time Variables (vite.config.ts)

```typescript
export default defineConfig({
  define: {
    'process.env.MY_VAR': JSON.stringify('value'),
  },
})
```

### Runtime Variables (env-config.js)

For runtime config (loaded at browser startup):

```html
<!-- dist/index.html -->
<script src="/env-config.js"></script>
```

```javascript
// dist/env-config.js
window.ENV = {
  API_URL: "https://api.example.com",
};
```

---

## Common Issues & Solutions

### Issue 1: Changes Not Reflecting

**Problem:** You edited `src/` files but browser shows old code.

**Solution:**
```bash
# 1. Verify build has changes
npm run build
grep "your_change" dist/assets/index*.js

# 2. Hard refresh browser
Ctrl + Shift + R

# 3. Clear nginx cache (if any)
nginx -s reload
```

### Issue 2: 404 on JS Files

**Problem:** Browser shows 404 for `index-[hash].js`.

**Solution:**
```bash
# Check dist folder exists
ls -la /app/frontend/dist/assets/

# Rebuild if missing
npm run build
```

### Issue 3: Old Hash in index.html

**Problem:** `dist/index.html` references old JS hash.

**Solution:**
```bash
# The hash is injected during build
# Just rebuild
npm run build

# Verify index.html points to correct file
grep "index-" dist/index.html
```

### Issue 4: Source Maps in Production

**Problem:** Source maps expose code structure.

**Solution:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: false,  // Disable source maps
  },
})
```

---

## Build Optimization

### Analyze Bundle Size

```bash
# Install analyzer
npm install -D rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true }),
  ],
})
```

### Code Splitting

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          sdk: ['./src/sdk'],
        },
      },
    },
  },
})
```

### Chunk Size Warning

If you see "Some chunks are larger than 500 kB":

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2500,  // Increase limit to 2.5MB
  },
})
```

---

## Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server with HMR
npm run dev:all               # Dev server + Express API

# Production Build
npm run build                 # Build static files to dist/
npm run preview               # Preview build locally

# Deploy
supervisorctl restart frontend   # Restart nginx serving dist/

# Verify
ls -la dist/                  # Check build output
grep "code" dist/assets/*.js  # Verify code in build

# Debug
npm run build 2>&1 | head -20  # Check build errors
nginx -t                       # Test nginx config
```

---

## Migration from Dev to Static

If you're currently using `npm run dev` in production:

### 1. Stop Dev Server

```bash
# Kill dev server
pkill -f "vite"
# OR if using supervisor
supervisorctl stop frontend
```

### 2. Update Supervisor Config

```ini
# /etc/supervisor/conf.d/frontend.conf
[program:frontend]
command=/usr/sbin/nginx -g "daemon off;" -c /app/frontend/nginx.conf
directory=/app/frontend
# ... rest of config
```

### 3. Build and Start

```bash
cd /app/frontend
npm run build
supervisorctl reread
supervisorctl update
supervisorctl start frontend
```

### 4. Verify

```bash
curl http://localhost:3000
# Should return HTML with hashed JS filename
```

---

## Summary

| Aspect | Dev Mode | Static Build |
|--------|----------|--------------|
| Command | `npm run dev` | `npm run build` |
| Output | On-demand compilation | Pre-built `dist/` folder |
| Server | Vite dev server (Node) | Nginx (static files) |
| HMR | ✅ Yes | ❌ No |
| Speed | Slower initial load | Faster serving |
| Memory | Higher (watcher) | Lower |
| Use case | Development | Production |

---

## Checklist: Deploying Code Changes

- [ ] Edit source files in `src/`
- [ ] Run `npm run build`
- [ ] Verify changes in `dist/assets/index-*.js`
- [ ] Run `nginx -t` to test config
- [ ] Run `nginx -s reload` or `supervisorctl restart frontend`
- [ ] Hard refresh browser (`Ctrl + Shift + R`)
- [ ] Verify changes in browser DevTools

---

**Last Updated:** April 15, 2026
