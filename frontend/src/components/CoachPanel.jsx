import React from 'react';
import { Sparkles, CheckCircle, Zap, ShieldCheck } from 'lucide-react';

export default function CoachPanel({ coachInsights, loading }) {
  if (loading) {
    return (
      <div className="glass-card coach-widget" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Coach Agent is compiling productivity diagnostics...</p>
      </div>
    );
  }

  // Fallback defaults
  const insights = coachInsights?.insights || [
    'Complete Focus Sprints to generate behavioral metrics.',
    'Your productivity velocity indicates steady work habits.',
    'Schedule a Focus Session for overdue items to receive deeper AI analysis.'
  ];

  const focusRecommendations = coachInsights?.focusRecommendations || [
    'Break large tasks into 25-minute Pomodoro sprints.',
    'Configure available work hours in Settings to optimize the Daily Planner.'
  ];

  const habitTips = coachInsights?.habitTips || [
    'Apply the 2-Minute Rule to clear micro-administrative blocks quickly.',
    'Audit task deadlines weekly on Sunday to proactively prevent Rescue triggers.'
  ];

  return (
    <div className="glass-card coach-widget">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Sparkles size={20} color="var(--primary-purple)" />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>AI Coach Advisory</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.5rem' }}>
            Behavior Observations
          </h4>
          <ul className="coach-insight-bullets">
            {insights.map((insight, index) => (
              <li key={index} className="coach-bullet-item">
                <CheckCircle size={16} color="var(--primary-purple)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{insight}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.5rem' }}>
            Focus Improvements
          </h4>
          <ul className="coach-insight-bullets">
            {focusRecommendations.map((rec, index) => (
              <li key={index} className="coach-bullet-item">
                <Zap size={16} color="var(--primary-blue)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.5rem' }}>
            Habits for Success
          </h4>
          <ul className="coach-insight-bullets">
            {habitTips.map((tip, index) => (
              <li key={index} className="coach-bullet-item">
                <ShieldCheck size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
