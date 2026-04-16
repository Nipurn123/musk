import { useState } from "react"
import { X, Loader2, Check, AlertCircle } from "lucide-react"
import { useSDK } from "../context"
import type { Session } from "../types"

interface RenameDialogProps {
  session: Session
  onClose: () => void
  onSuccess: () => void
}

export function RenameDialog({ session, onClose, onSuccess }: RenameDialogProps) {
  const { client } = useSDK()
  const [title, setTitle] = useState(session.title || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    setError(null)

    try {
      await client.session.update({
        sessionID: session.id,
        title: title.trim(),
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename session")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg">Rename Session</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
            <X className="w-5 h-5 text-textMuted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Session Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter session name..."
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-surface hover:bg-surface-hover border border-border rounded-xl transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
