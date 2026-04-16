import { useAuthStore } from "../store"
import { getDefaultDirectory } from "./workspace"

const API_BASE = "/api"

function getHeaders(): HeadersInit {
  const { apiKey } = useAuthStore.getState()
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "X-API-Key": apiKey } : {}),
  }
}

function getUrl(endpoint: string, directory?: string): string {
  const { serverUrl } = useAuthStore.getState()
  const base = serverUrl || API_BASE
  const dir = directory || getDefaultDirectory()
  const separator = endpoint.includes("?") ? "&" : "?"
  return `${base}${endpoint}${separator}directory=${encodeURIComponent(dir)}`
}

export const api = {
  async get<T>(endpoint: string, directory?: string): Promise<T> {
    const response = await fetch(getUrl(endpoint, directory), {
      method: "GET",
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  },

  async post<T>(endpoint: string, data?: unknown, directory?: string): Promise<T> {
    const response = await fetch(getUrl(endpoint, directory), {
      method: "POST",
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (response.status === 204) return {} as T
    return response.json()
  },

  async put<T>(endpoint: string, data?: unknown, directory?: string): Promise<T> {
    const response = await fetch(getUrl(endpoint, directory), {
      method: "PUT",
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (response.status === 204) return {} as T
    return response.json()
  },

  async delete<T>(endpoint: string, directory?: string): Promise<T> {
    const response = await fetch(getUrl(endpoint, directory), {
      method: "DELETE",
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  },

  async patch<T>(endpoint: string, data?: unknown, directory?: string): Promise<T> {
    const response = await fetch(getUrl(endpoint, directory), {
      method: "PATCH",
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (response.status === 204) return {} as T
    return response.json()
  },

  async *stream(endpoint: string, data: unknown, directory?: string): AsyncGenerator<string, void, unknown> {
    const response = await fetch(getUrl(endpoint, directory), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const reader = response.body?.getReader()
    if (!reader) throw new Error("No reader available")

    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield decoder.decode(value)
    }
  },
}

export const endpoints = {
  providers: () => "/provider",
  sessions: () => "/session",
  session: (id: string) => `/session/${id}`,
  sessionChildren: (id: string) => `/session/${id}/children`,
  sessionFork: (id: string) => `/session/${id}/fork`,
  sessionShare: (id: string) => `/session/${id}/share`,
  sessionDiff: (id: string) => `/session/${id}/diff`,
  messages: (sessionId: string) => `/session/${sessionId}/message`,
  message: (sessionId: string) => `/session/${sessionId}/prompt_async`,
  files: () => "/file",
  file: (path: string) => `/file/${encodeURIComponent(path)}`,
  ptyList: () => "/pty",
  ptyCreate: () => "/pty",
  pty: (id: string) => `/pty/${id}`,
  permissionReply: (requestId: string) => `/permission/${requestId}/reply`,
  questionReply: (requestId: string) => `/question/${requestId}/reply`,
  questionReject: (requestId: string) => `/question/${requestId}/reject`,
  todos: (sessionId: string) => `/session/${sessionId}/todo`,
  todo: (sessionId: string, todoId: string) => `/session/${sessionId}/todo/${todoId}`,
  mcp: () => "/mcp",
  mcpConnect: (name: string) => `/mcp/${encodeURIComponent(name)}/connect`,
  mcpDisconnect: (name: string) => `/mcp/${encodeURIComponent(name)}/disconnect`,
  mcpAuth: (name: string) => `/mcp/${encodeURIComponent(name)}/auth`,
  mcpAuthCallback: (name: string) => `/mcp/${encodeURIComponent(name)}/auth/callback`,
  mcpAuthRemove: (name: string) => `/mcp/${encodeURIComponent(name)}/auth`,
  agents: () => "/agent",
  findText: () => "/find",
  findFile: () => "/find/file",
  findSymbol: () => "/find/symbol",
}
