import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth Store (Persisted to localStorage)
export const useAuthStore = create(
  persist(
    (set) => ({
      apiKey: null,
      serverUrl: null,
      _hydrated: false,
      setAuth: (apiKey, serverUrl) => set({ apiKey, serverUrl }),
      logout: () => set({ apiKey: null, serverUrl: null }),
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: '100xprompt-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

// Global Store (In-memory)
export const useGlobalStore = create((set, get) => ({
  // Session management
  sessions: [],
  currentSessionId: null,
  sessionStatus: new Map(),

  // Messages & Parts
  messages: new Map(),
  parts: new Map(),

  // Tools
  diffs: new Map(),
  todos: new Map(),

  // Dialogs
  permissions: [],
  questions: [],

  // Config
  providers: [],
  agents: [],
  selectedAgent: 'claude-3-5-sonnet',

  // UI State
  showTerminal: false,
  showRightPanel: false,
  isSidebarCollapsed: false,

  // Session Actions
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
  updateSession: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, ...updates } : s)),
    })),
  deleteSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
    })),
  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),

  // Message Actions
  setMessages: (sessionId, messages) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      newMessages.set(sessionId, messages);
      return { messages: newMessages };
    }),
  addMessage: (sessionId, message) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const sessionMessages = newMessages.get(sessionId) || [];
      newMessages.set(sessionId, [...sessionMessages, message]);
      return { messages: newMessages };
    }),
  updateMessage: (sessionId, messageId, updates) =>
    set((state) => {
      const newMessages = new Map(state.messages);
      const sessionMessages = newMessages.get(sessionId) || [];
      newMessages.set(
        sessionId,
        sessionMessages.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
      );
      return { messages: newMessages };
    }),

  // Part Actions
  setParts: (messageId, parts) =>
    set((state) => {
      const newParts = new Map(state.parts);
      newParts.set(messageId, parts);
      return { parts: newParts };
    }),
  addPart: (messageId, part) =>
    set((state) => {
      const newParts = new Map(state.parts);
      const messageParts = newParts.get(messageId) || [];
      newParts.set(messageId, [...messageParts, part]);
      return { parts: newParts };
    }),

  // Todo Actions
  setTodos: (sessionId, todos) =>
    set((state) => {
      const newTodos = new Map(state.todos);
      newTodos.set(sessionId, todos);
      return { todos: newTodos };
    }),
  addTodo: (sessionId, todo) =>
    set((state) => {
      const newTodos = new Map(state.todos);
      const sessionTodos = newTodos.get(sessionId) || [];
      newTodos.set(sessionId, [...sessionTodos, todo]);
      return { todos: newTodos };
    }),
  updateTodo: (sessionId, todoId, updates) =>
    set((state) => {
      const newTodos = new Map(state.todos);
      const sessionTodos = newTodos.get(sessionId) || [];
      newTodos.set(
        sessionId,
        sessionTodos.map((t) => (t.id === todoId ? { ...t, ...updates } : t))
      );
      return { todos: newTodos };
    }),

  // Diff Actions
  setDiffs: (sessionId, diffs) =>
    set((state) => {
      const newDiffs = new Map(state.diffs);
      newDiffs.set(sessionId, diffs);
      return { diffs: newDiffs };
    }),

  // Dialog Actions
  addPermission: (permission) => set((state) => ({ permissions: [...state.permissions, permission] })),
  removePermission: (id) => set((state) => ({ permissions: state.permissions.filter((p) => p.id !== id) })),
  addQuestion: (question) => set((state) => ({ questions: [...state.questions, question] })),
  removeQuestion: (id) => set((state) => ({ questions: state.questions.filter((q) => q.id !== id) })),

  // UI Actions
  toggleTerminal: () => set((state) => ({ showTerminal: !state.showTerminal })),
  toggleRightPanel: () => set((state) => ({ showRightPanel: !state.showRightPanel })),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
}));