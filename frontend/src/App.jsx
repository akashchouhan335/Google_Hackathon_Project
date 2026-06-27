import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './utils/api';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import NotificationToast from './components/NotificationToast';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import TaskManagement from './pages/TaskManagement';
import SchedulePage from './pages/SchedulePage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

function AppContent() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Trigger page changes based on login status
  useEffect(() => {
    if (user) {
      setCurrentPage('dashboard');
    } else {
      if (currentPage !== 'auth') {
        setCurrentPage('landing');
      }
    }
  }, [user]);

  // Load and poll notifications when user is logged in
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const list = await api.notifications.getAll();
      
      // Check if we have new unread rescue alerts to trigger a toast overlay!
      const unreadRescues = list.filter(n => !n.read && n.type === 'rescue_activated');
      const oldRescueIds = notifications.filter(n => n.type === 'rescue_activated').map(n => n.id);
      
      unreadRescues.forEach(notif => {
        if (!oldRescueIds.includes(notif.id)) {
          triggerToast('rescue', 'Rescue mode activated!', notif.message);
        }
      });

      setNotifications(list);
    } catch (err) {
      console.error('Failed to poll notifications:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    let interval = null;
    if (user) {
      interval = setInterval(fetchNotifications, 10000); // Poll notifications every 10s
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, notifications]);

  // Dynamic Toast trigger helper
  const triggerToast = (type, title, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Render current page component
  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage setCurrentPage={setCurrentPage} />;
      case 'auth':
        return <AuthPage setCurrentPage={setCurrentPage} />;
      case 'dashboard':
        return <Dashboard onTriggerToast={triggerToast} />;
      case 'tasks':
        return <TaskManagement onTriggerToast={triggerToast} />;
      case 'schedule':
        return <SchedulePage onTriggerToast={triggerToast} />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage onTriggerToast={triggerToast} />;
      default:
        return <LandingPage setCurrentPage={setCurrentPage} />;
    }
  };

  const showNavigation = user && currentPage !== 'landing' && currentPage !== 'auth';

  if (!showNavigation) {
    return (
      <div style={{ minHeight: '100vh' }}>
        {renderPage()}
        <NotificationToast toasts={toasts} setToasts={setToasts} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Panel Navigation */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
      />

      {/* Main Container Section */}
      <div className="main-content">
        <Navbar 
          setSidebarOpen={setSidebarOpen} 
          sidebarOpen={sidebarOpen} 
          notifications={notifications}
          setNotifications={setNotifications}
        />
        
        {renderPage()}
      </div>

      {/* Floated toast indicators */}
      <NotificationToast toasts={toasts} setToasts={setToasts} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
