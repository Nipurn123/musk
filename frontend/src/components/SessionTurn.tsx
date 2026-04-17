import React, { useState, useEffect, useRef } from "react"
import { MessagePart } from "./MessagePart"
import { User, ChevronDown, CheckCircle2, Loader2, FileCode, Terminal, Search, Globe, Brain, FolderOpen } from "lucide-react"
import { clsx } from "clsx"

interface SessionTurnProps {
  role: "user" | "assistant"
  parts: unknown[]
  timestamp?: string
  isLoading?: boolean
}

interface ToolGroup {
  type: "files" | "commands" | "search" | "web" | "other"
  label: string
  tools: unknown[]
  icon: typeof FileCode
}

function groupTools(parts: unknown[]): ToolGroup[] {
  const groups: Map<string, unknown[]> = new Map()
  
  const partsList = Array.isArray(parts) ? parts : []
  const toolParts = partsList.filter((p: any) => p.type === "tool")
  
  for (const part of toolParts) {
    const p = part as any
    const toolName = p.tool || ""
    let groupKey = "other"
    
    if (["read", "write", "edit", "multiedit"].includes(toolName)) {
      groupKey = "files"
    } else if (toolName === "bash") {
      groupKey = "commands"
    } else if (["grep", "glob", "task"].includes(toolName)) {
      groupKey = "search"
    } else if (["webfetch", "websearch"].includes(toolName)) {
      groupKey = "web"
    }
    
    const existing = groups.get(groupKey) || []
    existing.push(part)
    groups.set(groupKey, existing)
  }
  
  const groupConfigs: Record<string, { type: ToolGroup["type"]; label: string; icon: typeof FileCode }> = {
    files: { type: "files", label: "files", icon: FileCode },
    commands: { type: "commands", label: "commands", icon: Terminal },
    search: { type: "search", label: "search", icon: Search },
    web: { type: "web", label: "web", icon: Globe },
    other: { type: "other", label: "tools", icon: FolderOpen },
  }
  
  const result: ToolGroup[] = []
  
  for (const [key, tools] of groups) {
    const config = groupConfigs[key]
    const count = tools.length
    result.push({
      type: config.type,
      label: `${count} ${config.label}`,
      tools,
      icon: config.icon,
    })
  }
  
  return result
}

