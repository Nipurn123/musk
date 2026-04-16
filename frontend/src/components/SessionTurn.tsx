import React, { useState } from "react"
import { MessagePart } from "./MessagePart"
import { User, ChevronDown, CheckCircle2, Loader2 } from "lucide-react"
import { clsx } from "clsx"

interface SessionTurnProps {
  role: "user" | "assistant"
  parts: unknown[]
  timestamp?: string
  isLoading?: boolean
}

export function SessionTurn({ role, parts = [], timestamp, isLoading }: SessionTurnProps) {
  const isAssistant = role === "assistant"

  // Group parts: text parts render inline, tool parts get a "Used a tool" collapsible wrapper
  const textParts: unknown[] = []
  const toolParts: unknown[] = []
  const otherParts: unknown[] = []

  const partsList = Array.isArray(parts) ? parts : []

  partsList.forEach((part: any) => {
    if (part.type === "text" || part.type === "reasoning") {
      textParts.push(part)
    } else if (part.type === "tool") {
      toolParts.push(part)
    } else {
      otherParts.push(part)
    }
  })

  const [toolsExpanded, setToolsExpanded] = useState(true)

  // Check if all tools are completed
  const allToolsDone = toolParts.every((p: any) => p.state?.status === "completed")
  const hasRunningTools = toolParts.some((p: any) => p.state?.status === "running")

  // Build tool group label
  const toolGroupLabel = (() => {
    if (toolParts.length === 0) return ""
    const types = new Set(toolParts.map((p: any) => {
      const tool = p.tool || ""
      if (tool === "write") return "created files"
      if (tool === "edit" || tool === "multiedit") return "edited files"
      if (tool === "bash") return "ran commands"
      if (tool === "read") return "read files"
      if (tool === "grep" || tool === "glob") return "searched"
      if (tool === "webfetch" || tool === "websearch") return "browsed the web"
      return "used tools"
    }))
    const labels = Array.from(types)
    if (labels.length === 1) return labels[0].charAt(0).toUpperCase() + labels[0].slice(1)
    if (labels.length > 2) return "Used multiple tools"
    return labels.join(" & ").replace(/^./, (c) => c.toUpperCase())
  })()

  return (
    <div className={clsx("py-6 px-4 md:px-6", isAssistant && "bg-surface/30")}>
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div className="shrink-0 pt-1">
          {isAssistant ? (
            <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center p-1 shadow-sm">
              <img
                src="/assets/100X_Prompt.svg"
                alt="100xprompt"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-surface-hover border border-border flex items-center justify-center shadow-sm">
              <User className="w-3.5 h-3.5 text-textSecondary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Text parts */}
          {textParts.map((part, i) => (
            <MessagePart key={(part as any).id || `text-${i}`} part={part} />
          ))}

          {/* Tool group — Claude's "Used a tool ∨" pattern */}
          {toolParts.length > 0 && (
            <div className="mt-3 first:mt-0 mb-4 last:mb-0">
              <button
                onClick={() => setToolsExpanded(!toolsExpanded)}
                className="flex items-center gap-2 text-[13px] font-medium text-textMuted hover:text-textSecondary transition-all py-1.5 px-2 -ml-2 rounded-lg hover:bg-surface-hover/30 group"
              >
                <div className="flex items-center gap-1.5">
                  <span>{toolGroupLabel}</span>
                  {allToolsDone && !hasRunningTools ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success/60" />
                  ) : hasRunningTools ? (
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  ) : null}
                </div>
                <ChevronDown className={clsx(
                  "w-3.5 h-3.5 text-textMuted/40 transition-transform duration-200",
                  !toolsExpanded && "-rotate-90"
                )} />
              </button>

            {toolsExpanded && (
              <div className="mt-2 ml-1 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                {toolParts.map((part, i) => (
                  <MessagePart key={(part as any).id || `tool-${i}`} part={part} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other parts */}

          {otherParts.map((part, i) => (
            <MessagePart key={(part as any).id || `other-${i}`} part={part} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 py-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[14px] text-textMuted">Thinking...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
