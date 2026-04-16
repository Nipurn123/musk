import { useState, useEffect } from "react"
import { X, Loader2, Users, MessageSquare, AlertCircle } from "lucide-react"
import { useSDK } from "../context"
import type { Session } from "../types"
import { clsx } from "clsx"

interface ChildrenDialogProps {
  session: Session
  onClose: () => void
  onSelectSession: (sessionId: string) => void
}

export function ChildrenDialog({ session, onClose, onSelectSession }: ChildrenDialogProps) {
  const { client } = useSDK()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Session[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadChildren()
  }, [session.id])

  async function loadChildren() {
    setLoading(true)
    setError(null)

    try {
      const response = await client.session.children({
        sessionID: session.id,
      })
      const data = response.data as Session[]
      setChildren(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load children")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Forked Sessions</h2>
              <p className="text-xs text-textMuted">{children.length} fork(s) from this session</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
            <X className="w-5 h-5 text-textMuted" />
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12 text-textSecondary">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No forked sessions found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => {
                    onSelectSession(child.id)
                    onClose()
                  }}
                  className="w-full p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-surface-hover transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate mb-0.5">{child.title || "Untitled Session"}</div>
                      <div className="text-xs text-textMuted">
                        Created {new Date(child.time.created).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
