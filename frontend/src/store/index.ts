import React from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  Session,
  Message,
  Part,
  SessionStatus,
  FileDiff,
  Todo,
  PermissionRequest,
  QuestionRequest,
  Provider,
  Agent,
} from "../types"

interface AuthState {
  apiKey: string | null
  serverUrl: string | null
  _hydrated: boolean
  setAuth: (apiKey: string, serverUrl: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiKey: null,
      serverUrl: null,
      _hydrated: false,
      setAuth: (apiKey, serverUrl) => set({ apiKey, serverUrl }),
      logout: () => set({ apiKey: null, serverUrl: null, _hydrated: true }),
    }),
    {
      name: "100xprompt-auth",
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true
      },
    },
  ),
)

interface GlobalState {
  sessions: Session[]
  currentSessionId: string | null
  sessionStatus: Map<string, SessionStatus>
  messages: Map<string, Message[]>
  parts: Map<string, Part[]>
  diffs: Map<string, FileDiff[]>
  todos: Map<string, Todo[]>
  permissions: PermissionRequest[]
  questions: QuestionRequest[]
  providers: Provider[]
  agents: Agent[]
  selectedAgent: string

  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  updateSession: (session: Session) => void
  deleteSession: (sessionId: string) => void
  setCurrentSession: (id: string | null) => void
  setSessionStatus: (sessionId: string, status: SessionStatus) => void

  setMessages: (sessionId: string, messages: Message[]) => void
  addMessage: (sessionId: string, message: Message) => void
  updateMessage: (sessionId: string, message: Message) => void
  removeMessage: (sessionId: string, messageId: string) => void

  setParts: (sessionId: string, messageId: string, parts: Part[]) => void
  addPart: (sessionId: string, messageId: string, part: Part) => void
  updatePart: (sessionId: string, messageId: string, part: Part, delta?: string) => void
  removePart: (sessionId: string, messageId: string, partId: string) => void

  setDiffs: (sessionId: string, diffs: FileDiff[]) => void
  setTodos: (sessionId: string, todos: Todo[]) => void
  addTodo: (sessionId: string, todo: Todo) => void
  updateTodo: (sessionId: string, todoId: string, updates: Partial<Todo>) => void
  deleteTodo: (sessionId: string, todoId: string) => void
  reorderTodos: (sessionId: string, todoIds: string[]) => void

  addPermission: (permission: PermissionRequest) => void
  removePermission: (requestId: string) => void

  addQuestion: (question: QuestionRequest) => void
  removeQuestion: (requestId: string) => void

  setProviders: (providers: Provider[]) => void
  setAgents: (agents: Agent[]) => void
  setSelectedAgent: (agent: string) => void