export function SessionTurn({ role, parts = [], timestamp, isLoading }: SessionTurnProps) {
  const isAssistant = role === "assistant"

  const partsList = Array.isArray(parts) ? parts : []
  const textParts = partsList.filter((p: any) => p.type === "text")
  const reasoningPart = partsList.find((p: any) => p.type === "reasoning")
  const toolGroups = groupTools(partsList)
  
  const hasTools = toolGroups.length > 0
  const hasRunningTools = toolGroups.some(g => g.tools.some((p: any) => p.state?.status === "running"))
  const allToolsDone = hasTools && toolGroups.every(g => g.tools.every((p: any) => p.state?.status === "completed"))
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())
  const [thinkingExpanded, setThinkingExpanded] = useState(false)
  const [showText, setShowText] = useState(false)
  
  const wasRunningRef = useRef(false)

  useEffect(() => {
    if (hasRunningTools) {
      wasRunningRef.current = true
      setExpandedGroups(new Set(toolGroups.map(g => g.type)))
      setShowText(false)
    } else if (wasRunningRef.current && allToolsDone) {
      const timer = setTimeout(() => {
        setExpandedGroups(new Set())
        setExpandedTools(new Set())
        setShowText(true)
        wasRunningRef.current = false
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [hasRunningTools, allToolsDone])

  useEffect(() => {
    if (!hasTools || allToolsDone) {
      setShowText(true)
    }
  }, [hasTools, allToolsDone])

  const toggleGroup = (type: string) => {
    const next = new Set(expandedGroups)
    if (next.has(type)) {
      next.delete(type)
    } else {
      next.add(type)
    }
    setExpandedGroups(next)
  }

  const toggleTool = (id: string) => {
    const next = new Set(expandedTools)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedTools(next)
  }

  const hasReasoning = !!(reasoningPart as any)?.text
  const reasoningText = (reasoningPart as any)?.text || ""

  return (
    <div className={clsx("py-6 px-4 md:px-6", isAssistant && "bg-surface/20")}>
      <div className="max-w-3xl mx-auto flex gap-4">
        <div className="shrink-0 pt-1">
          {isAssistant ? (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-surface to-surface-hover border border-border/50 flex items-center justify-center shadow-sm">
              <img
                src="/assets/100X_Prompt.svg"
                alt="100xprompt"
                className="w-5 h-5 object-contain"
              />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-surface-hover border border-border/50 flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-textSecondary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {hasReasoning && (
            <div className="mb-4">
              <button
                onClick={() => setThinkingExpanded(!thinkingExpanded)}
                className="inline-flex items-center gap-2 text-[14px] text-textMuted hover:text-textSecondary transition-colors group"
              >
                <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
                </div>
                <span className="font-medium">thinking</span>
                <ChevronDown className={clsx(
                  "w-4 h-4 text-textMuted/50 transition-transform duration-200",
                  !thinkingExpanded && "-rotate-90"
                )} />
              </button>
              
              {thinkingExpanded && (
                <div className="mt-2 ml-6 border-l-2 border-primary/20 pl-4">
                  <p className="text-[14px] text-textMuted/80 leading-relaxed whitespace-pre-wrap font-mono">
                    {reasoningText}
                  </p>
                </div>
              )}
            </div>
          )}

          {hasTools && (
            <div className="mb-4 space-y-2">
              {toolGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.type)
                const Icon = group.icon
                const isGroupRunning = group.tools.some((p: any) => p.state?.status === "running")
                const isGroupDone = group.tools.every((p: any) => p.state?.status === "completed")
                
                return (
                  <div key={group.type} className="rounded-lg bg-surface/50 border border-border/40 overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group.type)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hover/30 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-md bg-surface-hover flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-textMuted" />
                      </div>
                      <span className="text-[14px] text-textSecondary font-medium">{group.label}</span>
                      {isGroupRunning && (
                        <Loader2 className="w-4 h-4 text-primary animate-spin ml-auto" />
                      )}
                      {isGroupDone && !isGroupRunning && (
                        <CheckCircle2 className="w-4 h-4 text-success ml-auto" />
                      )}
                      <ChevronDown className={clsx(
                        "w-4 h-4 text-textMuted/50 transition-transform duration-200",
                        !isExpanded && "-rotate-90"
                      )} />
                    </button>
                    
                    {isExpanded && (
                      <div className="border-t border-border/30 divide-y divide-border/20">
                        {group.tools.map((part, i) => {
                          const p = part as any
                          const toolId = p.id || `${group.type}-${i}`
                          const isToolExpanded = expandedTools.has(toolId)
                          const toolName = p.tool || ""
                          const input = p.state?.input || {}
                          const status = p.state?.status || ""
                          
                          const label = input.filePath || input.path || input.command || input.pattern || input.url || toolName
                          const shortLabel = typeof label === 'string' ? label.split('/').pop() || label : toolName
                          
                          return (
                            <div key={toolId}>
                              <button
                                onClick={() => toggleTool(toolId)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover/20 transition-colors"
                              >
                                <ChevronDown className={clsx(
                                  "w-3.5 h-3.5 text-textMuted/50 transition-transform duration-200",
                                  !isToolExpanded && "-rotate-90"
                                )} />
                                <span className="text-[13px] text-textSecondary/90 font-mono truncate">{shortLabel}</span>
                                {status === "running" && (
                                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin ml-auto" />
                                )}
                                {status === "completed" && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success/70 ml-auto" />
                                )}
                              </button>
                              
                              {isToolExpanded && (
                                <div className="bg-surface/30 border-t border-border/20">
                                  <MessagePart part={part} />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {showText && textParts.map((part, i) => (
            <MessagePart key={(part as any).id || `text-${i}`} part={part} />
          ))}

          {isLoading && !hasTools && (
            <div className="flex items-center gap-2 py-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[14px] text-textMuted">Thinking...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
