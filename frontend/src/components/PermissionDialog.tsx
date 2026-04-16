import { useState } from "react"
import { X, Shield, AlertTriangle, Zap, Clock, CheckCircle, XCircle, Infinity } from "lucide-react"
import { useGlobalStore } from "../store"
import { api, endpoints } from "../lib/api"

type RiskLevel = "low" | "medium" | "high"

function getRiskLevel(permission: string, patterns: string[]): RiskLevel {
  const highRiskKeywords = ["execute", "delete", "remove", "write", "bash", "shell", "script"]
  const mediumRiskKeywords = ["edit", "modify", "create", "install", "network"]

  const permissionLower = permission.toLowerCase()
  const patternsLower = patterns.join(" ").toLowerCase()

  if (highRiskKeywords.some((k) => permissionLower.includes(k) || patternsLower.includes(k))) {
    return "high"
  }
  if (mediumRiskKeywords.some((k) => permissionLower.includes(k) || patternsLower.includes(k))) {
    return "medium"
  }
  return "low"
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const colors = {
    low: "bg-success/10 text-success border-success/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    high: "bg-error/10 text-error border-error/20",
  }

  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${colors[level]} uppercase`}>{level} risk</span>
  )
}

export function PermissionDialog() {
  const permissions = useGlobalStore((s) => s.permissions)
  const removePermission = useGlobalStore((s) => s.removePermission)
  const [loading, setLoading] = useState<string | null>(null)

  const currentPermission = permissions[0]

  if (!currentPermission) return null

  const riskLevel = getRiskLevel(currentPermission.permission, currentPermission.patterns)

  async function handleResponse(allow: boolean, always: boolean = false) {
    const actionKey = `${allow}-${always}`
    setLoading(actionKey)

    try {
      const reply = allow ? (always ? "always" : "once") : "reject"
      await api.post(endpoints.permissionReply(currentPermission.id), {
        reply,
      })
      removePermission(currentPermission.id)
    } catch (err) {
      console.error("Failed to reply to permission:", err)
    } finally {
      setLoading(null)
    }
  }

  const toolInfo = currentPermission.metadata?.tool as { name?: string; args?: Record<string, unknown> } | undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-warning" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg">Permission Request</span>
              <RiskBadge level={riskLevel} />
            </div>
          </div>
          <button
            onClick={() => handleResponse(false)}
            disabled={loading !== null}
            className="p-2 hover:bg-surfaceHover rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-textMuted" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {toolInfo?.name && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase">Tool</span>
              </div>
              <div className="text-sm font-mono font-medium">{toolInfo.name}</div>
              {toolInfo.args && Object.keys(toolInfo.args).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(toolInfo.args).map(([key, value]) => (
                    <div key={key} className="text-xs font-mono">
                      <span className="text-textMuted">{key}:</span>{" "}
                      <span className="text-textSecondary">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-xs uppercase font-bold text-textMuted mb-2">Permission</div>
            <p className="text-sm text-textSecondary">{currentPermission.permission}</p>
          </div>

          {currentPermission.patterns.length > 0 && (
            <div>
              <div className="text-xs uppercase font-bold text-textMuted mb-2">Patterns</div>
              <div className="space-y-1">
                {currentPermission.patterns.map((pattern, i) => (
                  <div key={i} className="text-xs font-mono bg-background p-2 rounded border border-border">
                    {pattern}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-textSecondary">
              Only approve permissions from trusted sources. This action may modify files or execute commands.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-6 py-4 bg-background border-t border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleResponse(true)}
              disabled={loading !== null}
              className="flex-1 py-2.5 px-4 bg-primary hover:bg-primaryHover text-white rounded-xl transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === "true-false" ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Allow Once
                </>
              )}
            </button>
            <button
              onClick={() => handleResponse(true, true)}
              disabled={loading !== null || riskLevel === "high"}
              className="flex-1 py-2.5 px-4 bg-success hover:bg-success/80 text-white rounded-xl transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === "true-true" ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Infinity className="w-4 h-4" />
                  Always Allow
                </>
              )}
            </button>
          </div>
          <button
            onClick={() => handleResponse(false)}
            disabled={loading !== null}
            className="w-full py-2.5 px-4 bg-surface hover:bg-surfaceHover border border-border rounded-xl transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === "false-false" ? (
              <div className="w-4 h-4 border-2 border-textMuted/30 border-t-textMuted rounded-full animate-spin" />
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Deny
              </>
            )}
          </button>
          {riskLevel === "high" && (
            <p className="text-[10px] text-textMuted text-center">
              "Always Allow" is disabled for high-risk operations
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
