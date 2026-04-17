import { useState, useEffect, useMemo, useCallback } from "react"
import {
  X,
  GitBranch,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  Columns,
  FileText,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  FileCode,
  Loader2,
  AlertCircle,
  FilePlus,
  Folder,
  Sparkles,
  Copy,
  Check,
} from "lucide-react"
import { useGlobalStore } from "../store"
import { fetchDirect, endpoints } from "../lib/api"
import { clsx } from "clsx"
import type { FileDiff } from "../types"
import { SessionFileExplorer } from "./SessionFileExplorer"

type ViewMode = "unified" | "split"
type DiffType = "created" | "modified" | "deleted"

interface SessionDiffViewerProps {
  sessionId: string
  onClose?: () => void
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts[parts.length - 1] : ""
}

function getLanguageFromExtension(ext: string): string {
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    vue: "vue",
    svelte: "svelte",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
  }
  return langMap[ext.toLowerCase()] || "plaintext"
}

const TOKEN_COLORS = {
  keyword: "#cc7bf4",
  string: "#9be963",
  number: "#5eeded",
  comment: "#6b7280",
  function: "#fbad60",
  operator: "#e8eaf0",
  tag: "#cc7bf4",
  attr: "#fbad60",
  attrValue: "#9be963",
  punctuation: "#8b949e",
  type: "#5eeded",
  decorator: "#cc7bf4",
  default: "#d4d4d8",
} as const

type TokenType = keyof typeof TOKEN_COLORS

interface Token {
  type: TokenType
  text: string
}

function getKeywords(lang: string): string[] {
  const common = ["import", "export", "from", "return", "if", "else", "for", "while", "const", "let", "var", "function", "class", "new", "this", "true", "false", "null", "undefined", "async", "await", "try", "catch", "throw", "finally", "switch", "case", "break", "continue", "default", "typeof", "instanceof", "in", "of", "void", "delete", "yield", "extends", "implements", "interface", "type", "enum", "namespace", "module", "declare", "as", "is", "readonly", "abstract", "static", "private", "protected", "public", "super", "with"]
  const pyKw = ["import", "from", "def", "class", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "raise", "with", "as", "pass", "break", "continue", "and", "or", "not", "is", "in", "None", "True", "False", "lambda", "yield", "global", "nonlocal", "del", "assert", "async", "await", "self"]
  const rustKw = ["fn", "let", "mut", "const", "pub", "mod", "use", "struct", "enum", "impl", "trait", "where", "match", "if", "else", "for", "while", "loop", "return", "break", "continue", "move", "ref", "self", "Self", "super", "crate", "async", "await", "dyn", "type", "as", "in", "true", "false"]
  const goKw = ["func", "package", "import", "var", "const", "type", "struct", "interface", "map", "chan", "go", "defer", "return", "if", "else", "for", "range", "switch", "case", "default", "break", "continue", "fallthrough", "select", "true", "false", "nil"]

  switch (lang) {
    case "python": case "py": return pyKw
    case "rust": case "rs": return rustKw
    case "go": return goKw
    case "html": case "css": return ["html", "head", "body", "div", "span", "style", "script", "link", "meta"]
    default: return common
  }
}

function findStringEnd(str: string, quote: string): number {
  let i = 1
  while (i < str.length) {
    if (str[i] === "\\") { i += 2; continue }
    if (str[i] === quote) return i + 1
    i++
  }
  return str.length
}

