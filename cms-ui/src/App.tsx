import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShowEpisodeList } from './components/ShowEpisodeList';
import { PublishDashboard } from './components/PublishDashboard';
import { Tv, ListFilter, Rocket, UserCheck } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppContent() {
  const [activeTab, setActiveTab] = useState<'content' | 'publish'>('content');
  const [role, setRole] = useState<'editor' | 'admin'>('editor');

  return (
    <div className="app-container">
      <header>
        <div className="logo-section">
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '0.6rem', borderRadius: '12px', display: 'flex' }}>
            <Tv size={24} color="white" />
          </div>
          <div>
            <h1>Peblo TV <span className="logo-badge">Internal CMS</span></h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Content Operations & Catalogue Publishing Pipeline</p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <ListFilter size={16} style={{ display: 'inline', marginRight: '0.4rem' }} />
            Content Catalogue
          </button>
          <button
            className={`tab-btn ${activeTab === 'publish' ? 'active' : ''}`}
            onClick={() => setActiveTab('publish')}
          >
            <Rocket size={16} style={{ display: 'inline', marginRight: '0.4rem' }} />
            Publish & Report
          </button>
        </nav>

        {/* Role Toggle for Testing RBAC */}
        <div className="role-toggle-bar">
          <UserCheck size={14} color="var(--text-muted)" />
          <span>Active Role:</span>
          <button
            className={`role-badge-btn ${role === 'editor' ? 'editor' : 'btn-secondary'}`}
            onClick={() => setRole('editor')}
          >
            Editor
          </button>
          <button
            className={`role-badge-btn ${role === 'admin' ? 'admin' : 'btn-secondary'}`}
            onClick={() => setRole('admin')}
          >
            Admin
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'content' && <ShowEpisodeList role={role} />}
        {activeTab === 'publish' && <PublishDashboard role={role} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
