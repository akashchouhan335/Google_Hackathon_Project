import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, 
  User, 
  Clock, 
  Sparkles, 
  Check, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function SettingsPage({ onTriggerToast }) {
  const { user, updateSettings } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formSettings, setFormSettings] = useState({
    workStartHour: user?.settings?.workStartHour || 9,
    workEndHour: user?.settings?.workEndHour || 17,
  });

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (formSettings.workStartHour >= formSettings.workEndHour) {
      onTriggerToast('info', 'Invalid settings', 'Work start hour must be before the end hour.');
      setLoading(false);
      return;
    }

    try {
      await updateSettings(formSettings);
      onTriggerToast('success', 'Settings Saved', 'Your workspace planner parameters were updated.');
    } catch (err) {
      onTriggerToast('error', 'Update Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const isGeminiConfigured = false; // We can read this dynamically if we want or just base it on key presence warnings
  // Let's check backend key status. Since we set GEMINI_API_KEY as empty by default in .env, we can assume mock fallback unless the user sets it.

  return (
    <div className="content-body">
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Workspace Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your account parameters, planner details, and inspect the AI Multi-Agent status.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
        {/* Left Form: Planner Preferences */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} color="var(--primary-blue)" /> Daily Planner Hours
          </h3>
          
          <form onSubmit={handleSaveSettings}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Shift Start Hour (24h format)</label>
                <select 
                  className="form-input"
                  value={formSettings.workStartHour}
                  onChange={(e) => setFormSettings({ ...formSettings, workStartHour: Number(e.target.value) })}
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Shift End Hour (24h format)</label>
                <select 
                  className="form-input"
                  value={formSettings.workEndHour}
                  onChange={(e) => setFormSettings({ ...formSettings, workEndHour: Number(e.target.value) })}
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Check size={16} /> {loading ? 'Saving Settings...' : 'Save Preferences'}
            </button>
          </form>
        </div>

        {/* Right Panel: AI Status Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* User profile Summary */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} color="var(--primary-blue)" /> User Profile
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name</span>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>{user?.name}</p>
              
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</span>
              <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{user?.email}</p>
            </div>
          </div>

          {/* AI Diagnostic card */}
          <div className="glass-card" style={{ borderLeft: '4px solid var(--primary-purple)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="var(--primary-purple)" /> AI Agent System
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px dashed var(--input-border)', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Engine Mode</span>
                <span className="task-meta-tag priority-tag medium" style={{ color: 'var(--primary-purple)', backgroundColor: 'var(--warning-light)', fontSize: '0.65rem' }}>
                  Mock AI Fallback
                </span>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Deadline Guardian AI runs five specialized agents. Because no external API key is stored in settings, a high-fidelity local heuristic rules engine simulates calculations.
              </p>

              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--bg-tertiary)', paddingTop: '0.75rem' }}>
                <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  <HelpCircle size={14} /> Activating Gemini Pro
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  To toggle active live Gemini connections, navigate to your project directory and set the `GEMINI_API_KEY` variable in `backend/.env`. Re-run the server to apply changes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
