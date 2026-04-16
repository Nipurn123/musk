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

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={feature.label}
                className="group p-4 rounded-xl glass hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <feature.icon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <div className="font-semibold mb-1">{feature.label}</div>
                <div className="text-xs text-textMuted">{feature.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md mx-auto animate-scale-in">
          <div className="glass-strong rounded-3xl p-8 shadow-2xl border-gradient">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-pulse-glow">
                <span className="text-3xl font-bold text-gradient">100</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
              <p className="text-textSecondary">Connect to your AI coding assistant</p>
            </div>

            <form onSubmit={handleConnect} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">Server URL</label>
                <div className="relative group">
                  <div
                    className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
                      focusedField === "server" ? "opacity-100" : "opacity-0"
                    } bg-gradient-to-r from-primary/20 to-accent/20 blur-xl`}
                  />
                  <div className="relative">
                    <Server
                      className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                        focusedField === "server" ? "text-primary" : "text-textMuted"
                      }`}
                    />
                    <input
                      type="url"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      onFocus={() => setFocusedField("server")}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-12 pr-4 py-4 bg-surface/50 border-2 border-border rounded-xl focus:outline-none focus:border-primary/50 focus:bg-surface transition-all duration-300 hover:border-border/80"
                      placeholder="http://localhost:4096"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-textSecondary">
                  API Key <span className="text-textMuted font-normal">(optional)</span>
                </label>
                <div className="relative group">
                  <div
                    className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
                      focusedField === "api" ? "opacity-100" : "opacity-0"
                    } bg-gradient-to-r from-accent/20 to-primary/20 blur-xl`}
                  />
                  <div className="relative">
                    <Key
                      className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                        focusedField === "api" ? "text-accent" : "text-textMuted"
                      }`}
                    />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      onFocus={() => setFocusedField("api")}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-12 pr-4 py-4 bg-surface/50 border-2 border-border rounded-xl focus:outline-none focus:border-accent/50 focus:bg-surface transition-all duration-300 hover:border-border/80"
                      placeholder="Enter your API key"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-error/10 border border-error/30 rounded-xl flex items-start gap-3 animate-fade-in">
                  <div className="w-5 h-5 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-error text-xs">!</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-error">Connection Failed</div>
                    <div className="text-xs text-error/80 mt-1">{error}</div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full py-4 px-6 rounded-xl font-medium text-white overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-100 group-hover:opacity-90 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center justify-center gap-2 text-xs text-textMuted">
                <span>Start your backend with</span>
                <code className="px-2 py-1 rounded-md bg-surface/80 border border-border text-textSecondary font-mono">
                  100xprompt serve
                </code>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-textMuted">
              By connecting, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
