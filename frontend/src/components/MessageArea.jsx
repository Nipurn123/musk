import React, { useState } from 'react';
import { Send, Square } from 'lucide-react';
import Button from './primitives/Button';
import Card from './primitives/Card';
import { useGlobalStore } from '../store';

const MessageArea = React.forwardRef(({ messages, sessionId }, ref) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { addMessage } = useGlobalStore();

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;

    // Add user message
    const userMessage = {
      id: `m${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    addMessage(sessionId, userMessage);
    setInput('');
    setIsProcessing(true);

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage = {
        id: `m${Date.now() + 1}`,
        role: 'assistant',
        content: "I'm processing your request. This is a mock response for demonstration purposes.",
        timestamp: new Date().toISOString(),
      };
      addMessage(sessionId, assistantMessage);
      setIsProcessing(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-8 max-w-2xl animate-fade-in-up">
              <div className="inline-block animate-float">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-3">
                  <span className="text-gradient-animated">Ready to Code?</span>
                </h2>
                <p className="text-textMuted text-lg">
                  Start a conversation with your AI assistant
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Build an API', desc: 'Create RESTful endpoints' },
                  { title: 'Debug Code', desc: 'Find and fix issues' },
                  { title: 'Refactor', desc: 'Improve code quality' },
                  { title: 'Add Tests', desc: 'Write unit tests' },
                ].map((action, index) => (
                  <Card
                    key={index}
                    hover
                    className="p-4 cursor-pointer animate-scale-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => setInput(action.title)}
                  >
                    <h3 className="font-semibold text-textPrimary mb-1">{action.title}</h3>
                    <p className="text-sm text-textMuted">{action.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`animate-fade-in-up ${
                  message.role === 'user' ? 'ml-auto' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-2xl">
                      <div className="glass-strong rounded-2xl px-6 py-4">
                        <p className="text-textPrimary whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      <p className="text-xs text-textMuted mt-2 text-right">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="glass-strong rounded-2xl px-6 py-4">
                        <p className="text-textPrimary whitespace-pre-wrap">
                          {message.content}
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
                          )}
                        </p>
                      </div>
                      <p className="text-xs text-textMuted mt-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={ref} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-strong rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3 text-xs text-textMuted">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Connected to {sessionId ? 'session' : 'assistant'}</span>
            </div>

            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 bg-surface rounded-lg px-4 py-3 text-textPrimary placeholder-textMuted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
                rows={3}
              />
              <div className="flex flex-col gap-2">
                {isProcessing ? (
                  <Button
                    variant="danger"
                    size="md"
                    className="h-full"
                    onClick={() => setIsProcessing(false)}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    className="h-full"
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MessageArea;