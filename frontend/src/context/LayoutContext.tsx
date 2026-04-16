import React, { createContext, useContext, useState, useCallback, useMemo } from "react"

type SidebarTab = "chat" | "files" | "settings"
type PanelTab = "diff" | "terminal" | "todos"

interface LayoutContextValue {
  sidebar: {
    collapsed: boolean
    toggle: () => void
    setCollapsed: (collapsed: boolean) => void
    activeTab: SidebarTab
    setActiveTab: (tab: SidebarTab) => void
  }
  rightPanel: {
    visible: boolean
    toggle: () => void
    setVisible: (visible: boolean) => void
    activeTab: PanelTab
    setActiveTab: (tab: PanelTab) => void
    width: number
    setWidth: (width: number) => void
  }
  bottomPanel: {
    visible: boolean
    toggle: () => void
    setVisible: (visible: boolean) => void
    height: number
    setHeight: (height: number) => void
  }
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

interface LayoutProviderProps {
  children: React.ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chat")
  const [rightPanelVisible, setRightPanelVisible] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState<PanelTab>("diff")
  const [rightPanelWidth, setRightPanelWidth] = useState(400)
  const [bottomPanelVisible, setBottomPanelVisible] = useState(false)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200)

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  const toggleRightPanel = useCallback(() => {
    setRightPanelVisible((prev) => !prev)
  }, [])

  const toggleBottomPanel = useCallback(() => {
    setBottomPanelVisible((prev) => !prev)
  }, [])

  const value = useMemo<LayoutContextValue>(
    () => ({
      sidebar: {
        collapsed: sidebarCollapsed,
        toggle: toggleSidebar,
        setCollapsed: setSidebarCollapsed,
        activeTab: sidebarTab,
        setActiveTab: setSidebarTab,
      },
      rightPanel: {
        visible: rightPanelVisible,
        toggle: toggleRightPanel,
        setVisible: setRightPanelVisible,
        activeTab: rightPanelTab,
        setActiveTab: setRightPanelTab,
        width: rightPanelWidth,
        setWidth: setRightPanelWidth,
      },
      bottomPanel: {
        visible: bottomPanelVisible,
        toggle: toggleBottomPanel,
        setVisible: setBottomPanelVisible,
        height: bottomPanelHeight,
        setHeight: setBottomPanelHeight,
      },
    }),
    [
      sidebarCollapsed,
      toggleSidebar,
      sidebarTab,
      rightPanelVisible,
      toggleRightPanel,
      rightPanelTab,
      rightPanelWidth,
      bottomPanelVisible,
      toggleBottomPanel,
      bottomPanelHeight,
    ],
  )

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error("useLayout must be used within LayoutProvider")
  }
  return context
}
