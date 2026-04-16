import { useState } from "react"
import { X, Loader2, GitBranch, Check, AlertCircle } from "lucide-react"
import { useSDK } from "../context"
import type { Session } from "../types"

interface ForkDialogProps {
  session: Session
  onClose: () => void
  onSuccess: (newSessionId: string) => void
}

export function ForkDialog({ session, onClose, onSuccess }: ForkDialogProps) {
  const { client } = useSDK()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFork() {
    setLoading(true)
    setError(null)

    try {
      const response = await client.session.fork({
        sessionID: session.id,
      })
      const data = response.data as { id: string }
      onSuccess(data.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fork session")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-bold text-lg">Fork Session</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-textMuted" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <p className="text-sm text-textSecondary">
            Create a copy of "{session.title || "Untitled Session"}" with all its messages and context. The forked
            session will be a new independent session.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-surface hover:bg-surface-hover border border-border rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleFork}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Forking...
                </>
              ) : (
                <>
                  <GitBranch className="w-4 h-4" />
                  Fork
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
