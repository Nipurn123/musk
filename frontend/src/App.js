import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import { useAuthStore } from './store';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const apiKey = useAuthStore((state) => state.apiKey);
  const _hydrated = useAuthStore((state) => state._hydrated);

  if (!_hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  return apiKey ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
