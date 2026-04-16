import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import http from 'http'

const app = express()
app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  console.log(`[Server] Request received: ${req.method} ${req.url}`)
  next()
})

const BACKEND_URL = 'http://127.0.0.1:4096'
const HEARTBEAT_INTERVAL = 1000

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
      const isSSE = proxyRes.headers['content-type']?.includes('text/event-stream')

      if (!isSSE) {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
        proxyRes.pipe(res)
        return
      }

      const headers = { ...proxyRes.headers }
      delete headers['content-length']
      delete headers['content-encoding']
      headers['content-type'] = 'text/event-stream'
      headers['cache-control'] = 'no-cache, no-store, no-transform, must-revalidate'
      headers['connection'] = 'keep-alive'
      headers['x-accel-buffering'] = 'no'
      headers['x-content-type-options'] = 'nosniff'

      res.writeHead(proxyRes.statusCode || 200, headers)

      console.log(`[SSE Proxy] Started stream for ${path}`)

      let heartbeatTimer: NodeJS.Timeout

      const resetHeartbeat = () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        heartbeatTimer = setInterval(() => {
          res.write(': heartbeat\n\n')
        }, HEARTBEAT_INTERVAL)
      }

      resetHeartbeat()

      proxyRes.on('data', (chunk) => {
        const written = res.write(chunk)
        // @ts-ignore
        if (typeof res.flush === 'function') res.flush()
        console.log(`[SSE Proxy] Data: ${chunk.length} bytes, written: ${written}`)
        resetHeartbeat()
      })

      proxyRes.on('end', () => {
        console.log(`[SSE Proxy] Stream ended for ${path}`)
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        res.end()
      })

      proxyRes.on('error', (err) => {
        console.error(`[SSE Proxy] Stream error for ${path}:`, err)
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        res.end()
      })

      req.on('close', () => {
        console.log(`[SSE Proxy] Client closed connection for ${path}`)
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        proxyReq.destroy()
      })
    })

    proxyReq.on('error', (err) => {
      console.error('Proxy request error:', err)
      res.status(502).json({ error: 'Proxy error' })
    })

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (req.body && Object.keys(req.body).length > 0) {
        proxyReq.write(JSON.stringify(req.body))
      }
    }
    proxyReq.end()
  }
}

app.use(createSSEProxy(/\/global\/event/))

const LIVEKIT_URL = process.env.LIVEKIT_URL || ''
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL || 'http://34.45.161.177:8080'

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error('Missing LiveKit credentials. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET in .env')
  process.exit(1)
}

const roomService = new RoomServiceClient(
  LIVEKIT_URL.replace('wss://', 'https://'),
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
)

async function startCloudRunAgent(roomId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${CLOUD_RUN_URL}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      room_name: roomId,
      livekit_url: LIVEKIT_URL,
      api_key: LIVEKIT_API_KEY,
      api_secret: LIVEKIT_API_SECRET,
    }),
  })
  return response.json() as Promise<{ success: boolean }>
}

async function stopCloudRunAgent(roomId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${CLOUD_RUN_URL}/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_name: roomId }),
  })
  return response.json() as Promise<{ success: boolean }>
}

app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { action } = req.body

    if (action === 'start') {
      const roomId = `ai-assistant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      await roomService.createRoom({
        name: roomId,
        emptyTimeout: 1800,
        maxParticipants: 2,
      })

      const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: `user-${Date.now()}`,
        ttl: '1h',
      })

      token.addGrant({
        room: roomId,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      })

      const accessToken = await token.toJwt()

      const result = await startCloudRunAgent(roomId)
      if (!result.success) {
        console.error('Failed to start Cloud Run agent')
      }

      res.json({
        success: true,
        roomId,
        token: accessToken,
        url: LIVEKIT_URL,
      })
    } else if (action === 'stop') {
      const { roomId } = req.body

      await stopCloudRunAgent(roomId)

      try {
        await roomService.deleteRoom(roomId)
      } catch (e) {
        console.log('Room already deleted or not found')
      }

      res.json({ success: true })
    } else {
      res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('AI Assistant error:', error)
    res.status(500).json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown',
    })
  }
})

app.get('/api/ai-assistant', async (req, res) => {
  const response = await fetch(`${CLOUD_RUN_URL}/health`)
  const data = await response.json()
  res.json(data)
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`AI Assistant API running on port ${PORT}`)
})