function tokenizeLine(line: string, lang: string): Token[] {
  const tokens: Token[] = []
  let remaining = line

  const kwList = getKeywords(lang)
  const kwPattern = kwList.length > 0 ? new RegExp(`\\b(${kwList.join("|")})\\b`) : null

  while (remaining.length > 0) {
    let matched = false

    const commentPrefixes = lang === "python" ? ["#"] : ["//"]
    for (const cp of commentPrefixes) {
      if (remaining.startsWith(cp)) {
        tokens.push({ type: "comment", text: remaining })
        remaining = ""
        matched = true
        break
      }
    }
    if (matched) break

    if (remaining.startsWith("/*")) {
      const end = remaining.indexOf("*/")
      if (end >= 0) {
        tokens.push({ type: "comment", text: remaining.slice(0, end + 2) })
        remaining = remaining.slice(end + 2)
      } else {
        tokens.push({ type: "comment", text: remaining })
        remaining = ""
      }
      continue
    }

    if (remaining.match(/^@\w+/)) {
      const m = remaining.match(/^@\w+/)!
      tokens.push({ type: "decorator", text: m[0] })
      remaining = remaining.slice(m[0].length)
      continue
    }

    if (remaining[0] === '"') {
      const end = findStringEnd(remaining, '"')
      tokens.push({ type: "string", text: remaining.slice(0, end) })
      remaining = remaining.slice(end)
      continue
    }

    if (remaining[0] === "'") {
      const end = findStringEnd(remaining, "'")
      tokens.push({ type: "string", text: remaining.slice(0, end) })
      remaining = remaining.slice(end)
      continue
    }

    if (remaining[0] === "`") {
      const end = findStringEnd(remaining, "`")
      tokens.push({ type: "string", text: remaining.slice(0, end) })
      remaining = remaining.slice(end)
      continue
    }

    const numMatch = remaining.match(/^(\d+\.?\d*([eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\b/)
    if (numMatch) {
      tokens.push({ type: "number", text: numMatch[0] })
      remaining = remaining.slice(numMatch[0].length)
      continue
    }

    if ((lang === "html" || lang === "tsx" || lang === "jsx") && remaining.match(/^<\/?[A-Za-z]/)) {
      const m = remaining.match(/^(<\/?)([A-Za-z][A-Za-z0-9.]*)/)
      if (m) {
        tokens.push({ type: "punctuation", text: m[1] })
        tokens.push({ type: "tag", text: m[2] })
        remaining = remaining.slice(m[0].length)
        continue
      }
    }

    if (kwPattern) {
      const m = remaining.match(kwPattern)
      if (m && m.index === 0) {
        tokens.push({ type: "keyword", text: m[0] })
        remaining = remaining.slice(m[0].length)
        continue
      }
    }

    const typeMatch = remaining.match(/^[A-Z][A-Za-z0-9_]*/)
    if (typeMatch) {
      tokens.push({ type: "type", text: typeMatch[0] })
      remaining = remaining.slice(typeMatch[0].length)
      continue
    }

    const fnMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*\()/)
    if (fnMatch) {
      tokens.push({ type: "function", text: fnMatch[1] })
      tokens.push({ type: "punctuation", text: fnMatch[2] })
      remaining = remaining.slice(fnMatch[0].length)
      continue
    }

    const idMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)
    if (idMatch) {
      tokens.push({ type: "default", text: idMatch[0] })
      remaining = remaining.slice(idMatch[0].length)
      continue
    }

    const opMatch = remaining.match(/^[=!<>+\-*/%&|^~?:;,.{}[\]()]+/)
    if (opMatch) {
      tokens.push({ type: "punctuation", text: opMatch[0] })
      remaining = remaining.slice(opMatch[0].length)
      continue
    }

    const wsMatch = remaining.match(/^\s+/)
    if (wsMatch) {
      tokens.push({ type: "default", text: wsMatch[0] })
      remaining = remaining.slice(wsMatch[0].length)
      continue
    }

    tokens.push({ type: "default", text: remaining[0] })
    remaining = remaining.slice(1)
  }

  return tokens
}

function parseUnifiedDiff(diffText: string) {
  const lines = diffText.split("\n")
  const result: Array<{
    type: "context" | "add" | "delete" | "header"
    content: string
    oldLine?: number
    newLine?: number
  }> = []
  let oldLineNum = 0
  let newLineNum = 0

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (match) {
        oldLineNum = parseInt(match[1])
        newLineNum = parseInt(match[2])
      }
      result.push({ type: "header", content: line })
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      result.push({ type: "add", content: line.substring(1), newLine: newLineNum++ })
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      result.push({ type: "delete", content: line.substring(1), oldLine: oldLineNum++ })
    } else if (line.startsWith(" ")) {
      result.push({ type: "context", content: line.substring(1), oldLine: oldLineNum++, newLine: newLineNum++ })
    } else if (
      !line.startsWith("diff ") &&
      !line.startsWith("index ") &&
      !line.startsWith("---") &&
      !line.startsWith("+++")
    ) {
      result.push({ type: "context", content: line, oldLine: oldLineNum++, newLine: newLineNum++ })
    }
  }

  return result
}

