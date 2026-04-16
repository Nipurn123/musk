import { useState, useEffect } from "react"
import {
  Server,
  Plus,
  Trash2,
  Play,
  Square,
  RefreshCw,
  Key,
  ChevronDown,
  ChevronRight,
  FileText,
  Wrench,
  AlertCircle,
  Check,
  Loader2,
  X,
} from "lucide-react"
import { clsx } from "clsx"
import { api, endpoints } from "../lib/api"
import type { MCPServer, MCPServerConfig, MCPStatus, MCPResource, MCPTool } from "../types"
import { Button } from "./ui/Button"
import { Input } from "./ui/Input"

export function MCPSettings() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set())
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const [newServer, setNewServer] = useState<MCPServerConfig>({
    name: "",
    command: "",
    args: [],
    env: {},
  })
  const [argsInput, setArgsInput] = useState("")
  const [envInput, setEnvInput] = useState("")

  useEffect(() => {
    loadMCPServers()
  }, [])

  async function loadMCPServers() {
    try {
      setLoading(true)
      const status = await api.get<MCPStatus>(endpoints.mcp())
      setServers(status.servers || [])
      setError(null)
    } catch (err) {
      console.error("Failed to load MCP servers:", err)
      setError("Failed to load MCP servers")
    } finally {
      setLoading(false)
    }
  }

  async function addServer() {
    if (!newServer.name || !newServer.command) return

    try {
      setActionInProgress("add")
      const args = argsInput
        .split(" ")
        .map((a) => a.trim())
        .filter(Boolean)
      const env: Record<string, string> = {}
      envInput.split("\n").forEach((line) => {
        const [key, ...values] = line.split("=")
        if (key && values.length > 0) {
          env[key.trim()] = values.join("=").trim()
        }
      })

      await api.post(endpoints.mcp(), {
        name: newServer.name,
        command: newServer.command,
        args: args.length > 0 ? args : undefined,
        env: Object.keys(env).length > 0 ? env : undefined,
      })

      setNewServer({ name: "", command: "", args: [], env: {} })
      setArgsInput("")
      setEnvInput("")
      setShowAddForm(false)
      await loadMCPServers()
    } catch (err) {
      console.error("Failed to add MCP server:", err)
      setError("Failed to add MCP server")
    } finally {
      setActionInProgress(null)
    }
  }

  async function connectServer(name: string) {
    try {
      setActionInProgress(`connect-${name}`)
      await api.post(endpoints.mcpConnect(name))
      await loadMCPServers()
    } catch (err) {
      console.error("Failed to connect:", err)
      setError(`Failed to connect to ${name}`)
    } finally {
      setActionInProgress(null)
    }
  }

  async function disconnectServer(name: string) {
    try {
      setActionInProgress(`disconnect-${name}`)
      await api.post(endpoints.mcpDisconnect(name))
      await loadMCPServers()
    } catch (err) {
      console.error("Failed to disconnect:", err)
      setError(`Failed to disconnect from ${name}`)
    } finally {
      setActionInProgress(null)
    }
  }

  async function startOAuth(name: string) {
    try {
      setActionInProgress(`auth-${name}`)
      const response = await api.post<{ authUrl: string }>(endpoints.mcpAuth(name))
      if (response.authUrl) {
        window.open(response.authUrl, "_blank", "width=600,height=800")
      }
    } catch (err) {
      console.error("Failed to start OAuth:", err)
      setError(`Failed to start OAuth for ${name}`)
    } finally {
      setActionInProgress(null)
    }
  }

  async function removeCredentials(name: string) {
    try {
      setActionInProgress(`remove-auth-${name}`)
      await api.delete(endpoints.mcpAuthRemove(name))
      await loadMCPServers()
    } catch (err) {
      console.error("Failed to remove credentials:", err)
      setError(`Failed to remove credentials for ${name}`)
    } finally {
      setActionInProgress(null)
    }
  }

  async function deleteServer(name: string) {
    if (!confirm(`Delete MCP server "${name}"?`)) return

    try {
      setActionInProgress(`delete-${name}`)
      await api.delete(endpoints.mcpAuthRemove(name))
      await loadMCPServers()
    } catch (err) {
      console.error("Failed to delete server:", err)
      setError(`Failed to delete ${name}`)
    } finally {
      setActionInProgress(null)
    }
  }

  function toggleServer(name: string) {
    setExpandedServers((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "connected":
        return "bg-success"
      case "connecting":
        return "bg-warning"
      case "error":
        return "bg-error"
      default:
        return "bg-textMuted"
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "connected":
        return <Check className="w-4 h-4 text-success" />
      case "connecting":
        return <Loader2 className="w-4 h-4 text-warning animate-spin" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-error" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          MCP Servers
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={loadMCPServers} disabled={loading}>
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4" />
            Add Server
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/30 rounded-xl flex items-center gap-2 text-sm text-error">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-error/80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="p-4 bg-surface/50 border border-border rounded-xl space-y-3 animate-fade-in">
          <h4 className="text-sm font-semibold">Add New MCP Server</h4>
          <Input
            label="Server Name"
            placeholder="my-mcp-server"
            value={newServer.name}
            onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
          />
          <Input
            label="Command"
            placeholder="npx -y @modelcontextprotocol/server-filesystem"
            value={newServer.command}
            onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
          />
          <Input
            label="Arguments (space-separated)"
            placeholder="/path/to/directory"
            value={argsInput}
            onChange={(e) => setArgsInput(e.target.value)}
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-textSecondary">
              Environment Variables (KEY=value, one per line)
            </label>
            <textarea
              className="w-full px-4 py-3 bg-surface/50 border-2 border-border rounded-xl text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-primary/50 hover:border-border/80 transition-all text-sm"
              rows={3}
              placeholder="API_KEY=abc123&#10;ANOTHER_VAR=value"
              value={envInput}
              onChange={(e) => setEnvInput(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={addServer}
              disabled={!newServer.name || !newServer.command || actionInProgress === "add"}
              loading={actionInProgress === "add"}
            >
              Add Server
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : servers.length === 0 ? (
        <div className="text-center py-8 text-textMuted">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No MCP servers configured</p>
          <p className="text-xs mt-1">Add a server to extend AI capabilities</p>
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map((server) => (
            <div
              key={server.name}
              className="bg-surface/50 border border-border rounded-xl overflow-hidden animate-fade-in"
            >
              <button
                onClick={() => toggleServer(server.name)}
                className="w-full p-4 flex items-center gap-3 hover:bg-surface-hover transition-all"
              >
                <div className={clsx("w-2 h-2 rounded-full", getStatusColor(server.status))} />
                <Server className="w-4 h-4 text-textMuted" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{server.name}</div>
                  <div className="text-xs text-textMuted">{server.config.command}</div>
                </div>
                {getStatusIcon(server.status)}
                {expandedServers.has(server.name) ? (
                  <ChevronDown className="w-4 h-4 text-textMuted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-textMuted" />
                )}
              </button>

              {expandedServers.has(server.name) && (
                <div className="border-t border-border p-4 space-y-3 animate-fade-in">
                  {server.error && (
                    <div className="p-2 bg-error/10 border border-error/30 rounded-lg text-xs text-error">
                      {server.error}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {server.status === "connected" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => disconnectServer(server.name)}
                        loading={actionInProgress === `disconnect-${server.name}`}
                        disabled={actionInProgress?.startsWith("disconnect-")}
                      >
                        <Square className="w-3 h-3" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => connectServer(server.name)}
                        loading={actionInProgress === `connect-${server.name}`}
                        disabled={actionInProgress?.startsWith("connect-") || server.status === "connecting"}
                      >
                        <Play className="w-3 h-3" />
                        Connect
                      </Button>
                    )}

                    {server.requiresAuth && !server.hasCredentials && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startOAuth(server.name)}
                        loading={actionInProgress === `auth-${server.name}`}
                        disabled={actionInProgress?.startsWith("auth-")}
                      >
                        <Key className="w-3 h-3" />
                        Authenticate
                      </Button>
                    )}

                    {server.hasCredentials && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCredentials(server.name)}
                        loading={actionInProgress === `remove-auth-${server.name}`}
                        disabled={actionInProgress?.startsWith("remove-auth-")}
                      >
                        <Key className="w-3 h-3" />
                        Remove Credentials
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteServer(server.name)}
                      loading={actionInProgress === `delete-${server.name}`}
                      disabled={actionInProgress?.startsWith("delete-")}
                      className="text-error hover:text-error hover:bg-error/10"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>

                  {server.status === "connected" && (
                    <>
                      {server.resources && server.resources.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-textMuted flex items-center gap-1.5">
                            <FileText className="w-3 h-3" />
                            Resources ({server.resources.length})
                          </div>
                          <div className="grid gap-1.5">
                            {server.resources.map((resource, idx) => (
                              <div
                                key={idx}
                                className="p-2 bg-background/50 rounded-lg text-xs border border-border/50"
                              >
                                <div className="font-medium">{resource.name}</div>
                                {resource.description && (
                                  <div className="text-textMuted mt-0.5">{resource.description}</div>
                                )}
                                <div className="text-textMuted mt-0.5 font-mono text-[10px] truncate">
                                  {resource.uri}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {server.tools && server.tools.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-textMuted flex items-center gap-1.5">
                            <Wrench className="w-3 h-3" />
                            Tools ({server.tools.length})
                          </div>
                          <div className="grid gap-1.5">
                            {server.tools.map((tool, idx) => (
                              <div
                                key={idx}
                                className="p-2 bg-background/50 rounded-lg text-xs border border-border/50"
                              >
                                <div className="font-medium">{tool.name}</div>
                                {tool.description && <div className="text-textMuted mt-0.5">{tool.description}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
