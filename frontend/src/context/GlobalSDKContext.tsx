import React, { createContext, useContext, useEffect, useMemo, useRef } from "react"
import { unstable_batchedUpdates } from "react-dom"
import { create100XPromptClient, type Event } from "@/sdk/v2/client"
import { useServer } from "./ServerContext"

type EventCallback = (event: Event) => void

interface GlobalSDKContextValue {
  url: string
  client: ReturnType<typeof create100XPromptClient>
  event: {
    on: (directory: string, callback: EventCallback) => () => void
    emit: (directory: string, event: Event) => void
  }
}

const GlobalSDKContext = createContext<GlobalSDKContextValue | null>(null)

interface GlobalSDKProviderProps {
  children: React.ReactNode
}

export function GlobalSDKProvider({ children }: GlobalSDKProviderProps) {
  const server = useServer()
  const abortControllerRef = useRef<AbortController | null>(null)
  const eventCallbacksRef = useRef<Map<string, Set<EventCallback>>>(new Map())

  const eventEmitter = useMemo(
    () => ({
      on: (directory: string, callback: EventCallback): (() => void) => {
        const callbacks = eventCallbacksRef.current.get(directory) ?? new Set()
        callbacks.add(callback)
        eventCallbacksRef.current.set(directory, callbacks)
        return () => {
          callbacks.delete(callback)
        }
      },
      emit: (directory: string, event: Event): void => {
        const callbacks = eventCallbacksRef.current.get(directory)
        if (callbacks) {
          callbacks.forEach((cb) => cb(event))
        }
      },
    }),
    [],
  )

  useEffect(() => {
    const abort = new AbortController()
    abortControllerRef.current = abort

    const eventSdk = create100XPromptClient({
      baseUrl: server.url,
      signal: abort.signal,
    })

    type Queued = { directory: string; payload: Event }

    let queue: Array<Queued | undefined> = []
    const coalesced = new Map<string, number>()
    let timer: ReturnType<typeof setTimeout> | undefined
    let last = 0

    const key = (directory: string, payload: Event): string | undefined => {
      if (payload.type === "session.status") return `session.status:${directory}:${payload.properties.sessionID}`
      if (payload.type === "lsp.updated") return `lsp.updated:${directory}`
      if (payload.type === "message.part.updated") {
        const part = payload.properties.part
        return `message.part.updated:${directory}:${part.messageID}:${part.id}`
      }
      return undefined
    }

    const flush = () => {
      if (timer) clearTimeout(timer)
      timer = undefined

      const events = queue
      queue = []
      coalesced.clear()
      if (events.length === 0) return

      last = Date.now()
      unstable_batchedUpdates(() => {
        for (const event of events) {
          if (!event) continue
          eventEmitter.emit(event.directory, event.payload)
        }
      })
    }

    const schedule = () => {
      if (timer) return
      const elapsed = Date.now() - last
      timer = setTimeout(flush, Math.max(0, 16 - elapsed))
    }

    const stop = () => {
      flush()
    }

    void (async () => {
      try {
        const events = await eventSdk.global.event()
        let yielded = Date.now()
        for await (const event of events.stream) {
          const directory = event.directory ?? "global"
          const payload = event.payload
          const k = key(directory, payload)
          if (k) {
            const i = coalesced.get(k)
            if (i !== undefined) {
              queue[i] = undefined
            }
            coalesced.set(k, queue.length)
          }
          queue.push({ directory, payload })
          schedule()

          if (Date.now() - yielded < 8) continue
          yielded = Date.now()
          await new Promise<void>((resolve) => setTimeout(resolve, 0))
        }
      } catch (e) {
        console.error("Event stream error", e)
      } finally {
        stop()
      }
    })()

    return () => {
      abort.abort()
      stop()
    }
  }, [server.url, eventEmitter])

  const client = useMemo(() => {
    if (!server.ready || !server.url) return null
    console.log("Creating Global SDK client with URL:", server.url)
    return create100XPromptClient({
      baseUrl: server.url,
      throwOnError: true,
    })
  }, [server.ready, server.url])

  const value = useMemo(() => {
    if (!client) return null
    return {
      url: server.url,
      client,
      event: eventEmitter,
    }
  }, [server.url, client, eventEmitter])

  if (!value) return null

  return <GlobalSDKContext.Provider value={value}>{children}</GlobalSDKContext.Provider>
}

export function useGlobalSDK(): GlobalSDKContextValue {
  const context = useContext(GlobalSDKContext)
  if (!context) {
    throw new Error("useGlobalSDK must be used within GlobalSDKProvider")
  }
  return context
}
