import React from 'react';
import { ShieldAlert, Hourglass, TrendingUp, ChevronRight, Check } from 'lucide-react';

export default function RescuePanel({ activeRescues, onResolveRescue }) {
  if (!activeRescues || activeRescues.length === 0) return null;

  // Let's focus on the most critical rescue (highest priority or risk)
  const currentRescue = activeRescues[0];
  const { task, requiredDailyHours, successProbability, recoveryStrategy, extraWorkSessions } = currentRescue;

  // SVG parameters for probability circular gauge
  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (successProbability / 100) * circumference;

  return (
    <div className="glass-card rescue-panel-danger" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="rescue-pulse-badge">
            <ShieldAlert size={14} /> Deadline Rescue Activated
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.75rem', color: 'var(--text-primary)' }}>
            "{task?.title}" is Endangered
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '650px', marginTop: '0.5rem' }}>
            The Risk Agent flagged this task as critically overdue relative to remaining hours. The Recovery Agent has designed an emergency sprint strategy.
          </p>
        </div>

        {/* Circular Probability Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '130px' }}>
          <div style={{ position: 'relative', width: '110px', height: '110px' }}>
            <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="55"
                cy="55"
                r={radius}
                fill="transparent"
                stroke="var(--bg-tertiary)"
                strokeWidth={strokeWidth}
              />
              <circle
                cx="55"
                cy="55"
                r={radius}
                fill="transparent"
                stroke="var(--danger)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {successProbability}%
              </span>
              <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                Survival
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rescue-metrics-row">
        <div className="rescue-metric-item">
          <Hourglass size={18} color="var(--danger)" style={{ marginBottom: '0.25rem' }} />
          <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{requiredDailyHours} hrs</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required Effort / Day</p>
        </div>

        <div className="rescue-metric-item">
          <ShieldAlert size={18} color="var(--danger)" style={{ marginBottom: '0.25rem' }} />
          <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{task?.priorityLevel}</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>Task Priority</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ width: '6px', height: '12px', background: 'var(--danger)', borderRadius: '2px' }}></span>
            Recovery Strategy
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(239, 68, 68, 0.2)' }}>
            {recoveryStrategy}
          </p>
          
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '1.25rem', marginBottom: '0.5rem' }}>
            Scheduled Catch-Up Blocks
          </h4>
          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {extraWorkSessions?.map((session, index) => (
              <li key={index}>{session}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ width: '6px', height: '12px', background: 'var(--danger)', borderRadius: '2px' }}></span>
            Action Steps Required Now
          </h4>
          <ul className="rescue-steps">
            {currentRescue.actionSteps?.map((step, idx) => (
              <li key={idx} className="rescue-step-item">
                <ChevronRight size={16} color="var(--danger)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>{step}</span>
              </li>
            )) || (
              <>
                <li className="rescue-step-item">
                  <ChevronRight size={16} color="var(--danger)" style={{ marginTop: '0.15rem' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Mute notifications and lock focus boundaries.</span>
                </li>
                <li className="rescue-step-item">
                  <ChevronRight size={16} color="var(--danger)" style={{ marginTop: '0.15rem' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Allocate next scheduled planner slot strictly to this task.</span>
                </li>
              </>
            )}
          </ul>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-danger"
              onClick={() => onResolveRescue(currentRescue.id, 'resolved_success')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Check size={16} /> Resolve & Complete Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
