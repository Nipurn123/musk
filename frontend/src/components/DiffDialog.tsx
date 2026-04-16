import { useState, useEffect } from "react"
import { X, Loader2, FileText, AlertCircle, Plus, Minus } from "lucide-react"
import { useSDK } from "../context"
import type { Session, FileDiff } from "../types"
import { clsx } from "clsx"

interface DiffDialogProps {
  session: Session
  onClose: () => void
}

export function DiffDialog({ session, onClose }: DiffDialogProps) {
  const { client } = useSDK()
  const [loading, setLoading] = useState(true)
  const [diffs, setDiffs] = useState<FileDiff[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  useEffect(() => {
    loadDiffs()
  }, [session.id])

  async function loadDiffs() {
    setLoading(true)
    setError(null)

    try {
      const response = await client.session.diff({
        sessionID: session.id,
      })
      const data = response.data as FileDiff[]
      setDiffs(Array.isArray(data) ? data : [])
      if (data && data.length > 0) {
        setSelectedFile(data[0].file)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load diffs")
    } finally {
      setLoading(false)
    }
  }

  const selectedDiff = diffs.find((d) => d.file === selectedFile)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Session Diffs</h2>
              <p className="text-xs text-textMuted">{diffs.length} file(s) changed</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
            <X className="w-5 h-5 text-textMuted" />
          </button>
        </div>

        {error && (
          <div className="px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : diffs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-textSecondary">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No file changes in this session</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-64 border-r border-border overflow-y-auto shrink-0">
                <div className="p-2 space-y-1">
                  {diffs.map((diff) => (
                    <button
                      key={diff.file}
                      onClick={() => setSelectedFile(diff.file)}
                      className={clsx(
                        "w-full p-3 rounded-lg text-left transition-all text-sm",
                        selectedFile === diff.file
                          ? "bg-primary/10 border border-primary/20 text-primary"
                          : "hover:bg-surface-hover border border-transparent",
                      )}
                    >
                      <div className="font-mono truncate mb-1">{diff.file}</div>
                      <div className="flex items-center gap-3 text-xs text-textMuted">
                        <span className="flex items-center gap-1 text-success">
                          <Plus className="w-3 h-3" />
                          {diff.additions}
                        </span>
                        <span className="flex items-center gap-1 text-error">
                          <Minus className="w-3 h-3" />
                          {diff.deletions}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-background">
                {selectedDiff && (
                  <pre className="p-4 text-xs font-mono overflow-x-auto">
                    <code>{selectedDiff.after || selectedDiff.before}</code>
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
