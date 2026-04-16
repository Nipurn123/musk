import { useState, useEffect, useRef, useMemo } from "react"
import {
  Send,
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  Search,
  Loader2,
  AlertCircle,
  FolderOpen,
  Terminal as TerminalIcon,
  CheckSquare,
  PanelLeftClose,
  PanelLeft,
  Square,
  Sparkles,
  Code2,
  Zap,
  Bot,
  User,
  ChevronRight,
  MoreVertical,
  Trash2,
  Copy,
  Check,
  X,
  GitBranch,
} from "lucide-react"
import { useAuthStore, useGlobalStore, useCurrentSessionMessages, useCurrentSessionStatus } from "../store"
import { useSDK } from "../context"
import { SessionTurn } from "../components/SessionTurn"
import { FileTree } from "../components/FileTree"
import { Terminal } from "../components/Terminal"
import { TodoList } from "../components/TodoList"
import { DiffPanel } from "../components/DiffPanel"
import { SessionDiffViewer } from "../components/SessionDiffViewer"
import { CodeEditor } from "../components/CodeEditor"
import { useEventHandler } from "../hooks/useEventHandler"
import { SkeletonList } from "../components/ui"
import { MCPSettings } from "../components/MCPSettings"
import { SessionActions } from "../components/SessionActions"
import { RenameDialog } from "../components/RenameDialog"
import { ShareDialog } from "../components/ShareDialog"
import { DeleteDialog } from "../components/DeleteDialog"
import { ForkDialog } from "../components/ForkDialog"
import { ChildrenDialog } from "../components/ChildrenDialog"
import { DiffDialog } from "../components/DiffDialog"
import { AgentSelector } from "../components/AgentSelector"
import { SearchPanel } from "../components/SearchPanel"
import type { Session, Message, Part, Provider } from "../types"
import { clsx } from "clsx"

