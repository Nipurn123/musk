import React, { createContext, useContext, useState, useCallback, useMemo } from "react"

type SidebarTab = "sessions" | "search" | null
type PanelTab = "terminal" | "todos" | "artifact" | null

interface LayoutContextValue {
  sidebar: {
    collapsed: boolean
    toggle: () => void
    setCollapsed: (collapsed: boolean) => void
    activeTab: SidebarTab
    setActiveTab: (tab: SidebarTab) => void
  }
  rightPanel: {
    activeTab: PanelTab
    setActiveTab: (tab: PanelTab) => void
    width: number
    setWidth: (width: number) => void
  }
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

interface LayoutProviderProps {
  children: React.ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("sessions")
  const [rightPanelTab, setRightPanelTab] = useState<PanelTab>(null)
  const [rightPanelWidth, setRightPanelWidth] = useState(400)

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
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
        activeTab: rightPanelTab,
        setActiveTab: setRightPanelTab,
        width: rightPanelWidth,
        setWidth: setRightPanelWidth,
      },
    }),
    [
      sidebarCollapsed,
      toggleSidebar,
      sidebarTab,
      rightPanelTab,
      rightPanelWidth,
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
