import "react"

declare module "lucide-react" {
  export * from "lucide-react"
}

declare module "@uiw/react-codemirror" {
  import * as React from "react"
  
  interface ReactCodeMirrorProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string
    height?: string | number
    minHeight?: string | number
    maxHeight?: string | number
    extensions?: unknown[]
    theme?: string
    onChange?: (value: string, viewUpdate: unknown) => void
    editable?: boolean
    readOnly?: boolean
    autoFocus?: boolean
    placeholder?: string
    basicSetup?: boolean | object
    indentWithTab?: boolean
    tabSize?: number
    defaultLanguage?: string
    language?: string
  }
  
  interface ReactCodeMirrorRef {
    editor?: unknown
    state?: unknown
    view?: unknown
  }
  
  export const CodeMirror: React.ForwardRefExoticComponent<
    ReactCodeMirrorProps & React.RefAttributes<ReactCodeMirrorRef>
  >
  export default CodeMirror
}

declare module "react-router-dom" {
  export * from "react-router-dom"
}

declare module "react" {
  interface ReactPortal {
    key: Key | null
    children?: ReactNode
    containerInfo?: any
    implementation?: any
  }
}
