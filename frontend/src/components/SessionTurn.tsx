import React from "react"
import { MessagePart } from "./MessagePart"
import { User, Clock, Sparkles } from "lucide-react"
import { clsx } from "clsx"

interface SessionTurnProps {
  role: "user" | "assistant"
  parts: unknown[]
  timestamp?: string
  isLoading?: boolean
}

export function SessionTurn({ role, parts, timestamp, isLoading }: SessionTurnProps) {
  const isAssistant = role === "assistant"

  return (
    <div className={clsx("relative py-5 px-4 group animate-slide-up-fade", isAssistant && "bg-gradient-to-b from-surface/40 to-transparent")}>
      {isAssistant && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      <div className="max-w-4xl mx-auto flex gap-4 relative">
        <div className="shrink-0 pt-0.5">
          {isAssistant ? (
            <div className="relative group/avatar">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl blur-lg opacity-40 group-hover/avatar:opacity-60 transition-opacity duration-300" />
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 group-hover/avatar:scale-105 transition-transform duration-200">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-surface-hover/80 border border-border/60 flex items-center justify-center group-hover:border-primary/30 transition-colors duration-200">
              <User className="w-4.5 h-4.5 text-textSecondary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span
              className={clsx(
                "text-sm font-semibold tracking-tight",
                isAssistant ? "text-primary" : "text-textSecondary",
              )}
            >
              {isAssistant ? "100XPrompt" : "You"}
            </span>
            {timestamp && (
              <span className="text-[10px] text-textMuted flex items-center gap-1 px-2 py-0.5 bg-surface/60 rounded-full border border-border/30">
                <Clock className="w-2.5 h-2.5" />
                {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {parts.map((part, i) => (
              <MessagePart key={part.id || i} part={part} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 py-3 px-4 bg-surface/60 border border-border/40 rounded-xl animate-pulse-glow-subtle">
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
