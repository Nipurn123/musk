import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Key, Server, ArrowRight, Loader2 } from "lucide-react"
import { useAuthStore } from "../store"

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [serverUrl, setServerUrl] = useState(window.location.origin)
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${serverUrl}/global/health`, {
        headers: apiKey ? { "X-API-Key": apiKey } : {},
      })

      if (!response.ok) {
        throw new Error("Failed to connect to server")
      }

      setAuth(apiKey || "no-key", serverUrl)
      navigate("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/assets/100X_Prompt.svg"
              alt="100xprompt"
              className="w-20 h-20 mx-auto mb-4 object-contain"
            />
            <h1 className="text-xl font-display font-bold tracking-tight text-textPrimary">Welcome back</h1>
            <p className="text-sm text-textSecondary mt-1">Connect to your coding assistant</p>
          </div>

          {/* Form */}
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-textMuted uppercase tracking-[0.1em]">Server URL</label>
              <div className="relative">
                <Server className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 transition-colors text-sm"
                  placeholder="http://localhost:4096"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-textMuted uppercase tracking-[0.1em]">
                API Key <span className="font-normal normal-case opacity-60">(optional)</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 transition-colors text-sm"
                  placeholder="Enter your API key"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
                <div className="text-sm font-medium text-error">Connection Failed</div>
                <div className="text-xs text-error/70 mt-0.5">{error}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-lg font-semibold text-sm text-white bg-primary hover:bg-primaryHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center justify-center gap-2 text-xs text-textMuted">
              <span>Start your backend with</span>
              <code className="px-2 py-1 rounded bg-background border border-border text-textSecondary font-mono text-[11px]">
                100xprompt serve
              </code>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-textMuted">
          © 2026 100X Prompt Pvt. Ltd. All rights reserved.
        </p>
      </div>
    </div>
  )
}
