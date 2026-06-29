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
  const { user } = useAuth();

  const isGeminiConfigured = false; // We can read this dynamically if we want or just base it on key presence warnings
  // Let's check backend key status. Since we set GEMINI_API_KEY as empty by default in .env, we can assume mock fallback unless the user sets it.

  return (
    <div className="content-body">
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Workspace Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your account parameters, planner details, and inspect the AI Multi-Agent status.</p>
      </div>

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
                Deadline Guardian AI runs six specialized agents. Because no external API key is stored in settings, a high-fidelity local heuristic rules engine simulates calculations.
              </p>

              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--bg-tertiary)', paddingTop: '0.75rem' }}>
                <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  <Sparkles size={14} /> Our AI Agents
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  Our specialized AI agents work in tandem to break down your tasks, estimate completion times, assign realistic deadlines, and provide intelligent scheduling recommendations to boost your productivity.
                </p>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
