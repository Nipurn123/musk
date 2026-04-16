import React, { createContext, useContext, useEffect, useMemo, useRef } from "react"
import { create100XPromptClient, type Event } from "@/sdk/v2/client"
import { useGlobalSDK } from "./GlobalSDKContext"
import { useAuthStore } from "../store"

type EventCallback = (event: Event) => void

interface SDKContextValue {
  directory: string
  client: ReturnType<typeof create100XPromptClient>
  event: {
    on: (type: Event["type"] | "*", callback: EventCallback) => () => void
    emit: (event: Event) => void
  }
  url: string
}

const SDKContext = createContext<SDKContextValue | null>(null)

interface SDKProviderProps {
  directory: string
  children: React.ReactNode
}

export function SDKProvider({ directory, children }: SDKProviderProps) {
  const globalSDK = useGlobalSDK()
  const { apiKey } = useAuthStore()
  const eventCallbacksRef = useRef<Map<Event["type"] | "*", Set<EventCallback>>>(new Map())

  const eventEmitter = useMemo(
    () => ({
      on: <T extends Event["type"] | "*">(type: T, callback: EventCallback): (() => void) => {
        const callbacks = eventCallbacksRef.current.get(type) ?? new Set()
        callbacks.add(callback as EventCallback)
        eventCallbacksRef.current.set(type, callbacks)
        return () => {
          callbacks.delete(callback as EventCallback)
        }
      },
      emit: (event: Event): void => {
        const specificCallbacks = eventCallbacksRef.current.get(event.type)
        if (specificCallbacks) {
          specificCallbacks.forEach((cb) => cb(event))
        }
        const wildcardCallbacks = eventCallbacksRef.current.get("*")
        if (wildcardCallbacks) {
          wildcardCallbacks.forEach((cb) => cb(event))
        }
      },
    }),
    [],
  )

  useEffect(() => {
    const unsub = globalSDK.event.on(directory, (event) => {
      eventEmitter.emit(event as any)
    })
    return unsub
  }, [directory, globalSDK.event, eventEmitter])

  const client = useMemo(() => {
    if (!globalSDK.url) return null
    console.log("Creating SDK client with URL:", globalSDK.url, "directory:", directory)
    return create100XPromptClient({
      baseUrl: globalSDK.url,
      directory,
      throwOnError: true,
      headers: {
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
    })
  }, [globalSDK.url, directory, apiKey])

  const value = useMemo(() => {
    if (!client) return null
    return {
      directory,
      client,
      event: eventEmitter,
      url: globalSDK.url,
    }
  }, [directory, client, eventEmitter, globalSDK.url])

  if (!value) return null

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>
}

export function useSDK(): SDKContextValue {
  const context = useContext(SDKContext)
  if (!context) {
    throw new Error("useSDK must be used within SDKProvider")
  }
  return context
}
