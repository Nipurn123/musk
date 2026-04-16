// Mock data for the application

export const mockSessions = [
  {
    id: '1',
    title: 'Build React Dashboard',
    createdAt: '2025-07-15T10:30:00Z',
    updatedAt: '2025-07-15T14:22:00Z',
    status: 'active',
  },
  {
    id: '2',
    title: 'Fix Authentication Bug',
    createdAt: '2025-07-14T09:15:00Z',
    updatedAt: '2025-07-14T11:45:00Z',
    status: 'completed',
  },
  {
    id: '3',
    title: 'API Integration',
    createdAt: '2025-07-13T16:20:00Z',
    updatedAt: '2025-07-13T18:00:00Z',
    status: 'completed',
  },
];

export const mockMessages = {
  '1': [
    {
      id: 'm1',
      role: 'user',
      content: 'Can you help me build a React dashboard with charts and tables?',
      timestamp: '2025-07-15T10:30:00Z',
    },
    {
      id: 'm2',
      role: 'assistant',
      content: "I'll help you build a React dashboard. Let me start by creating the component structure and setting up the necessary dependencies.",
      timestamp: '2025-07-15T10:31:00Z',
      parts: ['text', 'code'],
    },
    {
      id: 'm3',
      role: 'user',
      content: 'Great! Can you add a dark theme toggle?',
      timestamp: '2025-07-15T14:20:00Z',
    },
    {
      id: 'm4',
      role: 'assistant',
      content: "Absolutely! I'll add a theme toggle with smooth transitions between light and dark modes.",
      timestamp: '2025-07-15T14:22:00Z',
      isStreaming: true,
    },
  ],
  '2': [
    {
      id: 'm5',
      role: 'user',
      content: 'Users are getting logged out unexpectedly. Can you investigate?',
      timestamp: '2025-07-14T09:15:00Z',
    },
    {
      id: 'm6',
      role: 'assistant',
      content: 'Let me check the authentication flow and token management. I found the issue - the JWT tokens are expiring too quickly.',
      timestamp: '2025-07-14T09:20:00Z',
    },
  ],
  '3': [
    {
      id: 'm7',
      role: 'user',
      content: 'Integrate the Stripe payment API',
      timestamp: '2025-07-13T16:20:00Z',
    },
  ],
};

export const mockParts = {
  'm2': [
    {
      id: 'p1',
      type: 'text',
      content: "I'll help you build a React dashboard. Let me start by creating the component structure:",
    },
    {
      id: 'p2',
      type: 'code',
      language: 'javascript',
      filename: 'Dashboard.jsx',
      content: `import React from 'react';
import { Card } from './components/Card';
import { Chart } from './components/Chart';

function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="grid">
        <Card title="Revenue" value="$12,345" />
        <Card title="Users" value="1,234" />
        <Chart data={chartData} />
      </div>
    </div>
  );
}

export default Dashboard;`,
    },
  ],
};

export const mockTodos = {
  '1': [
    {
      id: 't1',
      title: 'Create Dashboard component',
      completed: true,
      createdAt: '2025-07-15T10:31:00Z',
    },
    {
      id: 't2',
      title: 'Add chart library integration',
      completed: true,
      createdAt: '2025-07-15T10:32:00Z',
    },
    {
      id: 't3',
      title: 'Implement dark theme toggle',
      completed: false,
      createdAt: '2025-07-15T14:22:00Z',
    },
  ],
};

export const mockDiffs = {
  '1': [
    {
      id: 'd1',
      filename: 'src/Dashboard.jsx',
      status: 'modified',
      additions: 45,
      deletions: 12,
      diff: `@@ -1,5 +1,10 @@
 import React from 'react';
+import { Card } from './components/Card';
+import { Chart } from './components/Chart';
 
 function Dashboard() {
-  return <div>Dashboard</div>;
+  return (
+    <div className="dashboard">
+      <h1>Dashboard</h1>
+    </div>
+  );
 }`,
    },
  ],
};

export const mockAgents = [
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
];