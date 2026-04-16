import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Key, Sparkles, Zap, Shield, Code } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import Button from '../components/primitives/Button';
import Input from '../components/primitives/Input';
import Card from '../components/primitives/Card';
import { useAuthStore } from '../store';

const LoginPage = () => {
  const [serverUrl, setServerUrl] = useState('https://api.100xprompt.dev');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate connection
    setTimeout(() => {
      setAuth(apiKey, serverUrl);
      navigate('/chat');
    }, 1500);
  };

  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: 'AI-Powered',
      description: 'Advanced code generation with context awareness',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Lightning Fast',
      description: 'Real-time streaming responses',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure',
      description: 'Enterprise-grade security',
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: 'Multi-language',
      description: 'Support for 50+ languages',
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Marketing */}
          <div className="text-center lg:text-left space-y-8 animate-fade-in-up">
            <div className="inline-block">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gradient-animated">
                  100XPrompt
                </h1>
              </div>
            </div>

            <h2 className="text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-textPrimary">Your AI Coding</span>
              <br />
              <span className="text-gradient">Assistant</span>
            </h2>

            <p className="text-xl text-textSecondary max-w-lg">
              Supercharge your development workflow with intelligent code generation, 
              real-time collaboration, and powerful debugging tools.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  hover
                  className="p-4 animate-scale-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="text-primary mb-2">{feature.icon}</div>
                  <h3 className="font-semibold text-textPrimary mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-textMuted">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="animate-slide-in-right">
            <Card gradient className="p-8 max-w-md mx-auto">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-textPrimary mb-2">
                    Welcome Back
                  </h3>
                  <p className="text-textMuted">
                    Connect to your AI coding assistant
                  </p>
                </div>

                <form onSubmit={handleConnect} className="space-y-4">
                  <Input
                    label="Server URL"
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    leftIcon={<Server className="w-5 h-5" />}
                    placeholder="https://api.100xprompt.dev"
                    required
                  />

                  <Input
                    label="API Key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    leftIcon={<Key className="w-5 h-5" />}
                    placeholder="Enter your API key"
                    required
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full mt-6 relative overflow-hidden group"
                  >
                    <span className="relative z-10">
                      {loading ? 'Connecting...' : 'Connect to Assistant'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] opacity-0 group-hover:opacity-100 transition-opacity animate-shimmer" />
                  </Button>
                </form>

                <div className="flex items-center gap-2 text-sm text-textMuted pt-4">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
                  <span>All systems operational</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
