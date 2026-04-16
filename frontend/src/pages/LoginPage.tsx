import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Key, Server, ArrowRight, Loader2, Sparkles, Zap, Shield, Code2 } from "lucide-react"
import { useAuthStore } from "../store"
import { AnimatedBackground } from "../components/AnimatedBackground"

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [serverUrl, setServerUrl] = useState(window.location.origin)
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)

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

  const features = [
    { icon: Sparkles, label: "AI-Powered", description: "Intelligent code generation" },
    { icon: Zap, label: "Lightning Fast", description: "Real-time assistance" },
    { icon: Shield, label: "Secure", description: "End-to-end encryption" },
    { icon: Code2, label: "Multi-Language", description: "Supports 50+ languages" },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:block pl-8 animate-fade-in-up">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Next-Gen AI Assistant</span>
            </div>
            <h1 className="text-6xl font-bold mb-4 leading-tight">
              <span className="text-gradient-animated">100XPrompt</span>
            </h1>
            <p className="text-xl text-textSecondary leading-relaxed">
              The most advanced AI coding assistant. Build faster, debug smarter, and ship with confidence.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div
                key={feature.label}
                className="group p-4 rounded-xl glass-card hover-lift animate-slide-up-fade"
                style={{ animationDelay: `${200 + index * 80}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="font-semibold text-sm mb-1">{feature.label}</div>
                <div className="text-xs text-textMuted leading-relaxed">{feature.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md mx-auto animate-scale-in" style={{ animationDelay: "100ms" }}>
          <div className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/25 to-accent/25 flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-300">
                  <span className="text-3xl font-bold text-gradient">100</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
                <p className="text-textSecondary text-sm">Connect to your AI coding assistant</p>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-textMuted uppercase tracking-wider">Server URL</label>
                  <div className="relative group">
                    <div
                      className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
                        focusedField === "server" ? "opacity-100" : "opacity-0"
                      } bg-gradient-to-r from-primary/20 to-accent/20 blur-xl`}
                    />
                    <div className="relative">
                      <Server
                        className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                          focusedField === "server" ? "text-primary" : "text-textMuted"
                        }`}
                      />
                      <input
                        type="url"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        onFocus={() => setFocusedField("server")}
                        onBlur={() => setFocusedField(null)}
                        className="w-full pl-11 pr-4 py-3.5 bg-surface/50 border-2 border-border rounded-xl focus:outline-none focus:border-primary/50 focus:bg-surface transition-all duration-200 hover:border-border/70 text-sm"
                        placeholder="http://localhost:4096"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-textMuted uppercase tracking-wider">
                    API Key <span className="text-textMuted/60 font-normal normal-case">(optional)</span>
                  </label>
                  <div className="relative group">
                    <div
                      className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
                        focusedField === "api" ? "opacity-100" : "opacity-0"
                      } bg-gradient-to-r from-accent/20 to-primary/20 blur-xl`}
                    />
                    <div className="relative">
                      <Key
                        className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                          focusedField === "api" ? "text-accent" : "text-textMuted"
                        }`}
                      />
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        onFocus={() => setFocusedField("api")}
                        onBlur={() => setFocusedField(null)}
                        className="w-full pl-11 pr-4 py-3.5 bg-surface/50 border-2 border-border rounded-xl focus:outline-none focus:border-accent/50 focus:bg-surface transition-all duration-200 hover:border-border/70 text-sm"
                        placeholder="Enter your API key"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3.5 bg-error/10 border border-error/25 rounded-xl flex items-start gap-3 animate-slide-up-fade">
                    <div className="w-5 h-5 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-error text-xs font-bold">!</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-error">Connection Failed</div>
                      <div className="text-xs text-error/70 mt-0.5">{error}</div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full py-3.5 px-6 rounded-xl font-medium text-white overflow-hidden transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent group-hover:opacity-90 transition-opacity" />
                  <div className="relative flex items-center justify-center gap-2 text-sm">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Connect
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                      </>
                    )}
                  </div>
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-border/40">
                <div className="flex items-center justify-center gap-2 text-xs text-textMuted">
                  <span>Start your backend with</span>
                  <code className="px-2 py-1 rounded-md bg-surface/60 border border-border/50 text-textSecondary font-mono text-[11px]">
                    100xprompt serve
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center animate-fade-in" style={{ animationDelay: "300ms" }}>
            <p className="text-xs text-textMuted/70">
              By connecting, you agree to our{" "}
              <a href="#" className="text-primary/80 hover:text-primary hover:underline transition-colors">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary/80 hover:text-primary hover:underline transition-colors">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
