import { useState, useMemo, useCallback } from "react"
import { X, Copy, Check, FileCode, GitBranch } from "lucide-react"
import { clsx } from "clsx"

interface ArtifactViewerProps {
  filename: string
  content: string
  language?: string
  diffType?: "normal" | "created" | "modified" | "deleted"
  onClose: () => void
}

function getExtension(name: string) {
  const parts = name.split(".")
  return parts.length > 1 ? parts[parts.length - 1] : ""
}

function getDisplayName(path: string) {
  const parts = path.split("/")
  return parts[parts.length - 1] || path
}

// Syntax highlighting colors - refined palette
const TOKEN_COLORS = {
  keyword: "#c792ea",
  string: "#c3e88d",
  number: "#f78c6c",
  comment: "#546e7a",
  function: "#82aaff",
  operator: "#89ddff",
  tag: "#f07178",
  attr: "#ffcb6b",
  attrValue: "#c3e88d",
  punctuation: "#89ddff",
  type: "#ffcb6b",
  decorator: "#c792ea",
  default: "#d4d4d8",
} as const

type TokenType = keyof typeof TOKEN_COLORS

interface Token {
  type: TokenType
  text: string
}

// Line tokenizer
function tokenizeLine(line: string, lang: string): Token[] {
  const tokens: Token[] = []
  let remaining = line

  const kwList = getKeywords(lang)
  const kwPattern = kwList.length > 0 ? new RegExp(`\\b(${kwList.join("|")})\\b`) : null

  while (remaining.length > 0) {
    let matched = false

    // Line comment
    const commentPrefixes = lang === "python" ? ["#"] : ["//", "#"]
    for (const cp of commentPrefixes) {
      if (remaining.startsWith(cp)) {
        tokens.push({ type: "comment", text: remaining })
        remaining = ""
        matched = true
        break
      }
    }
    if (matched) break

    // Multi-line comment
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

    // Decorator
    if (remaining.match(/^@\w+/)) {
      const m = remaining.match(/^@\w+/)!
      tokens.push({ type: "decorator", text: m[0] })
      remaining = remaining.slice(m[0].length)
      continue
    }

    // Strings
    for (const quote of ['"', "'", "`"]) {
      if (remaining[0] === quote) {
        const end = findStringEnd(remaining, quote)
        tokens.push({ type: "string", text: remaining.slice(0, end) })
        remaining = remaining.slice(end)
        matched = true
        break
      }
    }
    if (matched) continue

    // Numbers
    const numMatch = remaining.match(/^(\d+\.?\d*([eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\b/)
    if (numMatch) {
      tokens.push({ type: "number", text: numMatch[0] })
      remaining = remaining.slice(numMatch[0].length)
      continue
    }

    // HTML/JSX tags
    if ((lang === "html" || lang === "tsx" || lang === "jsx") && remaining.match(/^<\/?[A-Za-z]/)) {
      const m = remaining.match(/^(<\/?)([A-Za-z][A-Za-z0-9.]*)/)
      if (m) {
        tokens.push({ type: "punctuation", text: m[1] })
        tokens.push({ type: "tag", text: m[2] })
        remaining = remaining.slice(m[0].length)
        continue
      }
    }

    // Keywords
    if (kwPattern) {
      const m = remaining.match(kwPattern)
      if (m && m.index === 0) {
        tokens.push({ type: "keyword", text: m[0] })
        remaining = remaining.slice(m[0].length)
        continue
      }
    }

    // Type annotations
    const typeMatch = remaining.match(/^[A-Z][A-Za-z0-9_]*/)
    if (typeMatch) {
      tokens.push({ type: "type", text: typeMatch[0] })
      remaining = remaining.slice(typeMatch[0].length)
      continue
    }

    // Function calls
    const fnMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*\()/)
    if (fnMatch) {
      tokens.push({ type: "function", text: fnMatch[1] })
      tokens.push({ type: "punctuation", text: fnMatch[2] })
      remaining = remaining.slice(fnMatch[0].length)
      continue
    }

    // Identifiers
    const idMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)
    if (idMatch) {
      tokens.push({ type: "default", text: idMatch[0] })
      remaining = remaining.slice(idMatch[0].length)
      continue
    }

    // Operators
    const opMatch = remaining.match(/^[=!<>+\-*/%&|^~?:;,.{}[\]()]+/)
    if (opMatch) {
      tokens.push({ type: "punctuation", text: opMatch[0] })
      remaining = remaining.slice(opMatch[0].length)
      continue
    }

    // Whitespace
    const wsMatch = remaining.match(/^\s+/)
    if (wsMatch) {
      tokens.push({ type: "default", text: wsMatch[0] })
      remaining = remaining.slice(wsMatch[0].length)
      continue
    }

    // Fallback
    tokens.push({ type: "default", text: remaining[0] })
    remaining = remaining.slice(1)
  }

  return tokens
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

function getKeywords(lang: string): string[] {
  const common = ["import", "export", "from", "return", "if", "else", "for", "while", "const", "let", "var", "function", "class", "new", "this", "true", "false", "null", "undefined", "async", "await", "try", "catch", "throw", "finally", "switch", "case", "break", "continue", "default", "typeof", "instanceof", "in", "of", "void", "delete", "yield", "extends", "implements", "interface", "type", "enum", "namespace", "module", "declare", "as", "is", "readonly", "abstract", "static", "private", "protected", "public", "super", "with"]
  const pyKw = ["import", "from", "def", "class", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "raise", "with", "as", "pass", "break", "continue", "and", "or", "not", "is", "in", "None", "True", "False", "lambda", "yield", "global", "nonlocal", "del", "assert", "async", "await", "self"]
  const rustKw = ["fn", "let", "mut", "const", "pub", "mod", "use", "struct", "enum", "impl", "trait", "where", "match", "if", "else", "for", "while", "loop", "return", "break", "continue", "move", "ref", "self", "Self", "super", "crate", "async", "await", "dyn", "type", "as", "in", "true", "false"]
  const goKw = ["func", "package", "import", "var", "const", "type", "struct", "interface", "map", "chan", "go", "defer", "return", "if", "else", "for", "range", "switch", "case", "default", "break", "continue", "fallthrough", "select", "true", "false", "nil"]

  switch (lang) {
    case "python": case "py": return pyKw
    case "rust": case "rs": return rustKw
    case "go": return goKw
    case "html": case "css": return []
    default: return common
  }
}

function getLangFromExt(ext: string): string {
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
    py: "python", rs: "rust", go: "go",
    java: "java", cpp: "cpp", c: "c", cs: "csharp",
    rb: "ruby", php: "php", swift: "swift", kt: "kotlin",
    html: "html", css: "css", scss: "scss",
    json: "json", yaml: "yaml", yml: "yaml",
    md: "markdown", sql: "sql", sh: "bash", bash: "bash",
    xml: "html", svg: "html",
  }
  return map[ext.toLowerCase()] || "plaintext"
}

// Diff parsing
interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

interface DiffLine {
  type: "add" | "delete" | "context"
  content: string
  oldLine?: number
  newLine?: number
}

interface ParsedDiff {
  oldFile: string
  newFile: string
  hunks: DiffHunk[]
}

function isDiffContent(content: string): boolean {
  const lines = content.split("\n").slice(0, 20)
  return lines.some(l => 
    l.startsWith("--- ") || 
    l.startsWith("+++ ") || 
    l.startsWith("@@ ") ||
    l.startsWith("<file_edited>") ||
    l.startsWith("<diff>")
  )
}

function parseDiff(content: string): ParsedDiff | null {
  const lines = content.split("\n")
  let oldFile = ""
  let newFile = ""
  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null
  let oldLine = 0
  let newLine = 0

  for (const line of lines) {
    // Skip XML wrappers
    if (line.startsWith("<file_edited>") || line.startsWith("</file_edited>") || 
        line.startsWith("<diff>") || line.startsWith("</diff>")) {
      continue
    }

    // File headers
    if (line.startsWith("--- ")) {
      oldFile = line.slice(4).replace(/^a\//, "")
      continue
    }
    if (line.startsWith("+++ ")) {
      newFile = line.slice(4).replace(/^b\//, "")
      continue
    }

    // Hunk header
    const hunkMatch = line.match(/^@@ -(\d+),?\d* \+(\d+),?\d* @@/)
    if (hunkMatch) {
      if (currentHunk) hunks.push(currentHunk)
      currentHunk = {
        oldStart: parseInt(hunkMatch[1]),
        oldLines: 0,
        newStart: parseInt(hunkMatch[2]),
        newLines: 0,
        lines: []
      }
      oldLine = currentHunk.oldStart
      newLine = currentHunk.newStart
      continue
    }

    if (!currentHunk) continue

    // Diff lines
    if (line.startsWith("+")) {
      currentHunk.lines.push({ type: "add", content: line.slice(1), newLine: newLine++ })
      currentHunk.newLines++
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({ type: "delete", content: line.slice(1), oldLine: oldLine++ })
      currentHunk.oldLines++
    } else if (line.startsWith(" ")) {
      currentHunk.lines.push({ type: "context", content: line.slice(1), oldLine: oldLine++, newLine: newLine++ })
      currentHunk.oldLines++
      currentHunk.newLines++
    } else if (line.match(/^\d/)) {
      // Line numbers without prefix (rare)
      currentHunk.lines.push({ type: "context", content: line, oldLine: oldLine++, newLine: newLine++ })
    }
  }

  if (currentHunk) hunks.push(currentHunk)

  if (!oldFile && !newFile && hunks.length === 0) return null
  return { oldFile, newFile, hunks }
}

// Stats calculation
function getDiffStats(hunks: DiffHunk[]) {
  let additions = 0
  let deletions = 0
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === "add") additions++
      if (line.type === "delete") deletions++
    }
  }
  return { additions, deletions }
}

