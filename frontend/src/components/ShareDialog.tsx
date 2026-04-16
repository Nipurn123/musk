import { useState, useEffect } from "react"
import { X, Loader2, Link, Copy, Check, AlertCircle, ExternalLink } from "lucide-react"
import { useSDK } from "../context"
import type { Session } from "../types"

interface ShareDialogProps {
  session: Session
  onClose: () => void
}

export function ShareDialog({ session, onClose }: ShareDialogProps) {
  const { client } = useSDK()
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createShare()
  }, [session.id])

  async function createShare() {
    setLoading(true)
    setError(null)

    try {
      const response = await client.session.share({
        sessionID: session.id,
      })
      const data = response.data as { url?: string }
      setShareUrl(data.url || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create share link")
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard() {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Link className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-bold text-lg">Share Session</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
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

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : shareUrl ? (
            <>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-sm text-textSecondary mb-3">Anyone with this link can view this session:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open in new tab
              </a>
            </>
          ) : (
            <div className="text-center py-8 text-textSecondary">
              <p>Unable to create share link</p>
              <button
                onClick={createShare}
                className="mt-3 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
