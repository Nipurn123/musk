import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  Search,
  AlertCircle,
  Terminal as TerminalIcon,
  CheckSquare,
  Square,
  X,
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react"
import { useAuthStore, useGlobalStore, useCurrentSessionMessages, useCurrentSessionStatus } from "../store"
import { useSDK, useLayout } from "../context"
import { SessionTurn } from "../components/SessionTurn"
import { Terminal } from "../components/Terminal"
import { TodoList } from "../components/TodoList"
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
import { SearchPanel } from "../components/SearchPanel"
import type { Session, Message, Part, Provider } from "../types"
import { clsx } from "clsx"

export default function ChatPage() {
  const { logout } = useAuthStore()
  const { client } = useSDK()
  const {
    sessions,
    currentSessionId,
    providers,
    setSessions,
    setCurrentSession,
    setMessages,
    setParts,
    setProviders,
  } = useGlobalStore()

  const messages = useCurrentSessionMessages()
  const sessionStatus = useCurrentSessionStatus()

  useEventHandler()

  const groupedMessages = useMemo(() => {
    const result: any[] = []
    for (const msg of messages) {
      const last = result[result.length - 1]
      const isToolOnly = msg.role === "assistant" && !msg.parts.some((p: any) => p.type === "text" || p.type === "image")
      
      if (last && last.role === "assistant" && msg.role === "assistant" && isToolOnly) {
        last.parts = [...last.parts, ...msg.parts]
        last.id = msg.id // Keep latest ID for loading state checks
        continue
      }
      result.push({ ...msg, parts: [...msg.parts] })
    }
    return result
  }, [messages])

  const [input, setInput] = useState("")
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [selectedImages, setSelectedImages] = useState<{ url: string, file: File }[]>([])
  const [searchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modelSelectorRef = useRef<HTMLDivElement>(null)

  // Layout context
  const { sidebar, rightPanel: layoutRightPanel } = useLayout()
  const {
    activeTab: sidePanel,
    setActiveTab: setSidePanel,
    collapsed: sidebarCollapsed,
    toggle: toggleSidebar
  } = sidebar
  const {
    activeTab: rightPanel,
    setActiveTab: setRightPanel
  } = layoutRightPanel

  const [showSettings, setShowSettings] = useState(false)
  const [artifactData, setArtifactData] = useState<{ filename: string; content: string; type: "created" | "modified" | "normal" } | null>(null)

  const [isAborting, setIsAborting] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [renameSession, setRenameSession] = useState<Session | null>(null)
  const [shareSession, setShareSession] = useState<Session | null>(null)
  const [deleteSession, setDeleteSession] = useState<Session | null>(null)
  const [forkSession, setForkSession] = useState<Session | null>(null)
  const [childrenSession, setChildrenSession] = useState<Session | null>(null)
  const [diffSession, setDiffSession] = useState<Session | null>(null)

  const isLoading = sessionStatus.type === "busy" || sessionStatus.type === "retry" || isAborting

  // ─── Data Loading (must be declared before useEffect hooks) ───
  const loadProviders = useCallback(async () => {
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
  }, [client.config, setProviders])

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const response = await client.session.list()
      const data = response.data as Session[]
      if (!Array.isArray(data)) throw new Error("Invalid session response")
      setSessions(data.sort((a, b) => b.time.updated - a.time.updated))
    } catch (err) { console.error("Failed to load sessions:", err); setError("Failed to load sessions") }
    finally { setIsLoadingSessions(false) }
  }, [client.session, setSessions])

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const response = await client.session.messages({ sessionID: sessionId })
      const data = response.data as Array<{ info: Message; parts: Part[] }>
      const msgs: Message[] = []
      data.forEach((msg) => { msgs.push(msg.info); setParts(sessionId, msg.info.id, msg.parts) })
      setMessages(sessionId, msgs.sort((a, b) => a.time.created - b.time.created))
    } catch (err) { console.error("Failed to load messages:", err); setError("Failed to load messages") }
  }, [client.session, setParts, setMessages])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    loadProviders()
    loadSessions()
  }, [loadProviders, loadSessions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId)
    }
  }, [currentSessionId, loadMessages])

  // Listen for artifact open events from file tool cards
  useEffect(() => {
    function handleArtifactOpen(e: CustomEvent<{ filename: string; content: string; type: "created" | "modified" | "normal" }>) {
      setArtifactData(e.detail)
      setRightPanel("artifact")
    }
    window.addEventListener("artifact:open", handleArtifactOpen as EventListener)
    return () => window.removeEventListener("artifact:open", handleArtifactOpen as EventListener)
  }, [setRightPanel])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault()
        setSidePanel(sidePanel === "search" ? null : "search")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [sidePanel, setSidePanel])

  const pendingPromptRef = useRef<string | null>(null)

  useEffect(() => {
    function handleSetPrompt(e: CustomEvent<{ prompt: string }>) {
      pendingPromptRef.current = e.detail.prompt
      setInput(e.detail.prompt)
      inputRef.current?.focus()
    }

    async function handleSubmitPrompt(e: CustomEvent<{ prompt?: string }>) {
      const promptToSend = e.detail?.prompt || pendingPromptRef.current || input
      if (promptToSend?.trim() || selectedImages.length > 0) {
        pendingPromptRef.current = null
        const userText = promptToSend
        const imagesToUpload = [...selectedImages]
        setInput("")
        setSelectedImages([])
        
        let sessionId = currentSessionId
        if (!sessionId) {
          try {
            sessionId = await createSession()
            setCurrentSession(sessionId)
          } catch {
            setError("Failed to create session")
            return
          }
        }
        const slashIndex = selectedModel.indexOf("/")
        const providerID = selectedModel.substring(0, slashIndex)
        const modelID = selectedModel.substring(slashIndex + 1)

        // Convert images to parts
        const imageParts: Part[] = await Promise.all(imagesToUpload.map(async (img) => {
          return new Promise<Part>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(",")[1]
              resolve({
                type: "image",
                source: {
                  type: "base64",
                  media_type: img.file.type as any,
                  data: base64
                }
              } as any)
            }
            reader.readAsDataURL(img.file)
          })
        }))

        const parts: any[] = []
        if (userText?.trim()) parts.push({ type: "text", text: userText })
        parts.push(...imageParts)

        try {
          await client.session.promptAsync({
            sessionID: sessionId,
            parts,
            agent: "build",
            model: { providerID, modelID },
          })
          loadSessions()
        } catch {
          setError("Failed to send message")
        }
      }
    }

    window.addEventListener("ai:set-prompt", handleSetPrompt as unknown as EventListener)
    window.addEventListener("ai:submit-prompt", handleSubmitPrompt as unknown as EventListener)
    return () => {
      window.removeEventListener("ai:set-prompt", handleSetPrompt as unknown as EventListener)
      window.removeEventListener("ai:submit-prompt", handleSubmitPrompt as unknown as EventListener)
    }
  }, [currentSessionId, selectedModel, input, selectedImages, client.session, loadSessions, setCurrentSession])

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const url = URL.createObjectURL(file)
      setSelectedImages(prev => [...prev, { url, file }])
    })
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].url)
      next.splice(index, 1)
      return next
    })
  }

  async function sendMessage() {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return
    setError(null)
    let sessionId = currentSessionId
    if (!sessionId) {
      try { sessionId = await createSession(); setCurrentSession(sessionId) }
      catch { setError("Failed to create session"); return }
    }
    const userText = input
    const imagesToUpload = [...selectedImages]
    setInput("")
    setSelectedImages([])

    const slashIndex = selectedModel.indexOf("/")
    const providerID = selectedModel.substring(0, slashIndex)
    const modelID = selectedModel.substring(slashIndex + 1)

    // Convert images to parts
    const imageParts: Part[] = await Promise.all(imagesToUpload.map(async (img) => {
      return new Promise<Part>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1]
          resolve({
            type: "image",
            source: {
              type: "base64",
              media_type: img.file.type as any,
              data: base64
            }
          } as any)
        }
        reader.readAsDataURL(img.file)
      })
    }))

    const parts: any[] = []
    if (userText.trim()) parts.push({ type: "text", text: userText })
    parts.push(...imageParts)

    try {
      await client.session.promptAsync({
        sessionID: sessionId,
        parts,
        agent: "build",
        model: { providerID, modelID }
      })
      loadSessions()
    } catch {
      setError("Failed to send message")
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

  // ─── Right panel title ───
  const rightPanelTitle = rightPanel === "terminal" ? "Terminal" : rightPanel === "todos" ? "Tasks" : rightPanel === "artifact" && artifactData ? artifactData.filename.split("/").pop() || "File" : ""

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-3 h-12 border-b border-border bg-surface shrink-0 gap-2">
        <button
          onClick={() => setSidePanel(sidePanel === null ? "sessions" : null)}
          className="p-2 -ml-1 text-textSecondary hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>
        <img src="/assets/100X_Prompt.svg" alt="100xprompt" className="h-5 w-auto" />
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setRightPanel(rightPanel === "terminal" ? null : "terminal")}
            className={clsx(
              "p-2 rounded-lg transition-colors active:scale-95",
              rightPanel === "terminal" ? "text-primary bg-primary/10" : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
            )}
          >
            <TerminalIcon className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === "todos" ? null : "todos")}
            className={clsx(
              "p-2 rounded-lg transition-colors active:scale-95",
              rightPanel === "todos" ? "text-primary bg-primary/10" : "text-textSecondary hover:text-textPrimary hover:bg-surface-hover"
            )}
          >
            <CheckSquare className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* ═══════════════════ SIDEBAR (Claude text-based) ═══════════════════ */}
      {/* Mobile backdrop */}
      {sidePanel !== null && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-fade-in"
          onClick={() => setSidePanel(null)}
        />
      )}
      <div
        className={clsx(
          "bg-surface border-r border-border flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40",
          // Mobile: fixed 280px overlay
          "fixed inset-y-0 left-0 w-[280px]",
          // Mobile visibility
          sidePanel === null ? "-translate-x-full" : "translate-x-0",
          // Desktop: relative with collapsible width
          "md:relative md:translate-x-0",
          sidebarCollapsed ? "md:w-[60px]" : "md:w-[260px]",
          // Shadow on mobile when open
          sidePanel !== null && "shadow-2xl md:shadow-none"
        )}
      >

        {/* Top nav / Collapse toggle */}
        <div className={clsx("px-3 pt-3 pb-1 space-y-0.5", sidebarCollapsed && "md:px-2")}>
          <div className="hidden md:flex items-center justify-between mb-2 px-1">
            {!sidebarCollapsed && <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider pl-2">Menu</span>}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-textMuted hover:text-textPrimary hover:bg-surface-hover transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => { setCurrentSession(null); if (window.innerWidth < 768) setSidePanel(null) }}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-textSecondary hover:bg-surface-hover transition-colors",
              sidebarCollapsed && "md:justify-center md:px-0"
            )}
            title="New chat"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">New chat</span>}
          </button>
          <button
            onClick={() => setSidePanel(sidePanel === "search" ? "sessions" : "search")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
              sidePanel === "search" ? "bg-surface-hover text-textPrimary" : "text-textSecondary hover:bg-surface-hover",
              sidebarCollapsed && "md:justify-center md:px-0"
            )}
            title="Search"
          >
            <Search className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Search</span>}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-textSecondary hover:bg-surface-hover transition-colors",
              sidebarCollapsed && "md:justify-center md:px-0"
            )}
            title="Settings"
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Customize</span>}
          </button>
        </div>

        {!sidebarCollapsed && <div className="mx-3 my-2 border-t border-border" />}

        {/* Section links */}
        <div className={clsx("px-3 space-y-0.5", sidebarCollapsed && "md:px-2")}>
          <button
            onClick={() => setSidePanel("sessions")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
              sidePanel === "sessions" ? "bg-surface-hover text-textPrimary" : "text-textSecondary hover:bg-surface-hover",
              sidebarCollapsed && "md:justify-center md:px-0"
            )}
            title="Chats"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Chats</span>}
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === "terminal" ? null : "terminal")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
              rightPanel === "terminal" ? "bg-surface-hover text-textPrimary" : "text-textSecondary hover:bg-surface-hover",
              sidebarCollapsed && "md:justify-center md:px-0"
            )}
            title="Terminal"
          >
            <TerminalIcon className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Terminal</span>}
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === "todos" ? null : "todos")}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
              rightPanel === "todos" ? "bg-surface-hover text-textPrimary" : "text-textSecondary hover:bg-surface-hover",
              sidebarCollapsed && "md:justify-center md:px-0"
            )}
            title="Tasks"
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Tasks</span>}
          </button>
        </div>

        {/* Recents label */}
        {sidePanel === "sessions" && !sidebarCollapsed && (
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
                    onClick={() => {
                      setCurrentSession(session.id)
                      if (window.innerWidth < 768) setSidePanel(null)
                    }}
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

        {sidePanel === "search" && !sidebarCollapsed && (
          <div className="flex-1 overflow-hidden">
            <SearchPanel
              onClose={() => setSidePanel("sessions")}
            />
          </div>
        )}

        {/* Bottom */}
        <div className={clsx("p-3 border-t border-border", sidebarCollapsed && "md:px-2")}>
          <button
            onClick={logout}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-textMuted hover:text-error hover:bg-error/5 transition-colors",
              sidebarCollapsed && "md:justify-center md:px-0"
            )}
            title="Log out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Log out</span>}
          </button>
        </div>
      </div>

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
            <div className="h-full flex items-center justify-center p-4 md:p-8">
              <div className="text-center max-w-sm md:max-w-md">
                <img src="/assets/100X_Prompt.svg" alt="100xprompt" className="w-10 h-10 md:w-14 md:h-14 mx-auto mb-4 md:mb-5 object-contain opacity-50" />
                <h3 className="text-lg md:text-xl font-display font-bold mb-1 md:mb-1.5 text-textPrimary">What can I help you build?</h3>
                <p className="text-textSecondary text-[13px] md:text-[14px] leading-relaxed">
                  Write code, fix bugs, explore your codebase, or deploy applications.
                </p>
              </div>
            </div>
          ) : (
            <div className="pb-2 md:pb-4">
              {groupedMessages.map((msg) => (
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

        {/* ─── Input Area (Claude-style, mobile optimized) ─── */}
        <div className="px-2 pb-3 pt-1 md:px-4 md:pb-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => e.preventDefault()}>
              <div
                className="flex flex-col bg-surface rounded-2xl md:rounded-[20px] cursor-text relative transition-all duration-200 border border-border/50"
                style={{ boxShadow: '0 0.25rem 1.25rem hsl(0 0% 0% / 8%), 0 0 0 0.5px hsl(0 0% 100% / 6%)' }}
                onClick={() => inputRef.current?.focus()}
              >
                {/* Image Previews */}
                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-3 pt-3 md:px-4 md:pt-4 md:gap-2">
                    {selectedImages.map((img, i) => (
                      <div key={i} className="relative group w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border border-border shadow-sm">
                        <img src={img.url} alt="upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                          className="absolute top-0.5 right-0.5 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col m-2.5 md:m-3.5 gap-2">
                  <div className="w-full overflow-y-auto max-h-48 md:max-h-96 min-h-[80px] md:min-h-[100px] pl-1 pt-0.5">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                      placeholder="Reply..."
                      className="w-full bg-transparent border-0 focus:outline-none resize-none min-h-[80px] md:min-h-[100px] text-[14px] md:text-[15px] leading-relaxed placeholder:text-textMuted/50"
                      disabled={isLoading}
                      rows={3}
                    />
                  </div>
                  <div className="relative flex gap-2 w-full items-center">
                    <div className="flex-1 flex items-center min-w-0 gap-0.5 md:gap-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                        multiple
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 w-8 md:h-8 md:w-8 rounded-lg flex items-center justify-center hover:bg-surface-hover active:bg-surface-active transition-colors text-textMuted hover:text-textSecondary"
                        title="Add images"
                      >
                        <ImageIcon className="w-[18px] h-[18px] md:w-5 md:h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="relative" ref={modelSelectorRef}>
                        <button
                          type="button"
                          onClick={() => setShowModelSelector(!showModelSelector)}
                          className="h-7 md:h-8 pl-2 pr-7 md:pl-2.5 md:pr-8 rounded-lg text-[10px] md:text-[11px] font-semibold bg-surface-hover/50 hover:bg-surface-hover active:bg-surface-active transition-colors cursor-pointer text-textSecondary border border-border/40 flex items-center gap-1.5 md:gap-2"
                        >
                          <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
                          <span className="truncate max-w-[60px] md:max-w-[80px]">
                            {selectedModel.split("/")[1] || "Model"}
                          </span>
                        </button>
                        <ChevronDown className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 w-3 h-3 md:w-3.5 md:h-3.5 text-textMuted pointer-events-none opacity-60" />
                        
                        {showModelSelector && (
                          <div className="absolute bottom-full mb-2 right-0 w-56 md:w-64 max-h-[250px] md:max-h-[300px] overflow-y-auto bg-surface border border-border rounded-xl shadow-2xl z-50 animate-scale-in origin-bottom-right">
                            <div className="p-1.5 md:p-2 space-y-0.5 md:space-y-1">
                              {Object.entries(models).map(([provider, modelList]) => (
                                <div key={provider} className="space-y-0.5 md:space-y-1">
                                  <div className="px-2 py-1 text-[9px] md:text-[10px] font-bold text-textMuted uppercase tracking-wider">{provider}</div>
                                  {modelList.map((model) => (
                                    <button
                                      key={`${provider}/${model}`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedModel(`${provider}/${model}`)
                                        setShowModelSelector(false)
                                      }}
                                      className={clsx(
                                        "w-full text-left px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-[12px] md:text-[13px] transition-colors",
                                        selectedModel === `${provider}/${model}`
                                          ? "bg-primary/10 text-primary font-medium"
                                          : "text-textSecondary hover:bg-surface-hover hover:text-textPrimary"
                                      )}
                                    >
                                      {model}
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (isLoading) {
                            stopSession()
                          } else if (input.trim() || selectedImages.length > 0) {
                            sendMessage()
                          }
                        }}
                        disabled={!isLoading && !input.trim() && selectedImages.length === 0}
                        className={clsx(
                          "h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center transition-colors active:scale-95",
                          isLoading ? "text-error hover:bg-error/10 cursor-pointer"
                            : (input.trim() || selectedImages.length > 0) ? "text-primary hover:bg-primary/10 cursor-pointer"
                            : "text-textMuted/30 cursor-not-allowed",
                        )}
                      >
                        {isLoading ? <Square className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" /> : (
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="md:w-5 md:h-5"><path d="M2.925 4.382a1.686 1.686 0 0 1 2.39-1.307l11.712 5.498a1.16 1.16 0 0 1 0 2.104L5.314 16.175a1.686 1.686 0 0 1-2.389-1.307L3.658 11h5.592a.75.75 0 0 0 0-1.5H3.658z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
            <p className="mt-1.5 md:mt-2 text-[10px] md:text-[11px] text-center text-textMuted/50">100xprompt can make mistakes. Verify important information.</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════ RIGHT PANEL (editor / diff / terminal / todos) ═══════════════════ */}
      {/* Mobile backdrop */}
      {rightPanel && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setRightPanel(null)}
        />
      )}
      {rightPanel && (
        <div className={clsx(
          "bg-surface border-l border-border flex flex-col shrink-0 transition-all duration-300 z-50",
          // Mobile: fixed overlay from right
          "fixed inset-y-0 right-0",
          rightPanel === "artifact" ? "w-full md:w-[700px]" : "w-full md:w-[420px]",
          // Desktop: relative positioning
          "md:relative md:animate-slide-in-left"
        )}>
          {/* Header — artifact has its own, skip for that */}
          {rightPanel !== "artifact" && (
            <div className="flex items-center justify-between px-2 py-2 bg-surface gap-2 border-b border-border">
              <div className="flex items-center gap-2 flex-1 overflow-hidden pl-3">
                <h2 className="text-sm font-semibold text-textPrimary truncate">{rightPanelTitle}</h2>
              </div>
              <button
                onClick={() => setRightPanel(null)}
                className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary active:scale-95"
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
              diffType={artifactData.type}
              onClose={() => { setRightPanel(null); setArtifactData(null) }}
            />
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