function getDiffType(diff: FileDiff): DiffType {
  if (!diff.before || diff.before.trim() === "") return "created"
  if (!diff.after || diff.after.trim() === "") return "deleted"
  return "modified"
}

function DiffLine({
  type,
  content,
  oldLine,
  newLine,
  lang,
}: {
  type: "context" | "add" | "delete" | "header"
  content: string
  oldLine?: number
  newLine?: number
  lang: string
}) {
  const [copied, setCopied] = useState(false)

  if (type === "header") {
    return (
      <div className="flex font-mono text-xs bg-primary/5 text-primary" style={{ minHeight: '1.375rem', lineHeight: '1.375rem' }}>
        <span className="flex items-start justify-end select-none pr-2 pl-1 text-textMuted/40 border-r border-border/30" style={{ width: '2.3rem' }}></span>
        <span className="flex items-start justify-center w-3 select-none text-textMuted/40"> </span>
        <div className="flex-1 pl-0 pr-2"><code className="text-xs" style={{ lineHeight: '1.375rem', whiteSpace: 'pre-wrap' }}>{content}</code></div>
      </div>
    )
  }

  const borderColor = type === "add" ? "border-l-emerald-500" : type === "delete" ? "border-l-red-500" : "border-l-transparent"
  const bgColor = type === "add" ? "bg-emerald-500/8" : type === "delete" ? "bg-red-500/8" : ""
  const prefix = type === "add" ? "+" : type === "delete" ? "-" : " "
  const prefixColor = type === "add" ? "text-emerald-400" : type === "delete" ? "text-red-400" : "text-textMuted/40"

  const tokens = tokenizeLine(content, lang)

  return (
    <div className={clsx("group/line flex border-l-[3px]", borderColor, bgColor)} style={{ minHeight: '1.375rem' }}>
      <span className="flex items-start justify-end select-none pr-2 font-mono text-xs pl-1 text-textMuted/40 border-r border-border/30" style={{ minHeight: '1.375rem', lineHeight: '1.375rem', width: '2.3rem' }}>
        {newLine ?? oldLine ?? ""}
      </span>
      <span className={clsx("flex items-start justify-center font-mono text-xs select-none relative w-3", prefixColor)} style={{ minHeight: '1.375rem', lineHeight: '1.375rem' }}>
        <span>{prefix}</span>
      </span>
      <div className="flex-1 flex items-start pl-0 pr-2 min-w-0 font-mono" style={{ minHeight: '1.375rem' }}>
        <code className="font-mono text-xs break-all text-textSecondary" style={{ lineHeight: '1.375rem', whiteSpace: 'pre-wrap' }}>
          {tokens.map((tok, j) => (
            <span key={j} style={{ color: TOKEN_COLORS[tok.type] }}>{tok.text}</span>
          ))}
        </code>
      </div>
    </div>
  )
}

