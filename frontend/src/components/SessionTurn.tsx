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
  type: "files" | "commands" | "search" | "web" | "tasks" | "other"
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
    } else if (["grep", "glob"].includes(toolName)) {
      groupKey = "search"
    } else if (["webfetch", "websearch"].includes(toolName)) {
      groupKey = "web"
    } else if (toolName === "task") {
      groupKey = "tasks"
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
    tasks: { type: "tasks", label: "tasks", icon: Brain },
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
  const reasoningParts = partsList.filter((p: any) => p.type === "reasoning")
  const toolGroups = groupTools(partsList)
  
  const hasTools = toolGroups.length > 0
  const hasReasoning = reasoningParts.length > 0
  const hasRunningTools = toolGroups.some(g => g.tools.some((p: any) => p.state?.status === "running"))
  const allToolsDone = hasTools && toolGroups.every(g => g.tools.every((p: any) => p.state?.status === "completed"))
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showText, setShowText] = useState(false)
  
  const wasRunningRef = useRef(false)

  useEffect(() => {
    if (hasRunningTools) {
      wasRunningRef.current = true
      setIsExpanded(true)
      setExpandedGroups(new Set(toolGroups.map(g => g.type)))
      setShowText(false)
    } else if (wasRunningRef.current && allToolsDone) {
      const timer = setTimeout(() => {
        setIsExpanded(false)
        setExpandedGroups(new Set())
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

  const reasoningText = reasoningParts.map((p: any) => p.text).filter(Boolean).join("\n\n")

  const summaryParts: string[] = []
  for (const group of toolGroups) {
    summaryParts.push(group.label)
  }
  
  const hasActivity = hasTools || hasReasoning

  return (
    <div className={clsx("py-4 md:py-6 lg:py-8 px-3 md:px-4 lg:px-6", isAssistant && "bg-surface/10")}>
      <div className="max-w-3xl mx-auto flex gap-2.5 md:gap-3 lg:gap-5">
        <div className="shrink-0 pt-0.5 md:pt-1">
          {isAssistant ? (
            <div className="w-6 h-6 md:w-7 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-surface to-surface-hover border border-border/40 flex items-center justify-center shadow-sm">
              <img
                src="/assets/100X_Prompt.svg"
                alt="100xprompt"
                className="w-3.5 h-3.5 md:w-4 lg:w-5 lg:h-5 object-contain"
              />
            </div>
          ) : (
            <div className="w-6 h-6 md:w-7 lg:w-8 lg:h-8 rounded-full bg-surface-hover border border-border/40 flex items-center justify-center shadow-sm">
              <User className="w-3.5 h-3.5 md:w-4 lg:w-4.5 lg:h-4.5 text-textSecondary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {hasActivity && (
            <div className="mb-4 md:mb-5 lg:mb-6">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-2 md:gap-2.5 text-[13px] md:text-[14px] text-textMuted hover:text-textSecondary transition-all group py-0.5 md:py-1"
              >
                {hasRunningTools ? (
                  <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary animate-spin" />
                ) : allToolsDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-success/60" />
                ) : (
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-md bg-surface-hover flex items-center justify-center border border-border/30">
                    <Brain className="w-2.5 h-2.5 md:w-3 md:h-3 text-textMuted group-hover:text-textSecondary transition-colors" />
                  </div>
                )}
                <span className="font-medium tracking-tight">
                  {summaryParts.join(" • ")}
                  {hasReasoning && (summaryParts.length > 0 ? " • thinking" : "thinking")}
                </span>
                <ChevronDown className={clsx(
                  "w-3.5 h-3.5 md:w-4 md:h-4 text-textMuted/40 transition-transform duration-300",
                  !isExpanded && "-rotate-90"
                )} />
              </button>
              
              {isExpanded && (
                <div className="mt-3 md:mt-4 space-y-2 md:space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  {hasReasoning && (
                    <div className="rounded-xl bg-surface/40 border border-border/30 p-3 md:p-4 shadow-sm">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                        <Brain className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary/60" />
                        <span className="text-[10px] md:text-[11px] font-bold text-textMuted uppercase tracking-wider">thinking process</span>
                      </div>
                      <p className="text-[13px] md:text-[14px] text-textMuted/90 leading-relaxed whitespace-pre-wrap font-mono pl-4 md:pl-6 border-l border-border/20">
                        {reasoningText}
                      </p>
                    </div>
                  )}
                  
                  {toolGroups.map((group) => {
                    const isGroupExpanded = expandedGroups.has(group.type)
                    const Icon = group.icon
                    const isGroupRunning = group.tools.some((p: any) => p.state?.status === "running")
                    
                    return (
                      <div key={group.type} className="rounded-xl bg-surface/30 border border-border/20 overflow-hidden transition-all shadow-sm">
                        <button
                          onClick={() => toggleGroup(group.type)}
                          className="w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 hover:bg-surface-hover/20 transition-colors text-left"
                        >
                          <ChevronDown className={clsx(
                            "w-3.5 h-3.5 md:w-4 md:h-4 text-textMuted/30 transition-transform duration-300",
                            !isGroupExpanded && "-rotate-90"
                          )} />
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-surface-hover/50 flex items-center justify-center border border-border/10">
                            <Icon className="w-3 h-3 md:w-3.5 md:h-3.5 text-textMuted" />
                          </div>
                          <span className="text-[13px] md:text-[14px] text-textSecondary font-medium">{group.label}</span>
                          {isGroupRunning && (
                            <Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary animate-spin ml-auto" />
                          )}
                        </button>
                        
                        {isGroupExpanded && (
                          <div className="border-t border-border/10 bg-surface/10 divide-y divide-border/5">
                            {group.tools.map((part, i) => (
                              <div key={i} className="py-0.5 md:py-1">
                                <MessagePart part={part} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 md:space-y-4">
            {showText && textParts.map((part, i) => (
              <div key={i} className="text-[14px] md:text-[15px] text-textPrimary leading-relaxed prose prose-invert max-w-none">
                <MessagePart part={part} />
              </div>
            ))}
          </div>

          {isLoading && !hasActivity && (
            <div className="flex items-center gap-1.5 md:gap-2 py-1.5 md:py-2 mt-0.5 md:mt-1">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[13px] md:text-[14px] text-textMuted">Thinking...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