export default function ChatPage() {
  const { logout, serverUrl } = useAuthStore()
  const { client } = useSDK()
  const {
    sessions,
    currentSessionId,
    providers,
    selectedAgent,
    setSessions,
    setCurrentSession,
    setMessages,
    setParts,
    setProviders,
    diffs,
    todos,
  } = useGlobalStore()

  const messages = useCurrentSessionMessages()
  const sessionStatus = useCurrentSessionStatus()

  useEventHandler()

  const [input, setInput] = useState("")
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [showTerminal, setShowTerminal] = useState(false)
  const [showTodos, setShowTodos] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "diff" | "editor">("chat")
  const [isAborting, setIsAborting] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [copiedSession, setCopiedSession] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [renameSession, setRenameSession] = useState<Session | null>(null)
  const [shareSession, setShareSession] = useState<Session | null>(null)
  const [deleteSession, setDeleteSession] = useState<Session | null>(null)
  const [forkSession, setForkSession] = useState<Session | null>(null)
  const [childrenSession, setChildrenSession] = useState<Session | null>(null)
  const [diffSession, setDiffSession] = useState<Session | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  const isLoading = sessionStatus.type === "busy" || sessionStatus.type === "retry" || isAborting

  useEffect(() => {
    loadProviders()
    loadSessions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId)
    }
  }, [currentSessionId])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault()
        setShowSearch((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const pendingPromptRef = useRef<string | null>(null)

  useEffect(() => {
    function handleSetPrompt(e: CustomEvent<{ prompt: string }>) {
      pendingPromptRef.current = e.detail.prompt
      setInput(e.detail.prompt)
      inputRef.current?.focus()
    }

    async function handleSubmitPrompt(e: CustomEvent<{ prompt?: string }>) {
      const promptToSend = e.detail?.prompt || pendingPromptRef.current || input
      if (promptToSend?.trim()) {
        pendingPromptRef.current = null
        setInput("")
        
        let sessionId = currentSessionId
        if (!sessionId) {
          try {
            sessionId = await createSession()
            setCurrentSession(sessionId)
          } catch (err) {
            setError("Failed to create session")
            return
          }
        }

        const slashIndex = selectedModel.indexOf("/")
        const providerID = selectedModel.substring(0, slashIndex)
        const modelID = selectedModel.substring(slashIndex + 1)

        try {
          await client.session.promptAsync({
            sessionID: sessionId,
            parts: [{ type: "text", text: promptToSend }],
            agent: "build",
            model: { providerID, modelID },
          })
          loadSessions()
        } catch (err) {
          console.error("Failed to send message:", err)
          setError(err instanceof Error ? err.message : "Failed to send message")
        }
      }
    }

    window.addEventListener("ai:set-prompt", handleSetPrompt as unknown as EventListener)
    window.addEventListener("ai:submit-prompt", handleSubmitPrompt as unknown as EventListener)
    return () => {
      window.removeEventListener("ai:set-prompt", handleSetPrompt as unknown as EventListener)
      window.removeEventListener("ai:submit-prompt", handleSubmitPrompt as unknown as EventListener)
    }
  }, [currentSessionId, selectedModel, input])

  async function loadProviders() {
    try {
      const response = await client.config.providers()
      const data = response.data as {
        providers: Array<{
          id: string
          name: string
          source: "env" | "config" | "custom" | "api"
          env: string[]
          options: Record<string, unknown>
          models: Record<string, { status: string }>
        }>
        default: Record<string, string>
      }

      if (!data?.providers || !Array.isArray(data.providers)) {
        throw new Error("Invalid provider response structure")
      }

      setProviders(
        data.providers.map((p) => ({
          id: p.id,
          name: p.name,
          source: p.source,
          env: p.env,
          options: p.options,
          models: p.models,
        })) as Provider[],
      )

      const modelMap: Record<string, string[]> = {}
      data.providers.forEach((provider) => {
        modelMap[provider.id] = Object.keys(provider.models)
      })

      if (data.default?.google) {
        setSelectedModel(`google/${data.default.google}`)
      } else {
        const firstProvider = Object.keys(modelMap)[0]
        if (firstProvider && modelMap[firstProvider][0]) {
          setSelectedModel(`${firstProvider}/${modelMap[firstProvider][0]}`)
        }
      }
    } catch (err) {
      console.error("Failed to load providers:", err)
      setError("Failed to load providers")
    }
  }

  async function loadSessions() {
    setIsLoadingSessions(true)
    try {
      const response = await client.session.list()
      const data = response.data as Session[]

      if (!Array.isArray(data)) {
        throw new Error("Invalid session response structure")
      }

      setSessions(data.sort((a, b) => b.time.updated - a.time.updated))
    } catch (err) {
      console.error("Failed to load sessions:", err)
      setError("Failed to load sessions")
    } finally {
      setIsLoadingSessions(false)
    }
  }

  async function loadMessages(sessionId: string) {
    try {
      const response = await client.session.messages({ sessionID: sessionId })
      const data = response.data as Array<{ info: Message; parts: Part[] }>
      const messages: Message[] = []

      data.forEach((msg) => {
        messages.push(msg.info)
        setParts(sessionId, msg.info.id, msg.parts)
      })

      setMessages(
        sessionId,
        messages.sort((a, b) => a.time.created - b.time.created),
      )
    } catch (err) {
      console.error("Failed to load messages:", err)
      setError("Failed to load messages")
    }
  }

  async function stopSession() {
    if (!currentSessionId || !isLoading) return
    setIsAborting(true)
    try {
      await client.session.abort({ sessionID: currentSessionId })
    } catch (err) {
      console.error("Failed to stop session:", err)
    } finally {
      setIsAborting(false)
    }
  }

  async function createSession(): Promise<string> {
    const response = await client.session.create({})
    const data = response.data as Session
    return data.id
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return
    setError(null)

    let sessionId = currentSessionId
    if (!sessionId) {
      try {
        sessionId = await createSession()
        setCurrentSession(sessionId)
      } catch (err) {
        setError("Failed to create session")
        return
      }
    }

    const userText = input
    setInput("")

    const slashIndex = selectedModel.indexOf("/")
    const providerID = selectedModel.substring(0, slashIndex)
    const modelID = selectedModel.substring(slashIndex + 1)

    try {
      await client.session.promptAsync({
        sessionID: sessionId,
        parts: [{ type: "text", text: userText }],
        agent: "build",
        model: {
          providerID,
          modelID,
        },
      })
      loadSessions()
    } catch (err) {
      console.error("Failed to send message:", err)
      setError(err instanceof Error ? err.message : "Failed to send message")
    }
  }

  const filteredSessions = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.id.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [sessions, searchQuery],
  )

  const models: Record<string, string[]> = useMemo(() => {
    const map: Record<string, string[]> = {}
    providers.forEach((p) => {
      map[p.id] = Object.keys(p.models)
    })
    return map
  }, [providers])

  const currentDiffs = currentSessionId ? diffs.get(currentSessionId) || [] : []
  const currentTodos = currentSessionId ? todos.get(currentSessionId) || [] : []

  return (
    <div className="h-screen flex bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial opacity-30" />
      </div>

      <div className="w-80 bg-surface/80 backdrop-blur-xl border-r border-border/50 flex flex-col relative z-10 animate-slide-in-right">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-white font-bold text-lg">100</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-surface animate-pulse" />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg tracking-tight">100XPrompt</h1>
              <p className="text-xs text-textMuted">AI Coding Assistant</p>
            </div>
          </div>

          <button
            onClick={() => setCurrentSession(null)}
            className="group relative w-full py-3 px-4 rounded-xl font-medium text-white overflow-hidden transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-accent opacity-100" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center justify-center gap-2">
              <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
              New Chat
            </div>
          </button>

          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted transition-colors duration-200 group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:bg-surface transition-all duration-200 placeholder:text-textMuted/70 focus:placeholder:opacity-50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {isLoadingSessions ? (
            <SkeletonList count={5} />
          ) : (
            filteredSessions.map((session, index) => (
              <div
                key={session.id}
                onClick={() => setCurrentSession(session.id)}
                className={clsx(
                  "w-full p-3.5 rounded-xl flex items-start gap-3 transition-all duration-200 text-left group cursor-pointer relative",
                  "animate-slide-up-fade",
                  currentSessionId === session.id
                    ? "bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/25 shadow-md shadow-primary/5"
                    : "hover:bg-surface-hover/70 border border-transparent hover:border-border/50 hover:shadow-sm",
                )}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {currentSessionId === session.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-10 bg-gradient-to-b from-primary via-accent to-primary rounded-r-full animate-pulse" />
                )}
                <div
                  className={clsx(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                    currentSessionId === session.id
                      ? "bg-gradient-to-br from-primary/25 to-accent/25 text-primary"
                      : "bg-surface-hover/50 text-textMuted group-hover:bg-primary/10 group-hover:text-primary",
                  )}
                >
                  <MessageSquare size={16} />
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="text-sm font-medium truncate mb-0.5 group-hover:text-textPrimary transition-colors duration-150">{session.title || "New Chat"}</div>
                  <div className="text-[11px] text-textMuted flex items-center gap-1.5">
                    <span className={clsx(
                      "w-1.5 h-1.5 rounded-full transition-colors duration-200",
                      currentSessionId === session.id ? "bg-primary" : "bg-success/50 group-hover:bg-success/70"
                    )} />
                    <span>{new Date(session.time.updated).toLocaleDateString()}</span>
                    <span className="text-textMuted/40">•</span>
                    <span>{new Date(session.time.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 -mr-1">
                  <SessionActions
                    session={session}
                    onDelete={(s) => setDeleteSession(s)}
                    onFork={(s) => setForkSession(s)}
                    onShare={(s) => setShareSession(s)}
                    onRename={(s) => setRenameSession(s)}
                    onViewChildren={(s) => setChildrenSession(s)}
                    onViewDiff={(s) => setDiffSession(s)}
                    isCurrentSession={currentSessionId === session.id}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border/50 space-y-3 bg-surface/50">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-semibold text-textMuted/80 px-1 tracking-wider">Active Model</label>
            <div className="relative group">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2.5 bg-background/50 border border-border rounded-lg text-xs focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all duration-200 cursor-pointer appearance-none pr-8 hover:border-border/70"
              >
                {Object.entries(models).map(([provider, modelList]) =>
                  modelList.map((model) => (
                    <option key={`${provider}/${model}`} value={`${provider}/${model}`}>
                      {provider} / {model}
                    </option>
                  )),
                )}
              </select>
              <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textMuted rotate-90 pointer-events-none transition-transform duration-200 group-focus-within:text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={clsx(
                "h-10 flex items-center justify-center rounded-lg transition-all duration-200 border focus-visible:ring-2 focus-visible:ring-primary/30",
                showTerminal
                  ? "bg-primary/15 border-primary/30 text-primary shadow-sm"
                  : "hover:bg-surface-hover/80 border-border hover:border-primary/25 hover:shadow-sm",
              )}
              title="Toggle Terminal"
            >
              <TerminalIcon className={clsx("w-4 h-4 transition-transform duration-200", showTerminal && "scale-110")} />
            </button>
            <button
              onClick={() => setShowTodos(!showTodos)}
              className={clsx(
                "h-10 flex items-center justify-center rounded-lg transition-all duration-200 border focus-visible:ring-2 focus-visible:ring-primary/30",
                showTodos
                  ? "bg-primary/15 border-primary/30 text-primary shadow-sm"
                  : "hover:bg-surface-hover/80 border-border hover:border-primary/25 hover:shadow-sm",
              )}
              title="Toggle Todos"
            >
              <CheckSquare className={clsx("w-4 h-4 transition-transform duration-200", showTodos && "scale-110")} />
            </button>
            <button
              onClick={() => setShowSearch(true)}
              className="h-10 flex items-center justify-center rounded-lg transition-all duration-200 border border-border hover:border-primary/25 hover:bg-surface-hover/80 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
              title="Search (Cmd+Shift+F)"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setShowSettings(true)}
              className="h-10 flex items-center justify-center gap-2 hover:bg-surface-hover/80 rounded-lg transition-all duration-200 border border-border hover:border-primary/25 text-textSecondary hover:text-primary hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs font-medium">Settings</span>
            </button>
            <button
              onClick={logout}
              className="h-10 flex items-center justify-center gap-2 hover:bg-error/8 rounded-lg transition-all duration-200 border border-border hover:border-error/25 text-textSecondary hover:text-error hover:shadow-sm focus-visible:ring-2 focus-visible:ring-error/30"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[80vh] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="h-14 border-b border-border flex items-center px-5 gap-3">
              <Settings className="w-5 h-5 text-primary" />
              <span className="font-semibold flex-1">Settings</span>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 hover:bg-surface-hover rounded-lg transition-all flex items-center justify-center text-textMuted hover:text-textPrimary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-3.5rem)]">
              <MCPSettings />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative z-10">
        <div className="h-14 border-b border-border/50 flex items-center px-6 bg-surface/70 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex-1">
            <h2 className="font-bold text-base tracking-tight">
              {currentSessionId ? sessions.find((s) => s.id === currentSessionId)?.title || "New Chat" : "New Chat"}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-textMuted mt-0.5">
              <span className={clsx("w-1.5 h-1.5 rounded-full transition-colors duration-200", isLoading ? "bg-warning" : "bg-success")} />
              <span>Connected to {serverUrl}</span>
            </div>
          </div>

          {currentSessionId && (
            <div className="flex gap-1 bg-surface/60 p-1 rounded-lg border border-border/40">
              <button
                onClick={() => setActiveTab("chat")}
                className={clsx(
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                  activeTab === "chat"
                    ? "bg-primary text-white shadow-sm"
                    : "hover:bg-surface-hover/80 text-textSecondary hover:text-textPrimary",
                )}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab("diff")}
                className={clsx(
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                  activeTab === "diff"
                    ? "bg-primary text-white shadow-sm"
                    : "hover:bg-surface-hover/80 text-textSecondary hover:text-textPrimary",
                )}
              >
                Diffs
                {currentDiffs.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-primary/20">{currentDiffs.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("editor")}
                className={clsx(
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                  activeTab === "editor"
                    ? "bg-primary text-white shadow-sm"
                    : "hover:bg-surface-hover/80 text-textSecondary hover:text-textPrimary",
                )}
              >
                <Code2 className="w-3.5 h-3.5" />
                Editor
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="px-6 py-3 bg-error/10 border-b border-error/20 flex items-center gap-3 animate-slide-up-fade">
            <div className="w-7 h-7 rounded-lg bg-error/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-error" />
            </div>
            <span className="text-sm text-error flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-textMuted hover:text-textPrimary w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {activeTab === "chat" ? (
              <>
                <div className="flex-1 overflow-y-auto bg-background/50">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-8">
                      <div className="text-center max-w-xl animate-slide-up-fade">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-2xl blur-xl animate-pulse" />
                          <div className="relative w-20 h-20 bg-gradient-to-br from-primary/15 to-accent/15 rounded-2xl flex items-center justify-center border border-primary/20">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                              <span className="text-white font-bold text-xl">100</span>
                            </div>
                          </div>
                        </div>
                        <h3 className="text-3xl font-bold mb-3">
                          <span className="text-gradient-animated">How can I help?</span>
                        </h3>
                        <p className="text-textSecondary text-base mb-8 max-w-md mx-auto leading-relaxed">
                          Build applications, fix bugs, or explore codebases. I'm your AI pair programmer.
                        </p>
                        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                          {[
                            { icon: Code2, label: "Build a React app" },
                            { icon: Zap, label: "Refactor auth logic" },
                            { icon: Sparkles, label: "Write unit tests" },
                            { icon: Bot, label: "Explain this repo" },
                          ].map((item, index) => (
                            <button
                              key={item.label}
                              onClick={() => setInput(item.label)}
                              className="group p-3.5 text-left glass-card rounded-xl hover:border-primary/30 transition-all duration-200 hover-lift animate-slide-up-fade focus-visible:ring-2 focus-visible:ring-primary/30"
                              style={{ animationDelay: `${index * 60 + 100}ms` }}
                            >
                              <item.icon className="w-4 h-4 text-primary mb-2 group-hover:scale-110 transition-transform duration-200" />
                              <div className="text-sm font-medium">{item.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pb-12">
                      {messages.map((msg, index) => (
                        <div key={msg.id} className="animate-slide-up-fade" style={{ animationDelay: `${index * 30}ms` }}>
                          <SessionTurn
                            role={msg.role}
                            parts={msg.parts}
                            timestamp={new Date(msg.time.created).toISOString()}
                            isLoading={
                              isLoading && msg.id === messages[messages.length - 1]?.id && msg.role === "assistant"
                            }
                          />
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="p-5 pt-0 bg-gradient-to-t from-background via-background/95 to-transparent">
                  <div className="max-w-3xl mx-auto relative">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        sendMessage()
                      }}
                      className="relative group"
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/15 via-accent/15 to-primary/15 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-400" />
                      <div className="relative bg-surface/95 backdrop-blur-xl rounded-xl overflow-hidden border border-border/50 group-focus-within:border-primary/25 transition-colors duration-200 shadow-lg shadow-black/10">
                        <div className="flex items-center gap-2 px-3.5 py-2 border-b border-border/25">
                          <Sparkles className="w-3.5 h-3.5 text-primary/60" />
                          <span className="text-[11px] text-textMuted font-medium">AI Assistant</span>
                          <div className="flex-1" />
                          <div className="flex items-center gap-1.5">
                            <div className={clsx("w-1.5 h-1.5 rounded-full transition-colors duration-200", isLoading ? "bg-warning" : "bg-success")} />
                            <span className="text-[10px] text-textMuted">
                              {isLoading ? "Processing..." : "Ready"}
                            </span>
                          </div>
                        </div>
                        <textarea
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              sendMessage()
                            }
                          }}
                          placeholder="Ask anything or use / for commands..."
                          className="w-full px-4 py-3.5 bg-transparent border-0 focus:outline-none resize-none min-h-[64px] max-h-40 text-sm leading-relaxed placeholder:text-textMuted/60"
                          disabled={isLoading}
                          rows={1}
                        />
                        <div className="flex items-center justify-between px-3.5 pb-3">
                          <div className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 text-[9px] bg-surface-hover/50 rounded border border-border/30 text-textMuted font-mono">⌘</kbd>
                            <kbd className="px-1.5 py-0.5 text-[9px] bg-surface-hover/50 rounded border border-border/30 text-textMuted font-mono">Enter</kbd>
                          </div>
                          <button
                            type={isLoading ? "button" : "submit"}
                            onClick={isLoading ? stopSession : undefined}
                            disabled={!isLoading && !input.trim()}
                            className={clsx(
                              "relative px-3.5 py-2 flex items-center gap-1.5 rounded-lg font-medium text-xs transition-all duration-200 overflow-hidden",
                              isLoading
                                ? "bg-error/10 hover:bg-error/15 text-error border border-error/20"
                                : input.trim()
                                ? "bg-gradient-to-r from-primary to-accent text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                : "bg-surface-hover/50 text-textMuted cursor-not-allowed",
                            )}
                          >
                            {isLoading ? (
                              <>
                                <Square className="w-3 h-3" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                <span>Send</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
              </form>
              <p className="mt-2.5 text-[10px] text-center text-textMuted/50">
                100XPrompt can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </>
      ) : activeTab === "diff" ? (
              currentSessionId ? (
                <SessionDiffViewer sessionId={currentSessionId} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <GitBranch className="w-12 h-12 text-textMuted mx-auto mb-3" />
                    <p className="text-sm text-textMuted">Select a session to view changes</p>
                  </div>
                </div>
              )
            ) : (
              <CodeEditor />
            )}
          </div>

          {showTodos && currentTodos.length > 0 && (
            <div className="w-80 bg-surface/80 backdrop-blur-xl border-l border-border/50 flex flex-col animate-slide-in-left">
              <div className="h-14 border-b border-border/50 flex items-center px-4 gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold flex-1">Tasks</span>
                <button
                  onClick={() => setShowTodos(false)}
                  className="w-8 h-8 hover:bg-surface-hover rounded-lg transition-all flex items-center justify-center text-textMuted hover:text-textPrimary"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <TodoList />
              </div>
            </div>
          )}
        </div>

        {showTerminal && (
          <div className="h-72 bg-surface/80 backdrop-blur-xl border-t border-border/50 flex flex-col animate-fade-in-up">
            <div className="h-12 border-b border-border/50 flex items-center px-4 gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TerminalIcon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold flex-1">Terminal</span>
              <button
                onClick={() => setShowTerminal(false)}
                className="w-8 h-8 hover:bg-surface-hover rounded-lg transition-all flex items-center justify-center text-textMuted hover:text-textPrimary"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Terminal />
            </div>
          </div>
        )}
      </div>

      {showSearch && (
        <SearchPanel
          onClose={() => setShowSearch(false)}
          onOpenFile={(path, line) => {
            setActiveTab("editor")
            setShowSearch(false)
          }}
        />
      )}
    </div>
  )
}
