import { useState, useMemo, useCallback } from "react"
import { X, Copy, Check, Download } from "lucide-react"
import { clsx } from "clsx"

interface ArtifactViewerProps {
  filename: string
  content: string
  language?: string
  diffType?: "normal" | "created" | "modified"
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

// ─── Syntax highlighting token colors (Claude's palette) ───
// purple: keywords, green: strings, orange: functions/vars, cyan: numbers
// gray: comments, default: operators/text

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

// Simple line-by-line tokenizer — just enough for visual appeal
function tokenizeLine(line: string, lang: string): Token[] {
  const tokens: Token[] = []
  let remaining = line

  // Common patterns based on language
  const kwList = getKeywords(lang)
  const kwPattern = kwList.length > 0 ? new RegExp(`\\b(${kwList.join("|")})\\b`) : null

  while (remaining.length > 0) {
    let matched = false

    // Line comment
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

    // Multi-line comment start
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

    // Double-quoted string
    if (remaining[0] === '"') {
      const end = findStringEnd(remaining, '"')
      tokens.push({ type: "string", text: remaining.slice(0, end) })
      remaining = remaining.slice(end)
      continue
    }

    // Single-quoted string
    if (remaining[0] === "'") {
      const end = findStringEnd(remaining, "'")
      tokens.push({ type: "string", text: remaining.slice(0, end) })
      remaining = remaining.slice(end)
      continue
    }

    // Template literal
    if (remaining[0] === "`") {
      const end = findStringEnd(remaining, "`")
      tokens.push({ type: "string", text: remaining.slice(0, end) })
      remaining = remaining.slice(end)
      continue
    }

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

    // Type annotations (capitalized words after : or < or extends)
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

    // Operators & punctuation
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

    // Fallback: single char
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
    case "html": case "css": return ["html", "head", "body", "div", "span", "style", "script", "link", "meta"]
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

// ─── Diff parsing (for edit tool output) ───
interface DiffLine {
  type: "add" | "delete" | "context" | "header" | "meta"
  content: string
  lineNum?: number
}

function isDiffContent(content: string): boolean {
  const lines = content.split("\n").slice(0, 10)
  return lines.some(l => l.startsWith("---") || l.startsWith("+++") || l.startsWith("@@") || l.startsWith("<file_edited>") || l.startsWith("<diff>"))
}

function parseDiffLines(content: string): DiffLine[] {
  const lines = content.split("\n")
  const result: DiffLine[] = []
  let newLine = 0

  for (const line of lines) {
    if (line.startsWith("<file_edited>") || line.startsWith("</file_edited>") || line.startsWith("<diff>") || line.startsWith("</diff>")) {
      continue // skip xml wrappers
    }
    if (line.startsWith("Index:") || line.startsWith("====") || line.startsWith("---") || line.startsWith("+++")) {
      result.push({ type: "meta", content: line })
      continue
    }
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/)
      if (match) newLine = parseInt(match[1])
      result.push({ type: "header", content: line })
      continue
    }
    if (line.startsWith("+")) {
      result.push({ type: "add", content: line.slice(1), lineNum: newLine++ })
    } else if (line.startsWith("-")) {
      result.push({ type: "delete", content: line.slice(1) })
    } else if (line.startsWith(" ")) {
      result.push({ type: "context", content: line.slice(1), lineNum: newLine++ })
    } else {
      result.push({ type: "context", content: line, lineNum: newLine++ })
    }
  }
  return result
}


// ─── Main Component ───
export function ArtifactViewer({ filename, content, language, diffType = "normal", onClose }: ArtifactViewerProps) {
  const [copied, setCopied] = useState(false)
  const ext = getExtension(filename)
  const displayName = getDisplayName(filename)
  const lang = language || getLangFromExt(ext)
  const hasDiff = useMemo(() => isDiffContent(content), [content])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  // ─── Diff view ───
  if (hasDiff) {
    const diffLines = parseDiffLines(content)
    return (
      <div className="flex h-full flex-col relative bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-2 bg-surface gap-2 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2 flex-1 overflow-hidden pl-3">
            <h2 className="text-sm font-normal text-textSecondary truncate flex-1 min-w-0" title={filename}>
              {displayName}
              {ext && <><span className="text-textMuted/50"> · </span><span className="text-textMuted uppercase">{ext.toUpperCase()}</span></>}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="flex h-8 whitespace-nowrap">
              <button onClick={handleCopy} className="text-xs rounded-lg bg-surface h-full flex items-center justify-center px-2.5 border border-border hover:bg-surface-hover transition-colors text-textMuted">
                {copied ? <span className="flex items-center gap-1"><Check className="w-3 h-3 text-success" />Copied</span> : "Copy"}
              </button>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-md shrink-0 flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 min-h-0 bg-background overflow-auto">
          {diffLines.map((dl, i) => {
            // Hide meta lines (headers) for a cleaner view unless they contain actual info
            if (dl.type === "meta") {
              if (dl.content.startsWith("---") || dl.content.startsWith("+++") || dl.content.startsWith("Index:") || dl.content.startsWith("====")) {
                return null
              }
              return (
                <div key={i} className="flex border-l-[3px] border-l-transparent" style={{ minHeight: "1.375rem" }}>
                  <span className="flex items-start justify-end select-none pr-2 font-mono text-xs pl-1 text-textMuted/30 border-r border-border/20" style={{ lineHeight: "1.375rem", width: "3rem" }}></span>
                  <code className="flex-1 pl-2 pr-2 font-mono text-xs text-textMuted/50" style={{ lineHeight: "1.375rem" }}>{dl.content}</code>
                </div>
              )
            }
            if (dl.type === "header") {
              return (
                <div key={i} className="flex border-l-[3px] border-l-primary/40 bg-primary/5" style={{ minHeight: "1.375rem" }}>
                  <span className="flex items-start justify-end select-none pr-2 font-mono text-xs pl-1 text-textMuted/30 border-r border-border/20" style={{ lineHeight: "1.375rem", width: "3rem" }}></span>
                  <code className="flex-1 pl-2 pr-2 font-mono text-xs text-primary/70" style={{ lineHeight: "1.375rem" }}>{dl.content}</code>
                </div>
              )
            }

            const borderColor = dl.type === "add" ? "border-l-emerald-500" : dl.type === "delete" ? "border-l-red-500" : "border-l-transparent"
            const bgColor = dl.type === "add" ? "bg-emerald-500/8" : dl.type === "delete" ? "bg-red-500/8" : ""
            const textColor = dl.type === "add" ? "text-emerald-300" : dl.type === "delete" ? "text-red-300" : "text-textSecondary"
            const prefix = dl.type === "add" ? "+" : dl.type === "delete" ? "−" : " "
            const prefixColor = dl.type === "add" ? "text-emerald-400" : dl.type === "delete" ? "text-red-400" : "text-textMuted/20"

            return (
              <div key={i} className={clsx("flex border-l-[3px]", borderColor, bgColor)} style={{ minHeight: "1.375rem" }}>
                <span className="flex items-start justify-end select-none pr-2 font-mono text-xs pl-1 text-textMuted/30 border-r border-border/20" style={{ lineHeight: "1.375rem", width: "3rem" }}>
                  {dl.lineNum ?? ""}
                </span>
                <span className={clsx("font-mono text-xs select-none w-4 text-center shrink-0", prefixColor)} style={{ lineHeight: "1.375rem" }}>{prefix}</span>
                <code className={clsx("flex-1 font-mono text-xs pl-0 pr-2", textColor)} style={{ lineHeight: "1.375rem", whiteSpace: "pre-wrap" }}>{dl.content || "\u00a0"}</code>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Normal file view with syntax highlighting ───
  const lines = content.split("\n")
  const lineNumWidth = String(lines.length).length
  const isCreated = diffType === "created"

  return (
    <div className="flex h-full flex-col relative bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 bg-surface gap-2 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2 flex-1 overflow-hidden pl-3">
          <h2 className="text-sm font-normal text-textSecondary truncate flex-1 min-w-0" title={filename}>
            {displayName}
            {ext && <><span className="text-textMuted/50"> · </span><span className="text-textMuted uppercase">{ext.toUpperCase()}</span></>}
          </h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex h-8 whitespace-nowrap">
            <button onClick={handleCopy} className="text-xs rounded-lg bg-surface h-full flex items-center justify-center px-2.5 border border-border hover:bg-surface-hover transition-colors text-textMuted">
              {copied ? <span className="flex items-center gap-1"><Check className="w-3 h-3 text-success" />Copied</span> : "Copy"}
            </button>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md shrink-0 flex items-center justify-center hover:bg-surface-hover transition-colors text-textMuted hover:text-textSecondary" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Syntax-highlighted code */}
      <div className="flex-1 min-h-0 bg-background overflow-auto">
        {lines.map((line, i) => {
          const tokens = tokenizeLine(line, lang)
          const borderClass = isCreated ? "border-l-emerald-500" : "border-l-transparent"
          const bgClass = isCreated ? "bg-emerald-500/3" : ""

          return (
            <div key={i} className={clsx("flex border-l-[3px]", borderClass, bgClass)} style={{ minHeight: "1.375rem" }}>
              {/* Line number */}
              <span
                className="flex items-start justify-end select-none pr-2 font-mono text-xs pl-1 text-textMuted/30 border-r border-border/20"
                style={{ lineHeight: "1.375rem", width: `${Math.max(lineNumWidth + 1, 3)}ch` }}
              >
                {i + 1}
              </span>

              {/* Diff marker */}
              {isCreated && (
                <span className="font-mono text-xs select-none w-4 text-center shrink-0 text-emerald-400" style={{ lineHeight: "1.375rem" }}>+</span>
              )}

              {/* Code with tokens */}
              <div className="flex-1 pl-2 pr-2 min-w-0" style={{ minHeight: "1.375rem" }}>
                <code className="font-mono text-xs" style={{ lineHeight: "1.375rem", whiteSpace: "pre-wrap" }}>
                  {tokens.length === 0 ? "\u00a0" : tokens.map((tok, j) => (
                    <span key={j} style={{ color: TOKEN_COLORS[tok.type] }}>{tok.text}</span>
                  ))}
                </code>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
