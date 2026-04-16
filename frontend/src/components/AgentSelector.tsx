import { useState, useEffect, useRef } from "react"
import { Bot, ChevronDown, Code2, Search, Sparkles, Shield, FileText, Check } from "lucide-react"
import { useGlobalStore } from "../store"
import { api, endpoints } from "../lib/api"
import type { Agent } from "../types"
import { clsx } from "clsx"

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  build: Code2,
  plan: FileText,
  general: Bot,
  explore: Search,
  default: Bot,
}

const AGENT_COLORS: Record<string, string> = {
  build: "text-primary",
  plan: "text-accent",
  general: "text-textSecondary",
  explore: "text-warning",
}

export function AgentSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const { agents, selectedAgent, setAgents, setSelectedAgent } = useGlobalStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function loadAgents() {
    try {
      const response = await api.get<Agent[]>(endpoints.agents())
      const visibleAgents = response.filter((a) => !a.hidden && a.mode !== "subagent")
      setAgents(visibleAgents)
    } catch (err) {
      console.error("Failed to load agents:", err)
    }
  }

  const currentAgent = agents.find((a) => a.name === selectedAgent) || agents[0]
  const IconComponent = currentAgent ? AGENT_ICONS[currentAgent.name] || AGENT_ICONS.default : AGENT_ICONS.default
  const iconColor = currentAgent ? AGENT_COLORS[currentAgent.name] || "text-primary" : "text-primary"

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface/50 border border-border hover:border-primary/30 hover:bg-surface-hover transition-all"
      >
        <div className={clsx("w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center", iconColor)}>
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium capitalize">{currentAgent?.name || "Select Agent"}</div>
          {currentAgent?.description && (
            <div className="text-[10px] text-textMuted truncate max-w-[120px]">
              {currentAgent.description.split(".")[0]}
            </div>
          )}
        </div>
        <ChevronDown className={clsx("w-4 h-4 text-textMuted transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-surface border border-border rounded-xl shadow-xl z-50 animate-fade-in-down overflow-hidden">
          <div className="p-2 space-y-1">
            {agents.map((agent) => {
              const AgentIcon = AGENT_ICONS[agent.name] || AGENT_ICONS.default
              const agentColor = AGENT_COLORS[agent.name] || "text-primary"
              const isSelected = agent.name === selectedAgent

              return (
                <button
                  key={agent.name}
                  onClick={() => {
                    setSelectedAgent(agent.name)
                    setIsOpen(false)
                  }}
                  className={clsx(
                    "w-full p-3 rounded-lg flex items-start gap-3 transition-all text-left group",
                    isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-surface-hover border border-transparent",
                  )}
                >
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      agentColor,
                      isSelected ? "bg-primary/20" : "bg-primary/10",
                    )}
                  >
                    <AgentIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{agent.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-primary" />}
                    </div>
                    {agent.description && (
                      <p className="text-[11px] text-textMuted mt-1 line-clamp-2">{agent.description}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
