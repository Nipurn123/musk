import { useEffect, useRef, useCallback, useState } from "react"
import { Terminal } from "xterm"
import { FitAddon } from "xterm-addon-fit"
import { WebLinksAddon } from "xterm-addon-web-links"
import { api, endpoints } from "../lib/api"
import { useAuthStore } from "../store"
import { getDefaultDirectory } from "../lib/workspace"

interface PTYInfo {
  id: string
  title: string
  command: string
  args: string[]
  cwd: string
  status: "running" | "exited"
  pid: number
}

interface UseTerminalOptions {
  command?: string
  args?: string[]
  cwd?: string
  title?: string
  rows?: number
  cols?: number
  onExit?: (exitCode: number) => void
  onError?: (error: Error) => void
}

interface UseTerminalReturn {
  terminal: Terminal | null
  ptyId: string | null
  connected: boolean
  loading: boolean
  error: Error | null
  create: () => Promise<void>
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
  destroy: () => void
}

export function useTerminal(options: UseTerminalOptions = {}): UseTerminalReturn {
  const [ptyId, setPtyId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const terminalRef = useRef<Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const listenersAttachedRef = useRef(false)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const shouldReconnectRef = useRef(true)

  const { serverUrl, apiKey } = useAuthStore()

  const create = useCallback(async () => {
    if (loading || ptyId) return

    setLoading(true)
    setError(null)

    try {
      const pty = await api.post<PTYInfo>(endpoints.ptyCreate(), {
        command: options.command || "bash",
        args: options.args || [],
        cwd: options.cwd,
        title: options.title,
      })

      setPtyId(pty.id)

      if (terminalRef.current && pty.id) {
        await connectWebSocket(pty.id)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create PTY")
      setError(error)
      options.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [loading, ptyId, options])

  const connectWebSocket = useCallback(
    async (id: string) => {
      const base = serverUrl || window.location.origin
      const wsProtocol = base.startsWith("https") ? "wss" : "ws"
      const wsBase = base.replace(/^https?/, wsProtocol)

      const wsUrl = `${wsBase}/api/pty/${id}/connect?directory=${encodeURIComponent(getDefaultDirectory())}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)

        if (terminalRef.current) {
          const term = terminalRef.current
          api
            .put(endpoints.pty(id), {
              size: { rows: term.rows, cols: term.cols },
            })
            .catch(() => {})
        }
      }

      ws.onmessage = (event) => {
        if (terminalRef.current) {
          terminalRef.current.write(event.data)
        }
      }

      ws.onerror = (event) => {
        const error = new Error("WebSocket connection error")
        setError(error)
        options.onError?.(error)
      }

      ws.onclose = (event) => {
        setConnected(false)
        wsRef.current = null

        if (shouldReconnectRef.current && !event.wasClean) {
          console.log("Terminal WebSocket disconnected, reconnecting in 1s...")
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (shouldReconnectRef.current && ptyId) {
              connectWebSocket(ptyId)
            }
          }, 1000)
        }
      }
    },
    [serverUrl],
  )

  const write = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    }
  }, [])

  const resize = useCallback(
    (cols: number, rows: number) => {
      if (ptyId) {
        api
          .put(endpoints.pty(ptyId), {
            size: { cols, rows },
          })
          .catch(() => {})
      }
    },
    [ptyId],
  )

  const destroy = useCallback(() => {
    shouldReconnectRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (terminalRef.current) {
      terminalRef.current.dispose()
      terminalRef.current = null
    }

    if (ptyId) {
      api.delete(endpoints.pty(ptyId)).catch(() => {})
    }

    setPtyId(null)
    setConnected(false)
  }, [ptyId])

  const initTerminal = useCallback(
    (container: HTMLDivElement) => {
      containerRef.current = container

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontSize: 14,
        fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
        allowTransparency: true,
        theme: {
          background: "#191515",
          foreground: "#d4d4d4",
          cursor: "#d4d4d4",
          selectionBackground: "rgba(212, 212, 212, 0.25)",
          black: "#000000",
          red: "#cd3131",
          green: "#0dbc79",
          yellow: "#e5e510",
          blue: "#2472c8",
          magenta: "#bc3fbc",
          cyan: "#11a8cd",
          white: "#e5e5e5",
          brightBlack: "#666666",
          brightRed: "#f14c4c",
          brightGreen: "#23d18b",
          brightYellow: "#f5f543",
          brightBlue: "#3b8eea",
          brightMagenta: "#d670d6",
          brightCyan: "#29b8db",
          brightWhite: "#e5e5e5",
        },
        scrollback: 10000,
      })

      terminalRef.current = term

      const fitAddon = new FitAddon()
      fitAddonRef.current = fitAddon
      term.loadAddon(fitAddon)

      const webLinksAddon = new WebLinksAddon()
      term.loadAddon(webLinksAddon)

      term.open(container)
      fitAddon.fit()

      term.onData((data) => {
        write(data)
      })

      term.onResize(({ cols, rows }) => {
        resize(cols, rows)
      })

      const handleResize = () => {
        fitAddon.fit()
      }

      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
      }
    },
    [write, resize],
  )

  useEffect(() => {
    return () => {
      destroy()
    }
  }, [destroy])

  useEffect(() => {
    if (ptyId && terminalRef.current && !connected) {
      connectWebSocket(ptyId)
    }
  }, [ptyId, connected, connectWebSocket])

  return {
    terminal: terminalRef.current,
    ptyId,
    connected,
    loading,
    error,
    create,
    write,
    resize,
    destroy,
  }
}

export function useTerminalInstance(containerRef: React.RefObject<HTMLDivElement>) {
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const listenersAttachedRef = useRef(false)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const shouldReconnectRef = useRef(true)
  const [ptyId, setPtyId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { serverUrl } = useAuthStore()

  const initTerminal = useCallback(() => {
    if (!containerRef.current || terminalRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 14,
      fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
      allowTransparency: true,
      theme: {
        background: "#191515",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        selectionBackground: "rgba(212, 212, 212, 0.25)",
      },
      scrollback: 10000,
    })

    terminalRef.current = term

    const fitAddon = new FitAddon()
    fitAddonRef.current = fitAddon
    term.loadAddon(fitAddon)

    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(webLinksAddon)

    term.open(containerRef.current)
    fitAddon.fit()

    const handleResize = () => fitAddon.fit()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [containerRef])

  const createPTY = useCallback(async () => {
    if (loading || ptyId) return

    setLoading(true)
    setError(null)

    try {
      const pty = await api.post<PTYInfo>(endpoints.ptyCreate(), {
        command: "bash",
        title: "Terminal",
      })

      setPtyId(pty.id)

      if (terminalRef.current) {
        connectWebSocket(pty.id)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create PTY")
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [loading, ptyId])

  const connectWebSocket = useCallback(
    (id: string) => {
      const base = serverUrl || window.location.origin
      const wsProtocol = base.startsWith("https") ? "wss" : "ws"
      const wsBase = base.replace(/^https?/, wsProtocol)

      const wsUrl = `${wsBase}/api/pty/${id}/connect?directory=${encodeURIComponent(getDefaultDirectory())}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)

        if (terminalRef.current) {
          const term = terminalRef.current
          api
            .put(endpoints.pty(id), {
              size: { rows: term.rows, cols: term.cols },
            })
            .catch(() => {})
        }
      }

      ws.onmessage = (event) => {
        terminalRef.current?.write(event.data)
      }

      ws.onerror = () => {
        setError(new Error("WebSocket connection error"))
      }

      ws.onclose = (event) => {
        setConnected(false)
        wsRef.current = null

        if (shouldReconnectRef.current && !event.wasClean) {
          console.log("Terminal WebSocket disconnected, reconnecting in 1s...")
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (shouldReconnectRef.current && ptyId) {
              connectWebSocket(ptyId)
            }
          }, 1000)
        }
      }
    },
    [serverUrl],
  )

  const write = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    }
  }, [])

  const resize = useCallback(
    (cols: number, rows: number) => {
      if (ptyId) {
        api
          .put(endpoints.pty(ptyId), {
            size: { cols, rows },
          })
          .catch(() => {})
      }
    },
    [ptyId],
  )

  const destroy = useCallback(() => {
    shouldReconnectRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    wsRef.current?.close()
    wsRef.current = null
    terminalRef.current?.dispose()
    terminalRef.current = null

    if (ptyId) {
      api.delete(endpoints.pty(ptyId)).catch(() => {})
    }

    setPtyId(null)
    setConnected(false)
  }, [ptyId])

  useEffect(() => {
    initTerminal()

    return () => {
      destroy()
    }
  }, [initTerminal, destroy])

  useEffect(() => {
    if (terminalRef.current && !listenersAttachedRef.current) {
      terminalRef.current.onData((data) => write(data))
      listenersAttachedRef.current = true
    }
  }, [terminalRef.current, write])

  useEffect(() => {
    if (terminalRef.current && !listenersAttachedRef.current) {
      terminalRef.current.onResize(({ cols, rows }) => resize(cols, rows))
    }
  }, [terminalRef.current, resize])

  return {
    terminal: terminalRef.current,
    ptyId,
    connected,
    loading,
    error,
    create: createPTY,
    write,
    resize,
    destroy,
  }
}
