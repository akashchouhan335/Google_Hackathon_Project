import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { 
  Bell, 
  Sun, 
  Moon, 
  Menu, 
  Check, 
  Trash2,
  AlertTriangle,
  Award,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function Navbar({ setSidebarOpen, sidebarOpen, notifications, setNotifications }) {
  const { user, updateSettings } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const theme = user?.settings?.theme || 'light';

  useEffect(() => {
    // Click outside to close notification dropdown
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    updateSettings({ theme: nextTheme });
  };

  const markAsRead = async (id) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification read:', err.message);
    }
  };

  const clearRead = async () => {
    try {
      await api.notifications.clearRead();
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (err) {
      console.error('Error clearing read notifications:', err.message);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotifIcon = (type) => {
    switch (type) {
      case 'rescue_activated':
        return <AlertTriangle size={18} color="var(--danger)" />;
      case 'deadline_alert':
        return <Clock size={18} color="var(--warning)" />;
      case 'focus_reminder':
        return <CheckCircle2 size={18} color="var(--primary-blue)" />;
      default:
        return <Award size={18} color="var(--primary-purple)" />;
    }
  };

  return (
    <header className="navbar">
      <button className="icon-btn mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none' }}>
        <Menu size={20} />
      </button>

      <div className="navbar-left" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Deadline Guardian AI</h2>
      </div>

      <div className="navbar-right">
        {/* Theme Toggle */}
        <button className="icon-btn" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Notifications Dropdown trigger */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button className="icon-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>

          {dropdownOpen && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Smart Notifications</h3>
                {notifications.some(n => n.read) && (
                  <button 
                    onClick={clearRead}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <Trash2 size={12} /> Clear Read
                  </button>
                )}
              </div>
              
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No alerts or notifications yet.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`notif-item ${notif.read ? '' : 'unread'}`}
                      onClick={() => !notif.read && markAsRead(notif.id)}
                    >
                      <div style={{ marginTop: '0.15rem' }}>
                        {getNotifIcon(notif.type)}
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <p style={{ color: 'var(--text-primary)', marginBottom: '0.25rem', lineHeight: '1.3' }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {!notif.read && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                          }}
                          className="icon-btn"
                          style={{ width: '24px', height: '24px', alignSelf: 'center' }}
                          title="Mark read"
                        >
                          <Check size={14} color="var(--success)" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Adjust styles for mobile media check */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