// Main Component
export function ArtifactViewer({ filename, content, language, diffType = "normal", onClose }: ArtifactViewerProps) {
  const [copied, setCopied] = useState(false)
  const ext = getExtension(filename)
  const displayName = getDisplayName(filename)
  const lang = language || getLangFromExt(ext)
  const isDiff = useMemo(() => isDiffContent(content), [content])
  const parsedDiff = useMemo(() => isDiff ? parseDiff(content) : null, [content, isDiff])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  const stats = useMemo(() => 
    parsedDiff ? getDiffStats(parsedDiff.hunks) : { additions: 0, deletions: 0 },
    [parsedDiff]
  )

  // Diff view
  if (parsedDiff && parsedDiff.hunks.length > 0) {
    return (
      <div className="flex h-full flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-surface border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-textPrimary truncate" title={filename}>
                {displayName}
              </h2>
              <div className="flex items-center gap-2 text-[11px]">
                {stats.additions > 0 && (
                  <span className="text-emerald-400 font-medium">+{stats.additions}</span>
                )}
                {stats.deletions > 0 && (
                  <span className="text-red-400 font-medium">-{stats.deletions}</span>
                )}
                {ext && (
                  <span className="text-textMuted uppercase">{ext}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={handleCopy} 
              className="h-8 px-3 text-xs rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors text-textMuted flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button 
              onClick={onClose} 
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-auto font-mono text-[13px] leading-[1.5]">
          {parsedDiff.hunks.map((hunk, hunkIdx) => (
            <div key={hunkIdx} className="border-b border-border/20 last:border-0">
              {/* Hunk header */}
              <div className="sticky top-0 z-10 bg-primary/5 border-b border-primary/20 px-4 py-1.5 text-[11px] text-primary/70 font-semibold tracking-wide">
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </div>
              
              {/* Lines */}
              <div className="relative">
                {hunk.lines.map((line, lineIdx) => {
                  const tokens = tokenizeLine(line.content, lang)
                  
                  return (
                    <div
                      key={lineIdx}
                      className={clsx(
                        "flex group",
                        line.type === "add" && "bg-emerald-500/[0.07]",
                        line.type === "delete" && "bg-red-500/[0.07]",
                      )}
                    >
                      {/* Line numbers */}
                      <div className="flex shrink-0 select-none">
                        <span 
                          className={clsx(
                            "w-10 text-right px-2 py-0 border-r border-border/20 text-[11px]",
                            line.type === "delete" ? "text-red-400/50 bg-red-500/5" : "text-textMuted/30"
                          )}
                        >
                          {line.oldLine ?? ""}
                        </span>
                        <span 
                          className={clsx(
                            "w-10 text-right px-2 py-0 border-r border-border/20 text-[11px]",
                            line.type === "add" ? "text-emerald-400/50 bg-emerald-500/5" : "text-textMuted/30"
                          )}
                        >
                          {line.newLine ?? ""}
                        </span>
                      </div>
                      
                      {/* Diff marker */}
                      <span 
                        className={clsx(
                          "w-6 text-center shrink-0 select-none",
                          line.type === "add" && "text-emerald-400",
                          line.type === "delete" && "text-red-400",
                          line.type === "context" && "text-textMuted/20"
                        )}
                      >
                        {line.type === "add" ? "+" : line.type === "delete" ? "−" : " "}
                      </span>
                      
                      {/* Code content */}
                      <code className="flex-1 px-2 py-0 whitespace-pre-wrap break-all">
                        {tokens.map((tok, i) => (
                          <span key={i} style={{ color: TOKEN_COLORS[tok.type] }}>{tok.text}</span>
                        ))}
                        {line.content === "" && "\u00A0"}
                      </code>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Full file view (read/write)
  const lines = content.split("\n")
  const isCreated = diffType === "created"
  const isDeleted = diffType === "deleted"

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-surface border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className={clsx(
            "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
            isCreated ? "bg-emerald-500/10 border-emerald-500/20" : 
            isDeleted ? "bg-red-500/10 border-red-500/20" : 
            "bg-surface-hover border-border"
          )}>
            <FileCode className={clsx(
              "w-4 h-4",
              isCreated ? "text-emerald-400" : 
              isDeleted ? "text-red-400" : 
              "text-textMuted"
            )} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-textPrimary truncate" title={filename}>
              {displayName}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-textMuted">
              <span>{lines.length} lines</span>
              {ext && (
                <>
                  <span className="text-textMuted/30">·</span>
                  <span className="uppercase">{ext}</span>
                </>
              )}
              {isCreated && (
                <>
                  <span className="text-textMuted/30">·</span>
                  <span className="text-emerald-400 font-medium">new file</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={handleCopy} 
            className="h-8 px-3 text-xs rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors text-textMuted flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button 
            onClick={onClose} 
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto font-mono text-[13px] leading-[1.5]">
        {lines.map((line, i) => {
          const tokens = tokenizeLine(line, lang)
          
          return (
            <div
              key={i}
              className={clsx(
                "flex group hover:bg-surface-hover/30 transition-colors",
                isCreated && "border-l-2 border-l-emerald-500/30",
                isDeleted && "border-l-2 border-l-red-500/30"
              )}
            >
              {/* Line number */}
              <span 
                className="w-12 text-right px-3 py-0 border-r border-border/20 text-[11px] text-textMuted/30 select-none shrink-0 group-hover:text-textMuted/50 transition-colors"
              >
                {i + 1}
              </span>
              
              {/* Diff marker for created files */}
              {isCreated && (
                <span className="w-6 text-center text-emerald-400/50 select-none shrink-0">+</span>
              )}
              
              {/* Code content */}
              <code className="flex-1 px-3 py-0 whitespace-pre-wrap break-all">
                {tokens.map((tok, j) => (
                  <span key={j} style={{ color: TOKEN_COLORS[tok.type] }}>{tok.text}</span>
                ))}
                {line === "" && "\u00A0"}
              </code>
            </div>
          )
        })}
      </div>
    </div>
  )
}
