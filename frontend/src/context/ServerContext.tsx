import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"
import { create100XPromptClient } from "@/sdk/v2/client"

type StoredProject = { worktree: string; expanded: boolean }

interface ServerState {
  list: string[]
  projects: Record<string, StoredProject[]>
}

interface ServerContextValue {
  ready: boolean
  healthy: boolean | undefined
  isLocal: boolean
  url: string
  name: string
  list: string[]
  setActive: (input: string) => void
  add: (input: string) => void
  remove: (input: string) => void
  projects: {
    list: StoredProject[]
    open: (directory: string) => void
    close: (directory: string) => void
    expand: (directory: string) => void
    collapse: (directory: string) => void
    move: (directory: string, toIndex: number) => void
  }
}

const ServerContext = createContext<ServerContextValue | null>(null)

const STORAGE_KEY = "100xprompt-server-v3"

function normalizeServerUrl(input: string): string | undefined {
  const trimmed = input.trim()
  if (!trimmed) return undefined
  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`
  return withProtocol.replace(/\/+$/, "")
}

function serverDisplayName(url: string): string {
  if (!url) return ""
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "")
}

function projectsKey(url: string): string {
  if (!url) return ""
  const host = url.replace(/^https?:\/\//, "").split(":")[0]
  if (host === "localhost" || host === "127.0.0.1") return "local"
  return url
}

function loadState(): ServerState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error("Failed to load server state", e)
  }
  return { list: [], projects: {} }
}

function saveState(state: ServerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error("Failed to save server state", e)
  }
}

interface ServerProviderProps {
  defaultUrl: string
  children: React.ReactNode
}

export function ServerProvider({ defaultUrl, children }: ServerProviderProps) {
  const [state, setState] = useState<ServerState>(loadState)
  const [active, setActiveRaw] = useState<string>("")
  const [healthy, setHealthy] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (active) return
    const url = normalizeServerUrl(defaultUrl)
    if (!url) return
    setActiveRaw(url)
  }, [active, defaultUrl])

  useEffect(() => {
    if (!active) return

    setHealthy(undefined)

    let alive = true
    let busy = false

    const check = async (url: string): Promise<boolean> => {
      try {
        const sdk = create100XPromptClient({
          baseUrl: url,
          signal: AbortSignal.timeout(3000),
        })
        const result = await sdk.global.health()
        return result.data?.healthy === true
      } catch {
        return false
      }
    }

    const run = async () => {
      if (busy) return
      busy = true
      try {
        const next = await check(active)
        if (alive) {
          setHealthy(next)
        }
      } finally {
        busy = false
      }
    }

    run()
    const interval = setInterval(run, 10_000)

    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [active])

  const setActive = useCallback((input: string) => {
    const url = normalizeServerUrl(input)
    if (!url) return
    setActiveRaw(url)
  }, [])

  const add = useCallback(
    (input: string) => {
      const url = normalizeServerUrl(input)
      if (!url) return

      const fallback = normalizeServerUrl(defaultUrl)
      if (fallback && url === fallback) {
        setActiveRaw(url)
        return
      }

      setState((prev) => {
        if (prev.list.includes(url)) {
          return prev
        }
        return {
          ...prev,
          list: [...prev.list, url],
        }
      })
      setActiveRaw(url)
    },
    [defaultUrl],
  )

  const remove = useCallback(
    (input: string) => {
      const url = normalizeServerUrl(input)
      if (!url) return

      setState((prev) => {
        const list = prev.list.filter((x) => x !== url)
        return {
          ...prev,
          list,
        }
      })

      setActiveRaw((current) => {
        if (current === url) {
          const fallback = normalizeServerUrl(defaultUrl)
          return state.list.filter((x) => x !== url)[0] ?? fallback ?? ""
        }
        return current
      })
    },
    [defaultUrl, state.list],
  )

  const origin = useMemo(() => projectsKey(active), [active])
  const projectsList = useMemo(() => state.projects[origin] ?? [], [state.projects, origin])
  const isLocal = useMemo(() => origin === "local", [origin])

  const projectsActions = useMemo(
    () => ({
      list: projectsList,
      open: (directory: string) => {
        const key = origin
        if (!key) return
        setState((prev) => {
          const current = prev.projects[key] ?? []
          if (current.find((x) => x.worktree === directory)) return prev
          return {
            ...prev,
            projects: {
              ...prev.projects,
              [key]: [{ worktree: directory, expanded: true }, ...current],
            },
          }
        })
      },
      close: (directory: string) => {
        const key = origin
        if (!key) return
        setState((prev) => {
          const current = prev.projects[key] ?? []
          return {
            ...prev,
            projects: {
              ...prev.projects,
              [key]: current.filter((x) => x.worktree !== directory),
            },
          }
        })
      },
      expand: (directory: string) => {
        const key = origin
        if (!key) return
        setState((prev) => {
          const current = prev.projects[key] ?? []
          const index = current.findIndex((x) => x.worktree === directory)
          if (index === -1) return prev
          const updated = [...current]
          updated[index] = { ...updated[index], expanded: true }
          return {
            ...prev,
            projects: {
              ...prev.projects,
              [key]: updated,
            },
          }
        })
      },
      collapse: (directory: string) => {
        const key = origin
        if (!key) return
        setState((prev) => {
          const current = prev.projects[key] ?? []
          const index = current.findIndex((x) => x.worktree === directory)
          if (index === -1) return prev
          const updated = [...current]
          updated[index] = { ...updated[index], expanded: false }
          return {
            ...prev,
            projects: {
              ...prev.projects,
              [key]: updated,
            },
          }
        })
      },
      move: (directory: string, toIndex: number) => {
        const key = origin
        if (!key) return
        setState((prev) => {
          const current = prev.projects[key] ?? []
          const fromIndex = current.findIndex((x) => x.worktree === directory)
          if (fromIndex === -1 || fromIndex === toIndex) return prev
          const result = [...current]
          const [item] = result.splice(fromIndex, 1)
          result.splice(toIndex, 0, item)
          return {
            ...prev,
            projects: {
              ...prev.projects,
              [key]: result,
            },
          }
        })
      },
    }),
    [origin, projectsList],
  )

  const value = useMemo<ServerContextValue>(
    () => ({
      ready: !!active,
      healthy,
      isLocal,
      url: active,
      name: serverDisplayName(active),
      list: state.list,
      setActive,
      add,
      remove,
      projects: projectsActions,
    }),
    [active, healthy, isLocal, state.list, setActive, add, remove, projectsActions],
  )

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>
}

export function useServer(): ServerContextValue {
  const context = useContext(ServerContext)
  if (!context) {
    throw new Error("useServer must be used within ServerProvider")
  }
  return context
}
