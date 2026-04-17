import React, { useState, useEffect, useRef } from "react"
import { MessagePart } from "./MessagePart"
import { User, ChevronDown, CheckCircle2, Loader2, FileCode, Terminal, Search, Globe, Brain } from "lucide-react"
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
    other: { type: "other", label: "tools", icon: Terminal },
  }
  
  const result: ToolGroup[] = []
  
  for (const [key, tools] of groups) {
    const config = groupConfigs[key]
    const count = tools.length
    const label = count === 1 ? config.label : `${config.label}`
    result.push({
      type: config.type,
      label: `${count} ${label}`,
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
  const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0)
  const hasRunningTools = toolGroups.some(g => g.tools.some((p: any) => p.state?.status === "running"))
  const allToolsDone = hasTools && toolGroups.every(g => g.tools.every((p: any) => p.state?.status === "completed"))
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())
  const [thinkingExpanded, setThinkingExpanded] = useState(false)
  
  const wasRunningRef = useRef(false)

  useEffect(() => {
    if (hasRunningTools) {
      wasRunningRef.current = true
      setExpandedGroups(new Set(toolGroups.map(g => g.type)))
    } else if (wasRunningRef.current && allToolsDone) {
      const timer = setTimeout(() => {
        setExpandedGroups(new Set())
        setExpandedTools(new Set())
        wasRunningRef.current = false
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [hasRunningTools, allToolsDone])

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
    <div className={clsx("py-5 px-4 md:px-6", isAssistant && "bg-surface/20")}>
      <div className="max-w-3xl mx-auto flex gap-4">
        <div className="shrink-0 pt-0.5">
          {isAssistant ? (
            <div className="w-6 h-6 rounded-md bg-surface border border-border flex items-center justify-center">
              <img
                src="/assets/100X_Prompt.svg"
                alt="100xprompt"
                className="w-4 h-4 object-contain"
              />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-surface-hover border border-border flex items-center justify-center">
              <User className="w-3 h-3 text-textSecondary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {textParts.map((part, i) => (
            <MessagePart key={(part as any).id || `text-${i}`} part={part} />
          ))}

          {hasReasoning && (
            <div className="mb-3">
              <button
                onClick={() => setThinkingExpanded(!thinkingExpanded)}
                className="inline-flex items-center gap-1.5 text-[13px] text-textMuted hover:text-textSecondary transition-colors"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>thinking</span>
                <ChevronDown className={clsx(
                  "w-3 h-3 transition-transform",
                  !thinkingExpanded && "-rotate-90"
                )} />
              </button>
              
              {thinkingExpanded && (
                <div className="mt-2 ml-1 border-l-2 border-border/50 pl-3">
                  <p className="text-[13px] text-textMuted leading-relaxed whitespace-pre-wrap font-mono">
                    {reasoningText}
                  </p>
                </div>
              )}
            </div>
          )}

          {hasTools && (
            <div className="mt-3 space-y-1">
              {toolGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.type)
                const Icon = group.icon
                
                return (
                  <div key={group.type}>
                    <button
                      onClick={() => toggleGroup(group.type)}
                      className="inline-flex items-center gap-1.5 text-[13px] text-textMuted hover:text-textSecondary transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{group.label}</span>
                      {hasRunningTools && group.tools.some((p: any) => p.state?.status === "running") && (
                        <Loader2 className="w-3 h-3 text-primary animate-spin" />
                      )}
                      {allToolsDone && (
                        <CheckCircle2 className="w-3 h-3 text-success/60" />
                      )}
                      <ChevronDown className={clsx(
                        "w-3 h-3 transition-transform",
                        !isExpanded && "-rotate-90"
                      )} />
                    </button>
                    
                    {isExpanded && (
                      <div className="mt-1 ml-1 border-l-2 border-border/40 pl-3 space-y-0.5">
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
                                className="inline-flex items-center gap-1.5 text-[12px] text-textMuted/80 hover:text-textSecondary transition-colors"
                              >
                                <ChevronDown className={clsx(
                                  "w-2.5 h-2.5 transition-transform",
                                  !isToolExpanded && "-rotate-90"
                                )} />
                                <span className="font-mono">{shortLabel}</span>
                                {status === "running" && (
                                  <Loader2 className="w-2.5 h-2.5 text-primary animate-spin" />
                                )}
                                {status === "completed" && (
                                  <CheckCircle2 className="w-2.5 h-2.5 text-success/60" />
                                )}
                              </button>
                              
                              {isToolExpanded && (
                                <div className="mt-1 ml-3 border-l border-border/30 pl-2">
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

          {isLoading && (
            <div className="flex items-center gap-2 py-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[13px] text-textMuted">Thinking...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
