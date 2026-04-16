export type {
  Session,
  Message,
  Part,
  TextPart,
  ReasoningPart,
  FilePart,
  ToolPart,
  FileDiff,
  Todo,
  SessionStatus,
  PermissionRequest,
  QuestionRequest,
  Event,
  Provider,
  Agent,
  Pty,
} from "@/sdk/v2/gen/types.gen"

export type ToolStatePending = {
  status: "pending"
  input: Record<string, unknown>
  raw: string
}

export type ToolStateRunning = {
  status: "running"
  input: Record<string, unknown>
  title?: string
  metadata?: Record<string, unknown>
  time: {
    start: number
  }
}

export type ToolStateCompleted = {
  status: "completed"
  input: Record<string, unknown>
  output: string
  title: string
  metadata: Record<string, unknown>
  time: {
    start: number
    end: number
    compacted?: number
  }
  attachments?: {
    id: string
    sessionID: string
    messageID: string
    type: "file"
    mime: string
    filename?: string
    url: string
  }[]
}

export type ToolStateError = {
  status: "error"
  input: Record<string, unknown>
  error: string
  metadata?: Record<string, unknown>
  time: {
    start: number
    end: number
  }
}

export type ToolState = ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError

export type MCPServerConfig = {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
}

export type MCPConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export type MCPResource = {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export type MCPTool = {
  name: string
  description?: string
  inputSchema: {
    type: "object"
    properties?: Record<string, unknown>
    required?: string[]
  }
}

export type MCPServer = {
  name: string
  config: MCPServerConfig
  status: MCPConnectionStatus
  error?: string
  requiresAuth?: boolean
  hasCredentials?: boolean
  resources?: MCPResource[]
  tools?: MCPTool[]
}

export type MCPStatus = {
  servers: MCPServer[]
}
