import { useState } from "react"
import { X, Loader2, Trash2, AlertTriangle } from "lucide-react"
import { useSDK } from "../context"
import type { Session } from "../types"

interface DeleteDialogProps {
  session: Session
  onClose: () => void
  onSuccess: () => void
}

export function DeleteDialog({ session, onClose, onSuccess }: DeleteDialogProps) {
  const { client } = useSDK()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)

    try {
      await client.session.delete({
        sessionID: session.id,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-error" />
            </div>
            <h2 className="font-bold text-lg">Delete Session</h2>
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
          <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-textPrimary">Are you sure you want to delete this session?</p>
              <p className="text-xs text-textSecondary mt-1">
                This will permanently delete "{session.title || "Untitled Session"}" and all its messages. This action
                cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-surface hover:bg-surface-hover border border-border rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-error hover:bg-error/90 text-white rounded-xl transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
