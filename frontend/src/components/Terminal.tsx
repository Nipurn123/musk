import { useEffect, useRef, useCallback, useState } from "react"
import { Terminal as XTerm } from "xterm"
import { FitAddon } from "xterm-addon-fit"
import { WebLinksAddon } from "xterm-addon-web-links"
import { X, Terminal as TerminalIcon, Loader2, AlertCircle } from "lucide-react"
import { api, endpoints } from "../lib/api"
import { useAuthStore } from "../store"
import { getDefaultDirectory } from "../lib/workspace"

interface TerminalProps {
  onClose?: () => void
}

interface PTYInfo {
  id: string
  title: string
  command: string
  args: string[]
  cwd: string
  status: "running" | "exited"
  pid: number
}

export function Terminal({ onClose }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const shouldReconnectRef = useRef(true)

  const [ptyId, setPtyId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { serverUrl } = useAuthStore()

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

  const initTerminal = useCallback(() => {
    if (!containerRef.current || terminalRef.current) return

    const term = new XTerm({
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

    term.open(containerRef.current)
    fitAddon.fit()

    term.attachCustomKeyEventHandler((event) => {
      const key = event.key.toLowerCase()

      if (event.ctrlKey && event.shiftKey && !event.metaKey && key === "c") {
        const selection = term.getSelection()
        if (selection) {
          navigator.clipboard.writeText(selection).catch(() => {})
          return false
        }
      }

      if (event.metaKey && !event.ctrlKey && !event.altKey && key === "c") {
        const selection = term.getSelection()
        if (selection) {
          navigator.clipboard.writeText(selection).catch(() => {})
          return false
        }
      }

      if (event.metaKey && !event.ctrlKey && !event.altKey && key === "v") {
        return true
      }

      return true
    })

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
  }, [write, resize])

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
        setError("WebSocket connection error")
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

  const createTerminal = useCallback(async () => {
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
      const errorMsg = err instanceof Error ? err.message : "Failed to create terminal"
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [loading, ptyId, connectWebSocket])

  useEffect(() => {
    initTerminal()

    return () => {
      destroy()
    }
  }, [initTerminal, destroy])

  useEffect(() => {
    if (ptyId && terminalRef.current && !connected && !loading) {
      connectWebSocket(ptyId)
    }
  }, [ptyId, connected, loading, connectWebSocket])

  return (
    <div className="h-full flex flex-col bg-surface border-l border-border">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Terminal</span>
          {connected && (
            <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] rounded-full">Connected</span>
          )}
          {error && (
            <span className="px-2 py-0.5 bg-error/10 text-error text-[10px] rounded-full flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Error
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={createTerminal}
            disabled={loading}
            className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "New"}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-surfaceHover rounded transition-colors">
              <X className="w-3.5 h-3.5 text-textMuted" />
            </button>
          )}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden bg-background" />
    </div>
  )
}
