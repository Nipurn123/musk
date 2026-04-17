import { useState, useEffect, useCallback, useRef } from "react"
import {
  Search,
  X,
  File,
  FileCode,
  Hash,
  Loader2,
  AlertCircle,
  ChevronRight,
  FileSearch,
  FolderOpen,
  Code2,
} from "lucide-react"
import { clsx } from "clsx"
import { api, endpoints } from "../lib/api"
import { useGlobalStore } from "../store"

type SearchTab = "text" | "file" | "symbol"

interface TextMatch {
  path: {
    text: string
  }
  lines: {
    text: string
  }
  line_number: number
  absolute_offset: number
  submatches: Array<{
    match: {
      text: string
    }
    start: number
    end: number
  }>
}

interface FileMatch {
  path: string
  type?: "file" | "directory"
}

interface SymbolMatch {
  name: string
  kind: string
  path: string
  line?: number
}

interface SearchPanelProps {
  onClose: () => void
  onOpenFile?: (path: string, line?: number) => void
}

export function SearchPanel({ onClose, onOpenFile }: SearchPanelProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>("text")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TextMatch[] | FileMatch[] | SymbolMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [filePattern, setFilePattern] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (activeTab === "text") {
        const params = new URLSearchParams({ pattern: query })
        const data = await api.get<TextMatch[]>(`${endpoints.findText()}?${params}`)
        setResults(data)
      } else if (activeTab === "file") {
        const params = new URLSearchParams({ query })
        if (filePattern) params.append("type", filePattern)
        const data = await api.get<string[]>(`${endpoints.findFile()}?${params}`)
        setResults(data.map((path) => ({ path, type: "file" as const })))
      } else {
        const params = new URLSearchParams({ query })
        const data = await api.get<SymbolMatch[]>(`${endpoints.findSymbol()}?${params}`)
        setResults(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query, activeTab, filePattern])

  useEffect(() => {
    const timer = setTimeout(performSearch, 300)
    return () => clearTimeout(timer)
  }, [performSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter" && results.length > 0) {
        const selected = results[selectedIndex]
        if (activeTab === "text") {
          const match = selected as TextMatch
          onOpenFile?.(match.path.text, match.line_number)
        } else if (activeTab === "file") {
          const match = selected as FileMatch
          onOpenFile?.(match.path)
        }
        onClose()
      }
    },
    [results, selectedIndex, activeTab, onOpenFile, onClose],
  )

  useEffect(() => {
    const selectedElement = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    selectedElement?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  const highlightMatch = (text: string, submatches: TextMatch["submatches"]) => {
    if (!submatches || submatches.length === 0) return text

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    submatches.forEach((submatch, idx) => {
      if (submatch.start > lastIndex) {
        parts.push(text.slice(lastIndex, submatch.start))
      }
      parts.push(
        <span key={idx} className="bg-primary/30 text-primary font-medium">
          {text.slice(submatch.start, submatch.end)}
        </span>,
      )
      lastIndex = submatch.end
    })

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts
  }

  const renderTextResult = (match: TextMatch, index: number) => {
    const fileName = match.path.text.split("/").pop() || ""
    const dirPath = match.path.text.split("/").slice(0, -1).join("/")

    return (
      <button
        key={`${match.path.text}-${match.line_number}`}
        data-index={index}
        onClick={() => {
          onOpenFile?.(match.path.text, match.line_number)
          onClose()
        }}
        className={clsx(
          "w-full p-3 text-left transition-all border-b border-border/30",
          index === selectedIndex ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-surface-hover",
        )}
      >
        <div className="flex items-start gap-2">
          <FileCode className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">{fileName}</span>
              <span className="text-xs text-textMuted">:{match.line_number}</span>
            </div>
            <div className="text-xs text-textMuted truncate mb-1">{dirPath}</div>
            <pre className="text-xs font-mono bg-background/50 p-2 rounded overflow-x-auto">
              {highlightMatch(match.lines.text.trim(), match.submatches)}
            </pre>
          </div>
        </div>
      </button>
    )
  }

  const renderFileResult = (match: FileMatch, index: number) => {
    const fileName = match.path.split("/").pop() || ""
    const dirPath = match.path.split("/").slice(0, -1).join("/")
    const isDirectory = match.type === "directory"

    return (
      <button
        key={match.path}
        data-index={index}
        onClick={() => {
          if (!isDirectory) {
            onOpenFile?.(match.path)
            onClose()
          }
        }}
        className={clsx(
          "w-full p-3 text-left transition-all border-b border-border/30",
          index === selectedIndex ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-surface-hover",
        )}
      >
        <div className="flex items-center gap-2">
          {isDirectory ? (
            <FolderOpen className="w-4 h-4 text-warning shrink-0" />
          ) : (
            <File className="w-4 h-4 text-textMuted shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{fileName}</div>
            {dirPath && <div className="text-xs text-textMuted truncate">{dirPath}</div>}
          </div>
        </div>
      </button>
    )
  }

  const renderSymbolResult = (match: SymbolMatch, index: number) => {
    const fileName = match.path.split("/").pop() || ""

    return (
      <button
        key={`${match.path}-${match.name}`}
        data-index={index}
        onClick={() => {
          onOpenFile?.(match.path, match.line)
          onClose()
        }}
        className={clsx(
          "w-full p-3 text-left transition-all border-b border-border/30",
          index === selectedIndex ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-surface-hover",
        )}
      >
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{match.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-textMuted">{match.kind}</span>
            </div>
            <div className="text-xs text-textMuted truncate">
              {fileName}
              {match.line && `:${match.line}`}
            </div>
          </div>
        </div>
      </button>
    )
  }

  const tabs: Array<{ id: SearchTab; label: string; icon: typeof Search }> = [
    { id: "text", label: "Text", icon: FileSearch },
    { id: "file", label: "Files", icon: File },
    { id: "symbol", label: "Symbols", icon: Hash },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setResults([])
                inputRef.current?.focus()
              }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-textMuted hover:text-textSecondary hover:bg-surface-hover",
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeTab === "text"
                    ? "Search in files..."
                    : activeTab === "file"
                      ? "Search files by name..."
                      : "Search symbols..."
                }
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
              )}
            </div>
            {activeTab === "text" && (
              <button
                onClick={() => setCaseSensitive(!caseSensitive)}
                className={clsx(
                  "px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                  caseSensitive
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-surface-hover text-textMuted border-border hover:border-primary/20",
                )}
                title="Case sensitive"
              >
                Aa
              </button>
            )}
            {activeTab === "file" && (
              <select
                value={filePattern}
                onChange={(e) => setFilePattern(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs bg-background border border-border focus:outline-none focus:border-primary/50 transition-all"
              >
                <option value="">All</option>
                <option value="file">Files</option>
                <option value="directory">Directories</option>
              </select>
            )}
          </div>
        </div>

        <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto">
          {error && (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-error">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {!loading && !error && query && results.length === 0 && (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-textMuted mx-auto mb-3 opacity-50" />
              <p className="text-sm text-textMuted">No results found</p>
            </div>
          )}

          {!query && (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-textMuted mx-auto mb-3 opacity-50" />
              <p className="text-sm text-textMuted">Start typing to search</p>
              <p className="text-xs text-textMuted mt-2">
                Press <kbd className="px-1.5 py-0.5 bg-surface-hover rounded text-textSecondary">↑↓</kbd> to navigate,{" "}
                <kbd className="px-1.5 py-0.5 bg-surface-hover rounded text-textSecondary">Enter</kbd> to open,{" "}
                <kbd className="px-1.5 py-0.5 bg-surface-hover rounded text-textSecondary">Esc</kbd> to close
              </p>
            </div>
          )}

          {results.map((result, index) => {
            if (activeTab === "text") {
              return renderTextResult(result as TextMatch, index)
            } else if (activeTab === "file") {
              return renderFileResult(result as FileMatch, index)
            } else {
              return renderSymbolResult(result as SymbolMatch, index)
            }
          })}
        </div>

        <div className="p-3 border-t border-border bg-surface/50 flex items-center justify-between text-xs text-textMuted">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-surface-hover rounded">Cmd</kbd>+
              <kbd className="px-1.5 py-0.5 bg-surface-hover rounded">Shift</kbd>+
              <kbd className="px-1.5 py-0.5 bg-surface-hover rounded">F</kbd> to toggle
            </span>
          </div>
          <button onClick={onClose} className="flex items-center gap-1 hover:text-textSecondary transition-colors">
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
