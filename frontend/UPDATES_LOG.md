# Updates Log - April 16, 2026

## Overview

This document lists all updates made to the frontend application.

---

## 1. Static Build Configuration

### `vite.config.ts`

Added production build optimizations for static deployment.

**Changes:**
- Disabled source maps for production (`sourcemap: false`)
- Increased chunk size warning limit to 2500 kB
- Added code splitting for better caching:
  - `vendor` chunk: React, React-DOM, React-Router-DOM
  - `codemirror` chunk: CodeMirror editor libraries

```typescript
build: {
  sourcemap: false,
  chunkSizeWarningLimit: 2500,
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        codemirror: ['@uiw/react-codemirror', 'codemirror'],
      },
    },
  },
},
```

---

## 2. SSE Event Handler Bug Fix

### `src/hooks/useEventHandler.ts`

**Problem:** `question.replied` event was calling wrong function.

**Fix:** Changed `removePermission` to `removeQuestion`.

```typescript
// BEFORE
case "question.replied":
  removePermission(event.properties.requestID)
  break

// AFTER
case "question.replied":
  removeQuestion(event.properties.requestID)
  break
```

---

## 3. SDK Client Bug Fix

### `src/lib/sdk.ts`

**Problem:** Redundant duplicate condition check.

**Fix:** Removed duplicate condition.

```typescript
// BEFORE
if (clientInstance && clientInstance) {
  return clientInstance
}

// AFTER
if (clientInstance) {
  return clientInstance
}
```

---

## 4. Static Build Mode Enabled

**Before:** Vite dev server with hot reload (dynamic)
**After:** Nginx serving pre-built static files

| Aspect | Before | After |
|--------|--------|-------|
| Command | `npm run dev` (Vite) | `nginx` (static) |
| Auto-refresh | ✅ Yes (HMR) | ❌ No |
| Port 3000 | Vite dev server | Nginx static server |
| Deployment | Run `npm run dev` | Run `npm run build` + reload nginx |

**Workflow for updates:**
```bash
# 1. Make code changes
# 2. Build
npm run build

# 3. Reload nginx
nginx -s reload -c /app/frontend/nginx.conf

# 4. Hard refresh browser
Ctrl + Shift + R
```

---

## Build Output

After updates, the build produces:

| File | Size | Gzip |
|------|------|------|
| `index.html` | 0.90 kB | 0.49 kB |
| `index-*.css` | 58.36 kB | 11.24 kB |
| `index-*.js` | 2,102 kB | 626 kB |

---

## Services Running

| Port | Service |
|------|---------|
| 3000 | Nginx (static frontend) |
| 3001 | AI Assistant API (server.ts) |
| 4096 | 100XPrompt Backend |

---

## Files Modified

| File | Change Type |
|------|-------------|
| `vite.config.ts` | Build config |
| `src/hooks/useEventHandler.ts` | Bug fix (event handler) |
| `src/lib/sdk.ts` | Bug fix (condition) |

---

## Verification Commands

```bash
# Check build
npm run build

# Check services
lsof -i :3000 -i :3001 -i :4096

# Check nginx config
nginx -t -c /app/frontend/nginx.conf

# Reload nginx
nginx -s reload -c /app/frontend/nginx.conf

# Check supervisor status
supervisorctl status
```
