import React from "react"
import { MessagePart } from "./MessagePart"
import { Loader2, User, Bot, Clock, Sparkles } from "lucide-react"
import { clsx } from "clsx"

interface SessionTurnProps {
  role: "user" | "assistant"
  parts: any[]
  timestamp?: string
  isLoading?: boolean
}

export function SessionTurn({ role, parts, timestamp, isLoading }: SessionTurnProps) {
  const isAssistant = role === "assistant"

  return (
    <div className={clsx("relative py-6 px-4 group", isAssistant && "bg-gradient-to-b from-surface/50 to-transparent")}>
      {isAssistant && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      <div className="max-w-4xl mx-auto flex gap-5 relative">
        <div className="shrink-0 pt-0.5">
          {isAssistant ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl blur-md opacity-50" />
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-surface-hover border border-border flex items-center justify-center">
              <User className="w-5 h-5 text-textSecondary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span
              className={clsx(
                "text-sm font-semibold tracking-tight",
                isAssistant ? "text-primary" : "text-textSecondary",
              )}
            >
              {isAssistant ? "100XPrompt" : "You"}
            </span>
            {timestamp && (
              <span className="text-[10px] text-textMuted flex items-center gap-1.5 px-2 py-0.5 bg-surface/50 rounded-full">
                <Clock className="w-3 h-3" />
                {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {parts.map((part, i) => (
              <MessagePart key={part.id || i} part={part} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 py-3 px-4 bg-surface/50 border border-border/50 rounded-xl">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <div className="w-2 h-2 rounded-full bg-primary absolute inset-0" />
                </div>
                <span className="text-sm text-textSecondary font-medium">Thinking...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
