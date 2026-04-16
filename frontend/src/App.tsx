import { Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./store"
import LoginPage from "./pages/LoginPage"
import ChatPage from "./pages/ChatPage"
import { PermissionDialog } from "./components/PermissionDialog"
import { QuestionDialog } from "./components/QuestionDialog"
import { ServerProvider, GlobalSDKProvider, SDKProvider, LayoutProvider } from "./context"
import { AIAssistantButton } from "./components/ai-assistant/AIAssistantButton"
import { getDefaultDirectory } from "./lib/workspace"

function App() {
  const { apiKey, serverUrl, _hydrated } = useAuthStore()

  const isAuthenticated = apiKey && serverUrl

  if (!_hydrated) {
    return null
  }

  return (
    <LayoutProvider>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <ServerProvider defaultUrl={serverUrl || ""}>
                <GlobalSDKProvider>
                  <SDKProvider directory={getDefaultDirectory()}>
                    <>
                      <ChatPage />
                      <PermissionDialog />
                      <QuestionDialog />
                      <AIAssistantButton />
                    </>
                  </SDKProvider>
                </GlobalSDKProvider>
              </ServerProvider>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </LayoutProvider>
  )
}

export default App