function SplitDiffView({ before, after, file }: { before: string; after: string; file: string }) {
  const beforeLines = before.split("\n")
  const afterLines = after.split("\n")

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 overflow-auto border-r border-border/30">
        <div className="sticky top-0 bg-red-500/10 border-b border-border/30 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 z-10">
          Original
        </div>
        <div className="font-mono text-xs">
          {beforeLines.map((line, i) => (
            <div key={i} className="flex hover:bg-surfaceHover/30 transition-colors">
              <div className="w-10 px-2 text-right text-textMuted/40 border-r border-border/30 select-none shrink-0 bg-surface/50">
                {i + 1}
              </div>
              <div className="px-3 py-0.5 text-textSecondary flex-1 bg-red-500/5 whitespace-pre">{line}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 bg-emerald-500/10 border-b border-border/30 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 z-10">
          Modified
        </div>
        <div className="font-mono text-xs">
          {afterLines.map((line, i) => (
            <div key={i} className="flex hover:bg-surfaceHover/30 transition-colors">
              <div className="w-10 px-2 text-right text-textMuted/40 border-r border-border/30 select-none shrink-0 bg-surface/50">
                {i + 1}
              </div>
              <div className="px-3 py-0.5 text-textSecondary flex-1 bg-emerald-500/5 whitespace-pre">{line}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FileDiffView({
  diff,
  viewMode,
  showHeader = true,
}: {
  diff: FileDiff
  viewMode: ViewMode
  showHeader?: boolean
}) {
  const ext = getFileExtension(diff.file)
  const language = getLanguageFromExtension(ext)
  const diffType = getDiffType(diff)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(diff.after)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [diff.after])

  return (
    <div className="flex flex-col h-full">
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-surface/50 shrink-0">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-textMuted" />
            <span className="text-sm font-medium text-textPrimary truncate">{diff.file.split("/").pop()}</span>
            <span className="text-xs text-textMuted uppercase">{ext}</span>
            {diffType === "created" && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold">NEW</span>
            )}
            {diffType === "deleted" && (
              <span className="text-[10px] text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded font-bold">DEL</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400">+{diff.additions}</span>
            <span className="text-xs text-red-400">-{diff.deletions}</span>
            <button
              onClick={handleCopy}
              className="h-7 px-2 rounded text-xs flex items-center gap-1 bg-surface-hover hover:bg-surface-active transition-colors text-textMuted"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto bg-background">
        {diffType === "created" ? (
          <div className="overflow-x-auto">
            {diff.after.split("\n").map((line, i) => (
              <div key={i} className="group/line flex border-l-[3px] border-l-emerald-500 bg-emerald-500/5" style={{ minHeight: '1.375rem' }}>
                <span className="flex items-start justify-end select-none pr-2 font-mono text-xs pl-1 text-textMuted/40 border-r border-border/30" style={{ minHeight: '1.375rem', lineHeight: '1.375rem', width: '2.3rem' }}>
                  {i + 1}
                </span>
                <span className="flex items-start justify-center font-mono text-xs select-none relative w-3 text-emerald-400" style={{ minHeight: '1.375rem', lineHeight: '1.375rem' }}>
                  <span>+</span>
                </span>
                <div className="flex-1 flex items-start pl-0 pr-2 min-w-0 font-mono" style={{ minHeight: '1.375rem' }}>
                  <code className="font-mono text-xs break-all text-textSecondary" style={{ lineHeight: '1.375rem', whiteSpace: 'pre-wrap' }}>{line || "\u00a0"}</code>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === "unified" ? (
          <div className="overflow-x-auto">
            {parseUnifiedDiff(diff.after).map((line, i) => (
              <DiffLine key={i} {...line} lang={language} />
            ))}
          </div>
        ) : (
          <SplitDiffView before={diff.before} after={diff.after} file={diff.file} />
        )}
      </div>
    </div>
  )
}

export function SessionDiffViewer({ sessionId, onClose }: SessionDiffViewerProps) {
  const diffs = useGlobalStore((s) => s.diffs)
  const setDiffs = useGlobalStore((s) => s.setDiffs)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [selectedDiff, setSelectedDiff] = useState<FileDiff | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("unified")

  const sessionDiffs = useMemo(() => {
    return diffs.get(sessionId) || []
  }, [diffs, sessionId])

  useEffect(() => {
    fetchDiffs()
  }, [sessionId])

  useEffect(() => {
    if (sessionDiffs.length > 0 && !selectedFile) {
      setSelectedFile(sessionDiffs[0].file)
      setSelectedDiff(sessionDiffs[0])
    }
  }, [sessionDiffs, selectedFile])

  async function fetchDiffs() {
    if (!sessionId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchDirect<FileDiff[]>(endpoints.sessionDiff(sessionId))
      setDiffs(sessionId, response)
    } catch (err) {
      console.error("Failed to fetch diffs:", err)
      setError(err instanceof Error ? err.message : "Failed to load diffs")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = useCallback((path: string, diff: FileDiff) => {
    setSelectedFile(path)
    setSelectedDiff(diff)
  }, [])

  const totalAdditions = useMemo(() => sessionDiffs.reduce((sum, d) => sum + d.additions, 0), [sessionDiffs])
  const totalDeletions = useMemo(() => sessionDiffs.reduce((sum, d) => sum + d.deletions, 0), [sessionDiffs])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-textMuted">Loading changes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-error" />
          </div>
          <p className="text-sm text-error mb-3">{error}</p>
          <button
            onClick={fetchDiffs}
            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (sessionDiffs.length === 0) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between px-2 py-2 bg-surface gap-2 border-b border-border">
          <div className="flex items-center gap-2 flex-1 overflow-hidden pl-3">
            <h2 className="text-sm font-normal text-textSecondary truncate">Changes</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <GitBranch className="w-8 h-8 text-textMuted" />
            </div>
            <p className="text-sm text-textMuted mb-1">No changes yet</p>
            <p className="text-xs text-textMuted/60">Changes will appear here when files are modified</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-2 py-2 bg-surface gap-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 flex-1 overflow-hidden pl-3">
          <h2 className="text-sm font-normal text-textSecondary truncate flex-1 min-w-0">
            Changes
            <span className="text-textMuted/50"> · </span>
            <span className="text-textMuted">{sessionDiffs.length} file{sessionDiffs.length !== 1 ? "s" : ""}</span>
          </h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {totalAdditions > 0 && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 px-1.5">
              <Plus className="w-3 h-3" />+{totalAdditions}
            </span>
          )}
          {totalDeletions > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400 px-1.5">
              <Minus className="w-3 h-3" />-{totalDeletions}
            </span>
          )}

          <div className="flex h-8 whitespace-nowrap">
            <button
              onClick={() => setViewMode("unified")}
              className={clsx(
                "text-xs rounded-l-lg h-full flex items-center justify-center px-2 border-y border-l border-border hover:bg-surface-hover transition-colors",
                viewMode === "unified" ? "bg-surface-hover text-textPrimary" : "bg-surface text-textMuted",
              )}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={clsx(
                "text-xs rounded-r-lg h-full flex items-center justify-center px-2 border border-border hover:bg-surface-hover transition-colors",
                viewMode === "split" ? "bg-surface-hover text-textPrimary" : "bg-surface text-textMuted",
              )}
            >
              Split
            </button>
          </div>

          <button
            onClick={fetchDiffs}
            className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary"
            title="Refresh"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10.386 2.51A7.5 7.5 0 1 1 5.499 4H3a.5.5 0 0 1 0-1h3.5a.5.5 0 0 1 .49.402L7 3.5V7a.5.5 0 0 1-1 0V4.879a6.5 6.5 0 1 0 4.335-1.37L10 3.5l-.1-.01a.5.5 0 0 1 .1-.99z" /></svg>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-56 border-r border-border shrink-0">
          <SessionFileExplorer
            diffs={sessionDiffs}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
          />
        </div>

        <div className="flex-1 min-w-0">
          {selectedDiff ? (
            <FileDiffView diff={selectedDiff} viewMode={viewMode} />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-textMuted">
              Select a file to view changes
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
