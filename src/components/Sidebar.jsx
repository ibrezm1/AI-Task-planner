import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  Sparkles, 
  CheckSquare, 
  Calendar, 
  Settings,
  Database,
  RefreshCw,
  X
} from 'lucide-react';

export default function Sidebar({ 
  currentView, 
  setView, 
  goalsCount, 
  pendingTasksCount,
  mongoConfig,
  onTriggerSync,
  syncStatus,
  isSyncing,
  mobileMenuOpen,
  setMobileMenuOpen,
  aiNotifyState
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'goals', name: 'Goals', icon: Target, badge: goalsCount > 0 ? goalsCount : null },
    { id: 'ai-consultant', name: 'AI Consultant', icon: Sparkles, badge: null },
    { id: 'tasks', name: 'Tasks Board', icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : null },
    { id: 'calendar', name: 'Calendar', icon: Calendar, badge: null },
    { id: 'settings', name: 'Settings', icon: Settings, badge: null }
  ];

  const hasDbConfig = mongoConfig && mongoConfig.connectionString && mongoConfig.db && mongoConfig.collection;

  const sidebarStyle = isMobile ? {
    width: '260px',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    overflowY: 'auto',
    zIndex: 100,
    borderRight: '1px solid var(--border-color)',
    borderRadius: 0,
    backgroundColor: 'var(--bg-app)',
    boxShadow: 'var(--card-shadow)',
    transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  } : {
    width: '260px',
    height: 'calc(100vh - 40px)',
    position: 'fixed',
    top: '20px',
    left: '20px',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    overflowY: 'auto',
    zIndex: 100,
    borderRight: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius)'
  };

  return (
    <>
      {/* Backdrop overlay for mobile menu */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className="glass-panel" style={sidebarStyle}>
        {/* Brand Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px',
          padding: '0 8px',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'var(--accent-color)',
              borderRadius: '10px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px var(--accent-glow)'
            }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-headings)' }}>
                Co-Pilot
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                AI Task Tracker
              </span>
            </div>
          </div>

          {/* Close button for Mobile */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Nav Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  if (isMobile) setMobileMenuOpen(false);
                }}
                className="btn"
                style={{
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '0.95rem',
                  backgroundColor: isActive ? 'var(--accent-color)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  boxShadow: isActive ? '0 4px 12px var(--accent-glow)' : 'none',
                  borderRadius: 'calc(var(--border-radius) * 0.5)'
                }}
              >
                <Icon size={18} style={{ opacity: isActive ? 1 : 0.8 }} />
                <span style={{ flex: 1, textAlign: 'left', fontWeight: isActive ? 600 : 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item.name}
                  {item.id === 'ai-consultant' && aiNotifyState === 'spinning' && (
                    <RefreshCw size={12} className="spinner" style={{ color: isActive ? '#fff' : 'var(--accent-color)' }} />
                  )}
                  {item.id === 'ai-consultant' && aiNotifyState === 'dot' && (
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isActive ? '#ffffff' : 'var(--accent-color)',
                      boxShadow: isActive ? 'none' : '0 0 8px var(--accent-glow)',
                      display: 'inline-block'
                    }} />
                  )}
                </span>
                {item.badge !== null && (
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--border-hover)',
                    color: isActive ? '#ffffff' : 'var(--accent-color)',
                    fontWeight: 700
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* DB Connection / Sync Info */}
        <div className="glass-panel" style={{
          marginTop: 'auto',
          padding: '12px',
          borderRadius: 'calc(var(--border-radius) * 0.75)',
          fontSize: '0.8rem',
          backgroundColor: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Database size={14} color={hasDbConfig ? 'var(--success-color)' : 'var(--text-muted)'} />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Cloud Sync</span>
            {hasDbConfig ? (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-color)',
                marginLeft: 'auto'
              }} />
            ) : (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--text-muted)',
                marginLeft: 'auto'
              }} />
            )}
          </div>
          
          {hasDbConfig ? (
            <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.75rem' }}>
                Connected to MongoDB
              </p>
              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={12} className={isSyncing ? 'spinner' : ''} />
                {isSyncing ? 'Syncing...' : 'Sync Data'}
              </button>
              {syncStatus && (
                <p style={{
                  color: syncStatus.includes('failed') ? 'var(--danger-color)' : 'var(--success-color)',
                  fontSize: '0.7rem',
                  marginTop: '6px',
                  textAlign: 'center',
                  wordBreak: 'break-word'
                }}>
                  {syncStatus}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '8px' }}>
                MongoDB sync is offline. Configure connection in Settings.
              </p>
              <button
                onClick={() => {
                  setView('settings');
                  if (isMobile) setMobileMenuOpen(false);
                }}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '0.75rem'
                }}
              >
                Setup Sync
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
