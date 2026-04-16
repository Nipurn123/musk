import { useState, useEffect, useRef, useMemo } from "react"
import {
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  Search,
  Loader2,
  AlertCircle,
  Terminal as TerminalIcon,
  CheckSquare,
  Square,
  Code2,
  X,
  GitBranch,
  ChevronDown,
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
import { ArtifactViewer } from "../components/ArtifactViewer"
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

// ─── Icon Rail Button ───
function RailButton({ icon: Icon, label, active, onClick, badge, className }: {
  icon: any; label: string; active?: boolean; onClick: () => void; badge?: number; className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative group",
        active ? "bg-surface-hover text-textPrimary" : "text-textMuted hover:text-textSecondary hover:bg-surface-hover/50",
        className,
      )}
      title={label}
    >
      <Icon className="w-[18px] h-[18px]" />
      {badge && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{badge > 9 ? "9+" : badge}</span>
      )}
    </button>
  )
}

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

  // Panel states
  const [sidePanel, setSidePanel] = useState<"sessions" | "search" | null>("sessions")
  const [rightPanel, setRightPanel] = useState<"editor" | "diff" | "terminal" | "todos" | "artifact" | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [artifactData, setArtifactData] = useState<{ filename: string; content: string; isNew: boolean } | null>(null)

  const [isAborting, setIsAborting] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [renameSession, setRenameSession] = useState<Session | null>(null)
  const [shareSession, setShareSession] = useState<Session | null>(null)
  const [deleteSession, setDeleteSession] = useState<Session | null>(null)
  const [forkSession, setForkSession] = useState<Session | null>(null)
  const [childrenSession, setChildrenSession] = useState<Session | null>(null)
  const [diffSession, setDiffSession] = useState<Session | null>(null)

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

  // Listen for artifact open events from file tool cards
  useEffect(() => {
    function handleArtifactOpen(e: CustomEvent<{ filename: string; content: string; isNew: boolean }>) {
      setArtifactData(e.detail)
      setRightPanel("artifact")
    }
    window.addEventListener("artifact:open", handleArtifactOpen as EventListener)
    return () => window.removeEventListener("artifact:open", handleArtifactOpen as EventListener)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault()
        setSidePanel(sidePanel === "search" ? null : "search")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [sidePanel])

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

  // ─── Data Loading ───
  async function loadProviders() {
    try {
      const response = await client.config.providers()
      const data = response.data as {
        providers: Array<{
          id: string; name: string; source: "env" | "config" | "custom" | "api"
          env: string[]; options: Record<string, unknown>; models: Record<string, { status: string }>
        }>
        default: Record<string, string>
      }
      if (!data?.providers || !Array.isArray(data.providers)) throw new Error("Invalid provider response")
      setProviders(data.providers.map((p) => ({ id: p.id, name: p.name, source: p.source, env: p.env, options: p.options, models: p.models })) as Provider[])
      const modelMap: Record<string, string[]> = {}
      data.providers.forEach((provider) => { modelMap[provider.id] = Object.keys(provider.models) })
      if (data.default?.google) {
        setSelectedModel(`google/${data.default.google}`)
      } else {
        const firstProvider = Object.keys(modelMap)[0]
        if (firstProvider && modelMap[firstProvider][0]) setSelectedModel(`${firstProvider}/${modelMap[firstProvider][0]}`)
      }
    } catch (err) { console.error("Failed to load providers:", err); setError("Failed to load providers") }
  }

  async function loadSessions() {
    setIsLoadingSessions(true)
    try {
      const response = await client.session.list()
      const data = response.data as Session[]
      if (!Array.isArray(data)) throw new Error("Invalid session response")
      setSessions(data.sort((a, b) => b.time.updated - a.time.updated))
    } catch (err) { console.error("Failed to load sessions:", err); setError("Failed to load sessions") }
    finally { setIsLoadingSessions(false) }
  }

  async function loadMessages(sessionId: string) {
    try {
      const response = await client.session.messages({ sessionID: sessionId })
      const data = response.data as Array<{ info: Message; parts: Part[] }>
      const msgs: Message[] = []
      data.forEach((msg) => { msgs.push(msg.info); setParts(sessionId, msg.info.id, msg.parts) })
      setMessages(sessionId, msgs.sort((a, b) => a.time.created - b.time.created))
    } catch (err) { console.error("Failed to load messages:", err); setError("Failed to load messages") }
  }

  async function stopSession() {
    if (!currentSessionId || !isLoading) return
    setIsAborting(true)
    try { await client.session.abort({ sessionID: currentSessionId }) }
    catch (err) { console.error("Failed to stop session:", err) }
    finally { setIsAborting(false) }
  }

  async function createSession(): Promise<string> {
    const response = await client.session.create({})
    return (response.data as Session).id
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return
    setError(null)
    let sessionId = currentSessionId
    if (!sessionId) {
      try { sessionId = await createSession(); setCurrentSession(sessionId) }
      catch (err) { setError("Failed to create session"); return }
    }
    const userText = input
    setInput("")
    const slashIndex = selectedModel.indexOf("/")
    const providerID = selectedModel.substring(0, slashIndex)
    const modelID = selectedModel.substring(slashIndex + 1)
    try {
      await client.session.promptAsync({ sessionID: sessionId, parts: [{ type: "text", text: userText }], agent: "build", model: { providerID, modelID } })
      loadSessions()
    } catch (err) {
      console.error("Failed to send message:", err)
      setError(err instanceof Error ? err.message : "Failed to send message")
    }
  }

  const filteredSessions = useMemo(() =>
    sessions.filter((s) =>
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
    ), [sessions, searchQuery])

  const models: Record<string, string[]> = useMemo(() => {
    const map: Record<string, string[]> = {}
    providers.forEach((p) => { map[p.id] = Object.keys(p.models) })
    return map
  }, [providers])

  const currentDiffs = currentSessionId ? diffs.get(currentSessionId) || [] : []
  const currentTodos = currentSessionId ? todos.get(currentSessionId) || [] : []

  // ─── Right panel title ───
  const rightPanelTitle = rightPanel === "editor" ? "Editor" : rightPanel === "diff" ? "Changes" : rightPanel === "terminal" ? "Terminal" : rightPanel === "todos" ? "Tasks" : rightPanel === "artifact" && artifactData ? artifactData.filename.split("/").pop() || "File" : ""

  return (
    <div className="h-screen flex bg-background">

      {/* ═══════════════════ SIDEBAR (Claude text-based) ═══════════════════ */}
      {sidePanel !== null && (
        <div className="w-[260px] bg-surface border-r border-border flex flex-col shrink-0">
          {/* Top nav */}
          <div className="px-3 pt-3 pb-1 space-y-0.5">
            <button
              onClick={() => { setCurrentSession(null) }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-textSecondary hover:bg-surface-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              New chat
            </button>
            <button
              onClick={() => setSidePanel(sidePanel === "search" ? "sessions" : "search")}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
                sidePanel === "search" ? "bg-surface-hover text-textPrimary" : "text-textSecondary hover:bg-surface-hover"
              )}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-textSecondary hover:bg-surface-hover transition-colors"
            >
              <Settings className="w-4 h-4" />
              Customize
            </button>
          </div>

          <div className="mx-3 my-2 border-t border-border" />

          {/* Section links */}
          <div className="px-3 space-y-0.5">
            <button
              onClick={() => setSidePanel("sessions")}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
                sidePanel === "sessions" ? "bg-surface-hover text-textPrimary" : "text-textSecondary hover:bg-surface-hover"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Chats
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === "diff" ? null : "diff")}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
                rightPanel === "diff" ? "bg-surface-hover text-textPrimary" : "text-textSecondary hover:bg-surface-hover"
              )}
            >
              <GitBranch className="w-4 h-4" />
              Changes
              {currentDiffs.length > 0 && (
                <span className="ml-auto text-[11px] text-textMuted bg-surface-hover rounded-full px-1.5">{currentDiffs.length}</span>
              )}
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === "editor" ? null : "editor")}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
                rightPanel === "editor" ? "bg-surface-hover text-textPrimary" : "text-textSecondary hover:bg-surface-hover"
              )}
            >
              <Code2 className="w-4 h-4" />
              Code
            </button>
          </div>

          {/* Recents label */}
          {sidePanel === "sessions" && (
            <>
              <div className="px-6 pt-4 pb-1.5">
                <span className="text-[11px] font-medium text-textMuted">Recents</span>
              </div>

              {/* Sessions list */}
              <div className="flex-1 overflow-y-auto px-2">
                {isLoadingSessions ? (
                  <div className="p-2"><SkeletonList count={5} /></div>
                ) : (
                  filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setCurrentSession(session.id)}
                      className={clsx(
                        "w-full px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer group text-left mb-px",
                        currentSessionId === session.id
                          ? "bg-surface-hover text-textPrimary"
                          : "text-textSecondary hover:bg-surface-hover/50",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] truncate leading-snug">{session.title || "New Chat"}</div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
            </>
          )}

          {sidePanel === "search" && (
            <div className="flex-1 overflow-hidden">
              <SearchPanel
                onClose={() => setSidePanel("sessions")}
                onOpenFile={(path, line) => {
                  setRightPanel("editor")
                }}
              />
            </div>
          )}

          {/* Bottom */}
          <div className="p-3 border-t border-border">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-textMuted hover:text-error hover:bg-error/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ MAIN CHAT AREA ═══════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Error banner */}
        {error && (
          <div className="px-5 py-2.5 bg-error/8 border-b border-error/15 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span className="text-[13px] text-error flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-textMuted hover:text-textPrimary"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <img src="/assets/100X_Prompt.svg" alt="100xprompt" className="w-14 h-14 mx-auto mb-5 object-contain opacity-50" />
                <h3 className="text-xl font-display font-bold mb-1.5 text-textPrimary">What can I help you build?</h3>
                <p className="text-textSecondary text-[14px] leading-relaxed">
                  Write code, fix bugs, explore your codebase, or deploy applications.
                </p>
              </div>
            </div>
          ) : (
            <div className="pb-4">
              {messages.map((msg) => (
                <SessionTurn
                  key={msg.id}
                  role={msg.role}
                  parts={msg.parts}
                  timestamp={new Date(msg.time.created).toISOString()}
                  isLoading={isLoading && msg.id === messages[messages.length - 1]?.id && msg.role === "assistant"}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ─── Input Area (Claude-style) ─── */}
        <div className="px-4 pb-4 pt-1">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage() }}>
              <div
                className="flex flex-col bg-surface rounded-[20px] cursor-text relative transition-all duration-200"
                style={{ boxShadow: '0 0.25rem 1.25rem hsl(0 0% 0% / 8%), 0 0 0 0.5px hsl(0 0% 100% / 6%)' }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0.25rem 1.25rem hsl(0 0% 0% / 16%), 0 0 0 0.5px hsl(0 0% 100% / 10%)' }}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.style.boxShadow = '0 0.25rem 1.25rem hsl(0 0% 0% / 8%), 0 0 0 0.5px hsl(0 0% 100% / 6%)' }}
                onClick={() => inputRef.current?.focus()}
              >
                <div className="flex flex-col m-3.5 gap-2.5">
                  <div className="w-full overflow-y-auto max-h-96 min-h-[1.5rem] pl-1.5 pt-0.5">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                      placeholder="Reply..."
                      className="w-full bg-transparent border-0 focus:outline-none resize-none min-h-[24px] text-[15px] leading-relaxed placeholder:text-textMuted/50"
                      disabled={isLoading}
                      rows={1}
                    />
                  </div>
                  <div className="relative flex gap-2 w-full items-center">
                    <div className="flex-1 flex items-center min-w-0 gap-1">
                      <button type="button" className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary" title="Add files">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="relative">
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="h-8 pl-2.5 pr-6 rounded-lg text-xs font-medium bg-transparent hover:bg-surface-hover transition-colors cursor-pointer appearance-none text-textSecondary focus:outline-none"
                        >
                          {Object.entries(models).map(([provider, modelList]) =>
                            modelList.map((model) => (
                              <option key={`${provider}/${model}`} value={`${provider}/${model}`}>{model}</option>
                            ))
                          )}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-textMuted pointer-events-none opacity-75" />
                      </div>
                      <button
                        type={isLoading ? "button" : "submit"}
                        onClick={isLoading ? stopSession : undefined}
                        disabled={!isLoading && !input.trim()}
                        className={clsx(
                          "h-8 rounded-lg flex items-center justify-center transition-colors px-1.5",
                          isLoading ? "text-error hover:bg-error/10"
                            : input.trim() ? "text-textPrimary hover:bg-surface-hover"
                            : "text-textMuted/30 cursor-not-allowed",
                        )}
                      >
                        {isLoading ? <Square className="w-5 h-5" /> : (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M2.925 4.382a1.686 1.686 0 0 1 2.39-1.307l11.712 5.498a1.16 1.16 0 0 1 0 2.104L5.314 16.175a1.686 1.686 0 0 1-2.389-1.307L3.658 11h5.592a.75.75 0 0 0 0-1.5H3.658z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
            <p className="mt-2 text-[11px] text-center text-textMuted/50">100xprompt can make mistakes. Verify important information.</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════ RIGHT PANEL (editor / diff / terminal / todos) ═══════════════════ */}
      {rightPanel && (
        <div className="w-[420px] bg-surface border-l border-border flex flex-col shrink-0 animate-slide-in-left">
          {/* Header — artifact has its own, skip for that */}
          {rightPanel !== "artifact" && (
            <div className="flex items-center justify-between px-2 py-2 bg-surface gap-2">
              <div className="flex items-center gap-2 flex-1 overflow-hidden pl-3">
                <h2 className="text-sm font-normal text-textSecondary truncate">{rightPanelTitle}</h2>
              </div>
              <button
                onClick={() => setRightPanel(null)}
                className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {rightPanel === "artifact" && artifactData && (
              <ArtifactViewer
                filename={artifactData.filename}
                content={artifactData.content}
                diffType={artifactData.isNew ? "created" : "normal"}
                onClose={() => { setRightPanel(null); setArtifactData(null) }}
              />
            )}
            {rightPanel === "editor" && <CodeEditor />}
            {rightPanel === "diff" && (
              currentSessionId ? <SessionDiffViewer sessionId={currentSessionId} /> : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-textMuted">Select a session to view changes</p>
                </div>
              )
            )}
            {rightPanel === "terminal" && <Terminal />}
            {rightPanel === "todos" && (
              <div className="p-4 overflow-y-auto h-full"><TodoList /></div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ SETTINGS MODAL ═══════════════════ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="w-full max-w-2xl max-h-[80vh] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="h-12 border-b border-border flex items-center px-5 gap-3">
              <Settings className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-display font-semibold flex-1">Settings</span>
              <button onClick={() => setShowSettings(false)} className="w-7 h-7 rounded-md flex items-center justify-center text-textMuted hover:text-textSecondary hover:bg-surface-hover transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-3rem)]"><MCPSettings /></div>
          </div>
        </div>
      )}

      {/* ═══════════════════ DIALOGS ═══════════════════ */}
      {renameSession && <RenameDialog session={renameSession} onClose={() => setRenameSession(null)} />}
      {shareSession && <ShareDialog session={shareSession} onClose={() => setShareSession(null)} />}
      {deleteSession && <DeleteDialog session={deleteSession} onClose={() => setDeleteSession(null)} />}
      {forkSession && <ForkDialog session={forkSession} onClose={() => setForkSession(null)} />}
      {childrenSession && <ChildrenDialog session={childrenSession} onClose={() => setChildrenSession(null)} />}
      {diffSession && <DiffDialog session={diffSession} onClose={() => setDiffSession(null)} />}
    </div>
  )
}