  clearSession: (sessionId: string) => void
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  sessionStatus: new Map(),
  messages: new Map(),
  parts: new Map(),
  diffs: new Map(),
  todos: new Map(),
  permissions: [],
  questions: [],
  providers: [],
  agents: [],
  selectedAgent: "build",

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions],
    })),

  updateSession: (session) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === session.id ? session : s)),
    })),

  deleteSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
    })),

  setCurrentSession: (id) => set({ currentSessionId: id }),

  setSessionStatus: (sessionId, status) =>
    set((state) => {
      const newStatus = new Map(state.sessionStatus)
      newStatus.set(sessionId, status)
      return { sessionStatus: newStatus }
    }),

  setMessages: (sessionId, messages) =>
    set((state) => {
      const newMessages = new Map(state.messages)
      newMessages.set(sessionId, messages)
      return { messages: newMessages }
    }),

  addMessage: (sessionId, message) =>
    set((state) => {
      const newMessages = new Map(state.messages)
      const existing = newMessages.get(sessionId) || []
      newMessages.set(sessionId, [...existing, message])
      return { messages: newMessages }
    }),

  updateMessage: (sessionId, message) =>
    set((state) => {
      const newMessages = new Map(state.messages)
      const existing = newMessages.get(sessionId) || []
      newMessages.set(
        sessionId,
        existing.map((m) => (m.id === message.id ? message : m)),
      )
      return { messages: newMessages }
    }),

  removeMessage: (sessionId, messageId) =>
    set((state) => {
      const newMessages = new Map(state.messages)
      const existing = newMessages.get(sessionId) || []
      newMessages.set(
        sessionId,
        existing.filter((m) => m.id !== messageId),
      )
      return { messages: newMessages }
    }),

  setParts: (sessionId, messageId, parts) =>
    set((state) => {
      const key = `${sessionId}:${messageId}`
      const newParts = new Map(state.parts)
      newParts.set(key, parts)
      return { parts: newParts }
    }),

  addPart: (sessionId, messageId, part) =>
    set((state) => {
      const key = `${sessionId}:${messageId}`
      const newParts = new Map(state.parts)
      const existing = newParts.get(key) || []
      if (!existing.find((p) => p.id === part.id)) {
        newParts.set(key, [...existing, part])
      }
      return { parts: newParts }
    }),

  updatePart: (sessionId, messageId, part) =>
    set((state) => {
      const key = `${sessionId}:${messageId}`
      const newParts = new Map(state.parts)
      const existing = newParts.get(key) || []

      newParts.set(
        key,
        existing.map((p) => (p.id === part.id ? part : p)),
      )

      return { parts: newParts }
    }),

  removePart: (sessionId, messageId, partId) =>
    set((state) => {
      const key = `${sessionId}:${messageId}`
      const newParts = new Map(state.parts)
      const existing = newParts.get(key) || []
      newParts.set(
        key,
        existing.filter((p) => p.id !== partId),
      )
      return { parts: newParts }
    }),

  setDiffs: (sessionId, diffs) =>
    set((state) => {
      const newDiffs = new Map(state.diffs)
      newDiffs.set(sessionId, diffs)
      return { diffs: newDiffs }
    }),

  setTodos: (sessionId, todos) =>
    set((state) => {
      const newTodos = new Map(state.todos)
      newTodos.set(sessionId, todos)
      return { todos: newTodos }
    }),

  addTodo: (sessionId, todo) =>
    set((state) => {
      const newTodos = new Map(state.todos)
      const existing = newTodos.get(sessionId) || []
      newTodos.set(sessionId, [...existing, todo])
      return { todos: newTodos }
    }),

  updateTodo: (sessionId, todoId, updates) =>
    set((state) => {
      const newTodos = new Map(state.todos)
      const existing = newTodos.get(sessionId) || []
      newTodos.set(
        sessionId,
        existing.map((t) => (t.id === todoId ? { ...t, ...updates } : t)),
      )
      return { todos: newTodos }
    }),

  deleteTodo: (sessionId, todoId) =>
    set((state) => {
      const newTodos = new Map(state.todos)
      const existing = newTodos.get(sessionId) || []
      newTodos.set(
        sessionId,
        existing.filter((t) => t.id !== todoId),
      )
      return { todos: newTodos }
    }),

  reorderTodos: (sessionId, todoIds) =>
    set((state) => {
      const newTodos = new Map(state.todos)
      const existing = newTodos.get(sessionId) || []
      const todoMap = new Map(existing.map((t) => [t.id, t]))
      const reordered = todoIds.map((id) => todoMap.get(id)).filter(Boolean) as Todo[]
      newTodos.set(sessionId, reordered)
      return { todos: newTodos }
    }),

  addPermission: (permission) =>
    set((state) => ({
      permissions: [...state.permissions, permission],
    })),

  removePermission: (requestId) =>
    set((state) => ({
      permissions: state.permissions.filter((p) => p.id !== requestId),
    })),

  addQuestion: (question) =>
    set((state) => ({
      questions: [...state.questions, question],
    })),

  removeQuestion: (requestId) =>
    set((state) => ({
      questions: state.questions.filter((q) => q.id !== requestId),
    })),

  setProviders: (providers) => set({ providers }),

  setAgents: (agents) => set({ agents }),

  setSelectedAgent: (agent) => set({ selectedAgent: agent }),

  clearSession: (sessionId) =>
    set((state) => {
      const newMessages = new Map(state.messages)
      const newParts = new Map(state.parts)
      const newDiffs = new Map(state.diffs)
      const newTodos = new Map(state.todos)
      const newStatus = new Map(state.sessionStatus)

      newMessages.delete(sessionId)
      newDiffs.delete(sessionId)
      newTodos.delete(sessionId)
      newStatus.delete(sessionId)

      for (const key of newParts.keys()) {
        if (key.startsWith(`${sessionId}:`)) {
          newParts.delete(key)
        }
      }

      return {
        messages: newMessages,
        parts: newParts,
        diffs: newDiffs,
        todos: newTodos,
        sessionStatus: newStatus,
      }
    }),
}))

export function useCurrentSessionMessages() {
  const sessionId = useGlobalStore((s) => s.currentSessionId)
  const messages = useGlobalStore((s) => s.messages)
  const parts = useGlobalStore((s) => s.parts)

  const result = React.useMemo(() => {
    if (!sessionId) return []
    const sessionMessages = messages.get(sessionId) || []
    return sessionMessages.map((msg) => ({
      ...msg,
      parts: parts.get(`${sessionId}:${msg.id}`) || [],
    }))
  }, [sessionId, messages, parts])

  return result
}

export function useCurrentSessionStatus() {
  const sessionId = useGlobalStore((s) => s.currentSessionId)
  const status = useGlobalStore((s) => s.sessionStatus)

  return React.useMemo(() => {
    return sessionId
      ? status.get(sessionId) || ({ type: "idle" } as SessionStatus)
      : ({ type: "idle" } as SessionStatus)
  }, [sessionId, status])
}
