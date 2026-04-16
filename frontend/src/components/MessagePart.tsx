import React from "react"
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
} from "lucide-react"
import { BasicTool } from "./BasicTool"

interface MessagePartProps {
  part: any
}

const TOOL_ICONS: Record<string, any> = {
  bash: Terminal,
  read: FileText,
  write: FileCode,
  edit: Edit3,
  grep: Search,
  glob: FolderSearch,
  webfetch: Globe,
  websearch: Globe,
  task: Brain,
}

const TOOL_TITLES: Record<string, string> = {
  bash: "Shell",
  read: "Read File",
  write: "Write File",
  edit: "Edit File",
  multiedit: "Multi Edit",
  grep: "Search Content",
  glob: "Find Files",
  webfetch: "Web Fetch",
  websearch: "Web Search",
  task: "Subagent",
}

export function MessagePart({ part }: MessagePartProps) {
  if (part.type === "text") {
    if (!part.text) return null
    return (
      <div className="prose prose-invert prose-sm max-w-none prose-p:text-textPrimary prose-p:leading-relaxed prose-headings:text-textPrimary prose-strong:text-textPrimary prose-strong:font-semibold">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h3>,
            h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h4>,
            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1.5">{children}</ol>,
            li: ({ children }) => <li className="text-textPrimary leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic text-textSecondary">{children}</em>,
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "")
              const isInline = !match
              return isInline ? (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-surface/80 border border-border/50 text-primary text-[13px] font-mono"
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            },
            pre: ({ children }) => (
              <pre className="bg-surface/80 border border-border/50 rounded-xl p-4 overflow-x-auto mb-3 text-[13px] shadow-sm">
                {children}
              </pre>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-accent underline underline-offset-2 transition-colors"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary/40 pl-4 py-1 italic text-textSecondary my-3 bg-surface/30 rounded-r-lg">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="border-border/50 my-4" />,
            table: ({ children }) => (
              <div className="overflow-x-auto mb-3 rounded-xl border border-border/50">
                <table className="min-w-full">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-surface/50">{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr className="border-b border-border/30 last:border-0">{children}</tr>,
            th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-sm">{children}</th>,
            td: ({ children }) => <td className="px-4 py-2.5 text-textSecondary text-sm">{children}</td>,
          }}
        >
          {part.text}
        </ReactMarkdown>
      </div>
    )
  }

  if (part.type === "reasoning") {
    if (!part.text) return null
    return (
      <div className="relative mb-4 group/reasoning">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 rounded-xl opacity-50" />
        <div className="relative flex gap-3 py-3 px-4 bg-surface/60 border border-primary/20 rounded-xl text-sm text-textSecondary">
          <div className="relative shrink-0 mt-0.5">
            <div className="absolute inset-0 bg-primary/30 rounded-lg blur-sm" />
            <Brain className="relative w-4 h-4 text-primary" />
          </div>
          <div className="whitespace-pre-wrap leading-relaxed flex-1 font-mono text-[13px]">{part.text}</div>
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

    const subtitle =
      input.description ||
      input.filePath ||
      input.path ||
      input.pattern ||
      input.url ||
      input.command ||
      toolTitle ||
      ""

    const statusIcon =
      status === "completed" ? (
        <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
        </div>
      ) : status === "error" ? (
        <div className="w-5 h-5 rounded-full bg-error/20 flex items-center justify-center">
          <XCircle className="w-3.5 h-3.5 text-error" />
        </div>
      ) : status === "running" ? (
        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        </div>
      ) : null

    return (
      <BasicTool icon={Icon} title={title} subtitle={subtitle} defaultOpen={status === "error"}>
        {Object.keys(input).length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] uppercase font-bold text-textMuted mb-2 flex items-center gap-2 tracking-wider">
              Input
              {statusIcon}
            </div>
            <pre className="text-[13px] bg-surface/50 p-3 rounded-lg border border-border/50 overflow-x-auto font-mono">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
        )}
        {output && (
          <div>
            <div className="text-[10px] uppercase font-bold text-textMuted mb-2 tracking-wider">Output</div>
            <pre className="text-[13px] bg-surface/50 p-3 rounded-lg border border-border/50 overflow-x-auto max-h-64 font-mono">
              {typeof output === "string" ? output.slice(0, 5000) : JSON.stringify(output, null, 2)}
            </pre>
          </div>
        )}
        {state.error && (
          <div className="mt-3 p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{state.error}</span>
          </div>
        )}
      </BasicTool>
    )
  }

  if (part.type === "step-start") {
    return null
  }

  if (part.type === "step-finish") {
    return null
  }

  return null
}
