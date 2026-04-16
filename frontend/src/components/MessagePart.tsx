import React, { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import {
  Terminal,
  FileText,
  Edit3,
  Search,
  FolderSearch,
  Globe,
  Brain,
  FileCode,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Settings2,
  Download,
} from "lucide-react"
import { BasicTool } from "./BasicTool"
import { clsx } from "clsx"

interface MessagePartProps {
  part: any
}

const TOOL_ICONS: Record<string, any> = {
  bash: Terminal,
  read: FileText,
  write: FileCode,
  edit: Settings2,
  multiedit: Settings2,
  grep: Search,
  glob: FolderSearch,
  webfetch: Globe,
  websearch: Globe,
  task: Brain,
}

const TOOL_TITLES: Record<string, string> = {
  bash: "Terminal",
  read: "Read",
  write: "Created",
  edit: "Edited",
  multiedit: "Refactored",
  grep: "Search",
  glob: "Listing",
  webfetch: "Web fetch",
  websearch: "Web search",
  task: "Subagent",
}

// File tools that should open as artifacts in the right panel
const FILE_TOOLS = new Set(["read", "write", "edit", "multiedit"])

function getFileName(path: string) {
  if (!path) return ""
  const parts = path.split("/")
  return parts[parts.length - 1] || path
}

function getFileExt(path: string) {
  const name = getFileName(path)
  const parts = name.split(".")
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : ""
}

/**
 * Extract clean code from diff output.
 * Diff output looks like:
 *   <file_edited>path</file_edited>
 *   <diff>
 *   --- a/file
 *   +++ b/file
 *   @@ -N,M +N,M @@
 *    context line
 *   +added line
 *   -deleted line
 *   </diff>
 *
 * We reconstruct the resulting code by keeping context lines (space prefix)
 * and added lines (+ prefix), skipping deleted lines (- prefix) and metadata.
 */
/**
 * Extract clean code from diff output or read tool output.
 */
function cleanFileContent(raw: string, toolName: string): string {
  if (!raw) return ""

  // 1. Strip all XML-like wrappers and line numbers
  let cleaned = raw
    .replace(/<\/?file>/g, "")
    .replace(/<\/?file_edited>/g, "")
    .replace(/<\/?diff>/g, "")
    .replace(/<\/?file_contents>/g, "")
    .trim()

  const lines = cleaned.split("\n")
  const hasLineNumbers = lines.length > 0 && lines.some(line => /^\s*\d{5}\| /.test(line))
  
  if (hasLineNumbers) {
    cleaned = lines.map(line => line.replace(/^\s*\d{5}\| /, "")).join("\n")
  }

  return cleaned.trim()
}

function dispatchArtifactOpen(filename: string, content: string, isNew: boolean) {
  window.dispatchEvent(new CustomEvent("artifact:open", {
    detail: { filename, content, isNew }
  }))
}

/**
 * Clean markdown text by stripping tool-specific tags, line numbers,
 * and raw diff markers that shouldn't be visible in the chat bubble.
 */
function cleanMarkdownText(text: string): string {
  if (!text) return ""
  
  let cleaned = text

  // 1. Replace <file> blocks containing line numbers with clean markdown code blocks
  cleaned = cleaned.replace(/<file>([\s\S]*?)<\/file>/g, (_, content) => {
    const lines = content.trim().split("\n")
    const hasLineNumbers = lines.some(l => /^\s*\d{5}\| /.test(l))
    
    if (hasLineNumbers) {
      const cleanedContent = lines.map(l => l.replace(/^\s*\d{5}\| /, "")).join("\n")
      return "```\n" + cleanedContent + "\n```"
    }
    
    return "```\n" + content.trim() + "\n```"
  })

  // 2. Strip raw diff wrappers and markers if they are leaked into text
  cleaned = cleaned.replace(/<file_edited>[\s\S]*?<\/file_edited>/g, "")
  cleaned = cleaned.replace(/<diff>[\s\S]*?<\/diff>/g, "")
  cleaned = cleaned.replace(/<file_contents>[\s\S]*?<\/file_contents>/g, "")
  
  // Strip common diff headers
  cleaned = cleaned.replace(/^Index: .*$/gm, "")
  cleaned = cleaned.replace(/^={5,}$/gm, "")
  cleaned = cleaned.replace(/^--- .*$/gm, "")
  cleaned = cleaned.replace(/^\+\+\+ .*$/gm, "")
  cleaned = cleaned.replace(/^@@ .* @@$/gm, "")

  return cleaned.trim()
}

export function MessagePart({ part }: MessagePartProps) {
  if (part.type === "text") {
    if (!part.text) return null
    const cleanedText = cleanMarkdownText(part.text)
    return (
      <div className="prose prose-invert prose-sm max-w-none prose-p:text-textPrimary prose-p:leading-relaxed prose-headings:text-textPrimary prose-strong:text-textPrimary prose-strong:font-semibold">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 font-display">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 font-display">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0 font-display">{children}</h3>,
            h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0 font-display">{children}</h4>,
            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1.5">{children}</ol>,
            li: ({ children }) => <li className="text-textPrimary leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic text-textSecondary">{children}</em>,
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "")
              const isInline = !match
              return isInline ? (
                <code className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-primary text-[13px] font-mono" {...props}>
                  {children}
                </code>
              ) : (
                <code className={className} {...props}>{children}</code>
              )
            },
            pre: ({ children }) => (
              <pre className="bg-surface border border-border rounded-lg p-4 overflow-x-auto mb-3 text-[13px]">{children}</pre>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2 transition-colors">{children}</a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-primary/40 pl-4 py-1 text-textSecondary my-3">{children}</blockquote>
            ),
            hr: () => <hr className="border-border my-4" />,
            table: ({ children }) => (
              <div className="overflow-x-auto mb-3 rounded-lg border border-border"><table className="min-w-full">{children}</table></div>
            ),
            thead: ({ children }) => <thead className="bg-surface">{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
            th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-sm">{children}</th>,
            td: ({ children }) => <td className="px-4 py-2.5 text-textSecondary text-sm">{children}</td>,
          }}
        >
          {cleanedText}
        </ReactMarkdown>
      </div>
    )
  }

  if (part.type === "reasoning") {
    if (!part.text) return null
    return (
      <div className="mb-3">
        <div className="flex gap-2.5 py-2 px-1 text-sm text-textSecondary">
          <Brain className="w-[15px] h-[15px] text-textMuted shrink-0 mt-0.5" />
          <div className="whitespace-pre-wrap leading-relaxed flex-1 font-mono text-[13px] text-textMuted italic">{part.text}</div>
        </div>
      </div>
    )
  }

  if (part.type === "tool") {
    const toolName = part.tool || "unknown"
    const Icon = TOOL_ICONS[toolName] || Terminal
    const title = TOOL_TITLES[toolName] || toolName
    const state = part.state || {}
    const status = state.status || "pending"
    const input = state.input || {}
    const metadata = state.metadata || {}
    const output = state.output || metadata.output || ""
    const toolTitle = state.title || ""

    const filePath = input.filePath || input.path || ""
    const isFileTool = FILE_TOOLS.has(toolName)

    // Build subtitle
    const subtitle = filePath || input.command || input.pattern || input.url || input.description || toolTitle || ""
    const displayTitle = toolTitle || title
    const isBash = toolName === "bash"

    // For file tools: show a clickable artifact card instead of inline content
    if (isFileTool && filePath) {
      const fileName = getFileName(filePath)
      const fileExt = getFileExt(filePath)
      const rawContent = typeof output === "string" ? output : JSON.stringify(output, null, 2)
      const isNewFile = toolName === "write"
      // Clean content from tags, line numbers and diffs
      const fileContent = cleanFileContent(rawContent, toolName)

      return (
        <div className="mb-1.5 last:mb-0">
          {/* Tool row */}
          <div className="flex items-center gap-2.5 py-1 px-1">
            <div className="w-[15px] h-[15px] flex items-center justify-center">
              {status === "running" ? (
                <Loader2 className="w-[13px] h-[13px] text-primary animate-spin" />
              ) : (
                <Icon className="w-[14px] h-[14px] text-textMuted" />
              )}
            </div>
            <span className="text-[13.5px] text-textSecondary font-medium">{displayTitle}</span>
            {status === "completed" && (
              <CheckCircle2 className="w-[14px] h-[14px] text-success/70" strokeWidth={2.5} />
            )}
            {status === "running" && (
              <span className="text-[11px] text-primary/80 font-medium tracking-wide uppercase">Running</span>
            )}
          </div>

          {/* Artifact card — premium pill like Claude */}
          {fileContent && status === "completed" && (
            <div
              className="ml-[27px] mt-1.5 mb-2.5 inline-flex items-center gap-3 pl-3.5 pr-4 py-2 bg-surface/50 border border-border/40 rounded-[14px] cursor-pointer hover:border-primary/30 hover:bg-surface-hover/50 transition-all duration-200 group shadow-sm active:scale-[0.98]"
              onClick={() => dispatchArtifactOpen(filePath, fileContent, isNewFile)}
            >
              <div className="w-8 h-8 rounded-lg bg-surface-hover/80 flex items-center justify-center border border-border/30 group-hover:border-primary/20 transition-colors">
                <FileCode className="w-[18px] h-[18px] text-textSecondary group-hover:text-primary transition-colors" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] text-textPrimary font-semibold leading-none mb-1 group-hover:text-primary transition-colors">{fileName}</span>
                <span className="text-[10px] text-textMuted/70 font-mono tracking-wider uppercase leading-none">{fileExt || "FILE"}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {state.error && (
            <div className="ml-[27px] mt-1 p-3 bg-error/10 rounded-lg text-sm text-error flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}
        </div>
      )
    }

    // For bash tools: show command + output
    return (
      <BasicTool
        icon={Icon}
        title={displayTitle}
        subtitle={subtitle !== displayTitle ? subtitle : undefined}
        defaultOpen={status === "error"}
        status={status}
      >
        {isBash && input.command && (
          <div className="mb-3 mt-1.5">
            <div className="bg-[#0f1115] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="flex items-center px-3 py-1.5 bg-white/5 border-b border-white/5 gap-2">
                <Terminal className="w-3 h-3 text-textMuted" />
                <span className="text-[11px] font-mono text-textMuted uppercase tracking-wider">Terminal</span>
              </div>
              <div className="p-3 overflow-x-auto">
                <pre className="text-[13px] font-mono text-emerald-400/90 whitespace-pre-wrap leading-relaxed">
                  <span className="text-emerald-500/50 mr-2 select-none">$</span>
                  {input.command}
                </pre>
              </div>
            </div>
          </div>
        )}

        {!isBash && !isFileTool && Object.keys(input).length > 0 && (
          <div className="mb-3 mt-1">
            <pre className="text-[12px] bg-surface-hover/30 border border-border/30 rounded-xl p-3 overflow-x-auto font-mono text-textSecondary whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
        )}

        {output && (
          <div className="mt-2 mb-1">
            <div className="flex items-center gap-2 mb-1.5 px-0.5">
              <div className="h-px flex-1 bg-border/20" />
              <span className="text-[10px] font-bold text-textMuted/40 uppercase tracking-widest">Output</span>
              <div className="h-px flex-1 bg-border/20" />
            </div>
            <div className="bg-surface/40 rounded-xl border border-border/20 p-3 overflow-x-auto max-h-80 shadow-inner">
              <pre className="text-[12.5px] font-mono text-textSecondary whitespace-pre-wrap leading-relaxed">
                {typeof output === "string" ? output.slice(0, 5000) : JSON.stringify(output, null, 2)}
                {typeof output === "string" && output.length > 5000 && (
                  <span className="text-textMuted italic block mt-2 border-t border-border/10 pt-2">... content truncated</span>
                )}
              </pre>
            </div>
          </div>
        )}

        {state.error && (
          <div className="mt-2 p-3 bg-error/10 rounded-lg text-sm text-error flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{state.error}</span>
          </div>
        )}
      </BasicTool>
    )
  }

  if (part.type === "step-start" || part.type === "step-finish") return null
  return null
}
