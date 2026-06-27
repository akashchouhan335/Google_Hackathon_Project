import React from 'react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

export default function NotificationToast({ toasts, setToasts }) {
  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast-message ${toast.type === 'rescue' ? 'rescue' : ''}`}
        >
          {toast.type === 'rescue' ? (
            <AlertTriangle size={20} color="var(--danger)" />
          ) : toast.type === 'success' ? (
            <CheckCircle size={20} color="var(--success)" />
          ) : (
            <Info size={20} color="var(--primary-blue)" />
          )}
          
          <div style={{ flexGrow: 1 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {toast.title}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', lineHeight: '1.3' }}>
              {toast.message}
            </p>
          </div>

          <button 
            onClick={() => removeToast(toast.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
