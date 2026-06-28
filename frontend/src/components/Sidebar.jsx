import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  BarChart3, 
  Settings, 
  LogOut, 
  ShieldAlert, 
  User 
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Task Center', icon: CheckSquare },
    { id: 'schedule', label: 'AI Planner', icon: Calendar },
    { id: 'analytics', label: 'Productivity Labs', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (!user) return null;

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container" onClick={() => setCurrentPage('dashboard')} style={{ cursor: 'pointer' }}>
          <ShieldAlert className="logo-icon" size={28} style={{ stroke: 'url(#logo-grad)' }} />
          <span>Guardian AI</span>
        </div>
        
        {/* SVG Gradient definition for Lucide Icon */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <nav className="nav-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentPage(item.id);
                setSidebarOpen(false); // Close mobile drawer
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-widget">
          <div className="avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : <User size={20} />}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </p>
          </div>
        </div>
        
        <button className="nav-item" onClick={logout} style={{ marginTop: '0.5rem' }}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
