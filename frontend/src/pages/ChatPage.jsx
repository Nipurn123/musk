import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Settings,
  LogOut,
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash2,
  Sparkles,
  ChevronDown,
  Terminal as TerminalIcon,
} from 'lucide-react';
import Button from '../components/primitives/Button';
import Input from '../components/primitives/Input';
import Card from '../components/primitives/Card';
import { useAuthStore, useGlobalStore } from '../store';
import { mockSessions, mockMessages, mockTodos, mockAgents } from '../mock';
import MessageArea from '../components/MessageArea';

const ChatPage = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const {
    sessions,
    currentSessionId,
    setSessions,
    setCurrentSession,
    addSession,
    selectedAgent,
    setSelectedAgent,
    showTerminal,
    toggleTerminal,
    messages,
    setMessages,
    todos,
    setTodos,
  } = useGlobalStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const messageEndRef = useRef(null);

  // Initialize mock data
  useEffect(() => {
    setSessions(mockSessions);
    setCurrentSession('1');
    // Load messages for all sessions
    Object.keys(mockMessages).forEach((sessionId) => {
      setMessages(sessionId, mockMessages[sessionId]);
    });
    // Load todos
    Object.keys(mockTodos).forEach((sessionId) => {
      setTodos(sessionId, mockTodos[sessionId]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNewSession = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    };
    addSession(newSession);
    setCurrentSession(newSession.id);
  };

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const currentMessages = messages.get(currentSessionId) || [];
  const currentAgent = mockAgents.find((a) => a.id === selectedAgent);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col bg-surface">
        {/* Logo & New Chat */}
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gradient">100XPrompt</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            className="w-full"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleNewSession}
          >
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="p-4">
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {filteredSessions.map((session, index) => (
            <Card
              key={session.id}
              hover
              onClick={() => setCurrentSession(session.id)}
              className={`p-4 cursor-pointer transition-all animate-fade-in-up ${
                session.id === currentSessionId
                  ? 'border-l-4 border-l-primary bg-surfaceHover'
                  : ''
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                    <h3 className="font-medium text-textPrimary truncate">
                      {session.title}
                    </h3>
                  </div>
                  <p className="text-xs text-textMuted">
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                {session.id === currentSessionId && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom Controls */}
        <div className="p-4 border-t border-border space-y-2">
          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowAgentMenu(!showAgentMenu)}
              className="w-full p-3 rounded-lg bg-surfaceHover border border-border text-left flex items-center justify-between hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-textPrimary">
                    {currentAgent?.name}
                  </p>
                  <p className="text-xs text-textMuted">{currentAgent?.provider}</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-textMuted" />
            </button>

            {showAgentMenu && (
              <div className="absolute bottom-full mb-2 w-full glass-strong rounded-lg overflow-hidden shadow-xl">
                {mockAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgent(agent.id);
                      setShowAgentMenu(false);
                    }}
                    className={`w-full p-3 text-left hover:bg-surfaceHover transition-colors ${
                      agent.id === selectedAgent ? 'bg-primary/10' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-textPrimary">{agent.name}</p>
                    <p className="text-xs text-textMuted">{agent.provider}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="md"
            className="w-full justify-start"
            leftIcon={<TerminalIcon className="w-4 h-4" />}
            onClick={toggleTerminal}
          >
            Terminal
          </Button>

          <Button
            variant="ghost"
            size="md"
            className="w-full justify-start"
            leftIcon={<Settings className="w-4 h-4" />}
          >
            Settings
          </Button>

          <Button
            variant="ghost"
            size="md"
            className="w-full justify-start text-error hover:text-error"
            leftIcon={<LogOut className="w-4 h-4" />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with Tabs */}
        <div className="border-b border-border bg-surface/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-surface rounded-lg">
                {['chat', 'diffs', 'editor'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-textPrimary shadow-md'
                        : 'text-textMuted hover:text-textPrimary'
                    }`}
                  >
                    {tab}
                    {tab === 'diffs' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-primary/20 rounded-full">
                        0
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
              <span className="text-textMuted">Connected</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <MessageArea
          messages={currentMessages}
          sessionId={currentSessionId}
          ref={messageEndRef}
        />
      </div>

      {/* Terminal Panel */}
      {showTerminal && (
        <div className="fixed bottom-0 left-80 right-0 h-72 border-t border-border bg-surface animate-slide-in-right">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-textPrimary">Terminal</span>
            </div>
            <button
              onClick={toggleTerminal}
              className="text-textMuted hover:text-textPrimary"
            >
              ✕
            </button>
          </div>
          <div className="p-4 font-mono text-sm text-success">
            <div>$ Welcome to 100XPrompt Terminal</div>
            <div className="text-textMuted">Type 'help' for available commands</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-primary">$</span>
              <span className="animate-pulse">_</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;