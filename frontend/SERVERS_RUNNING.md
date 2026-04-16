# Services & Servers Running

## Overview

This document lists all services and servers currently running in the application stack.

---

## Port Mapping

| Port | Service | Process | Description |
|------|---------|---------|-------------|
| 3000 | Nginx | `nginx` | Static frontend + reverse proxy |
| 3001 | AI Assistant API | `node server.ts` | SSE heartbeat proxy, LiveKit, Cloud Run agent |
| 4096 | 100XPrompt Backend | `100xprompt` | Main backend SSE streaming |
| 8001 | Python Backend | `uvicorn` | Python API server |
| 27017 | MongoDB | `mongod` | Database (if running) |

---

## Service Details

### 1. Frontend (Port 3000)

**Process:** Nginx

**Config:** `/app/frontend/nginx.conf`

**Purpose:**
- Serves static files from `dist/` folder
- Reverse proxy for API routes to backend
- SSE streaming with anti-buffering

**Routes:**
```
/                 → Static files (dist/)
/api/*            → Proxy to backend:4096
/global/event     → Proxy to backend:4096 (SSE)
/api/ai-assistant → Proxy to AI Assistant:3001
/session/*        → Proxy to backend:4096
```

---

### 2. AI Assistant API (Port 3001)

**Process:** Node.js (`server.ts`)

**File:** `/app/frontend/server.ts`

**Purpose:**
- SSE proxy with heartbeat injection (`: heartbeat\n\n` every 1 second)
- LiveKit integration for voice assistant
- Cloud Run agent orchestration
- Immediate flush for real-time streaming

---

### 3. 100XPrompt Backend (Port 4096)

**Process:** `100xprompt` (Go binary)

**Purpose:**
- Main backend API
- SSE streaming for real-time events
- Session management
- File operations

**Started by:** `/app/frontend/startup.sh`

---

### 4. Python Backend (Port 8001)

**Process:** Uvicorn

**Purpose:**
- Python API server
- Additional backend functionality

---

### 5. MongoDB (Port 27017)

**Process:** `mongod`

**Purpose:**
- Database for persistent storage

---

## Architecture Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                      Browser                            │
                    └─────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │              Nginx (Port 3000)                          │
                    │  - Static files from dist/                              │
                    │  - Reverse proxy for API routes                         │
                    │  - SSE anti-buffering enabled                           │
                    └─────────────────────────────────────────────────────────┘
                          │              │              │              │
                          ▼              ▼              ▼              ▼
              ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐
              │ 100XPrompt    │  │ AI Assistant │  │ Python       │  │ Static  │
              │ Backend:4096  │  │ API:3001     │  │ Backend:8001 │  │ dist/*  │
              │               │  │              │  │              │  │         │
              │ - SSE Events  │  │ - Heartbeat  │  │ - Python API │  │ - JS    │
              │ - Sessions    │  │ - LiveKit    │  │              │  │ - CSS   │
              │ - Commands    │  │ - Cloud Run  │  │              │  │ - HTML  │
              └───────────────┘  └──────────────┘  └──────────────┘  └─────────┘
                          │
                          ▼
              ┌───────────────┐
              │ MongoDB       │
              │ Port 27017    │
              └───────────────┘
```

---

## Startup Sequence

Run `/app/frontend/startup.sh` to start all services:

```bash
./startup.sh
```

---

## Health Check Commands

```bash
# Check all ports
lsof -i :3000 -i :3001 -i :4096 -i :8001

# Check specific service
curl -s http://localhost:3000 | head -5          # Frontend
curl -s http://localhost:3001/api/ai-assistant   # AI Assistant
```

---

## Log Files

| Service | Log Location |
|---------|--------------|
| Frontend (Nginx) | `/var/log/supervisor/frontend.out.log` |
| AI Assistant API | `/tmp/100xprompt-logs/server.log` |
| 100XPrompt Backend | `/tmp/100xprompt-logs/100xprompt.log` |
| Python Backend | `/var/log/supervisor/backend.out.log` |

**View logs:**
```bash
# Tail all 100XPrompt logs
tail -f /tmp/100xprompt-logs/*.log
```
