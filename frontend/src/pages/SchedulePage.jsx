import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  Sparkles, 
  Clock, 
  Calendar, 
  Compass, 
  Coffee, 
  AlertCircle, 
  TrendingUp, 
  FileText,
  CalendarDays
} from 'lucide-react';

export default function SchedulePage({ onTriggerToast }) {
  const [schedule, setSchedule] = useState(null);
  const [availableHours, setAvailableHours] = useState('6');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewTab, setViewTab] = useState('timeline'); // 'timeline' | 'planner'

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const data = await api.schedule.get();
      setSchedule(data);
      if (data.availableHours) {
        setAvailableHours(data.availableHours.toString());
      }
    } catch (err) {
      console.error('Failed to load schedule:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleGenerate = async () => {
    if (!availableHours || Number(availableHours) <= 0 || Number(availableHours) > 24) {
      onTriggerToast('info', 'Invalid hours input', 'Available hours must be between 1 and 24.');
      return;
    }

    setGenerating(true);
    try {
      const data = await api.schedule.generate(Number(availableHours));
      setSchedule(data);
      onTriggerToast('success', 'Schedule Generated', 'The Schedule Agent has optimized your day blocks.');
    } catch (err) {
      onTriggerToast('error', 'Generation Failed', err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="content-body">
      {/* Page Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Daily Planner</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure your daily availability and trigger the **Schedule Agent** to allocate tasks dynamically.</p>
      </div>

      {/* Configuration Header Card */}
      <div className="schedule-config-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1 }}>
          <Clock size={20} color="var(--primary-blue)" />
          <span style={{ fontWeight: 600 }}>Daily Work/Study Budget:</span>
          <input 
            type="number"
            className="form-input"
            min="1"
            max="20"
            value={availableHours}
            onChange={(e) => setAvailableHours(e.target.value)}
            style={{ width: '80px', padding: '0.4rem 0.5rem', margin: '0 0.5rem' }}
            disabled={generating}
          />
          <span style={{ color: 'var(--text-muted)' }}>hours</span>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Sparkles size={16} />
          {generating ? 'Re-Scheduling...' : 'AI Generate Schedule'}
        </button>
      </div>

      {/* Tabs Layout */}
      {schedule?.allocation && schedule.allocation.length > 0 && (
        <div className="schedule-layout-tabs">
          <button 
            className={`tab-btn ${viewTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewTab('timeline')}
          >
            Timeline View
          </button>
          <button 
            className={`tab-btn ${viewTab === 'planner' ? 'active' : ''}`}
            onClick={() => setViewTab('planner')}
          >
            Daily Planner Card
          </button>
        </div>
      )}

      {/* Content Render */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>Consulting Schedule Agent...</div>
      ) : schedule?.allocation && schedule.allocation.length > 0 ? (
        viewTab === 'timeline' ? (
          /* Timeline view: a vertical column of hours */
          <div className="timeline-container">
            {schedule.allocation.map((slot, index) => {
              const isBreak = slot.taskId === 'break';
              const isBuffer = slot.taskId === 'buffer';
              let colorTag = 'var(--text-muted)';
              let icon = <FileText size={18} />;

              if (isBreak) {
                colorTag = 'var(--success)';
                icon = <Coffee size={18} />;
              } else if (isBuffer) {
                colorTag = 'var(--warning)';
                icon = <Compass size={18} />;
              } else {
                colorTag = 'var(--primary-blue)';
              }

              return (
                <div key={index} className="timeline-row">
                  <span className="timeline-time-label">{slot.timeSlot}</span>
                  <div 
                    className={`timeline-block-card ${isBreak ? 'break' : isBuffer ? 'buffer' : 'task-allocated'}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ color: colorTag }}>
                        {icon}
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{slot.taskTitle}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{slot.activity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Daily Planner Card: list of items styled neatly */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {schedule.allocation.filter(s => s.taskId !== 'break' && s.taskId !== 'buffer').map((slot, idx) => (
              <div key={idx} className="glass-card" style={{ borderLeft: '4px solid var(--primary-purple)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-purple)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CalendarDays size={12} /> {slot.timeSlot}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{slot.taskTitle}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{slot.activity}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Empty schedule invitation */
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <AlertCircle size={48} color="var(--primary-blue)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Active Schedule Found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Input your available hours and generate an AI-allocated plan. The Schedule Agent will pull your pending, high-priority, and rescue-mode tasks.
          </p>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            <Sparkles size={16} /> Generate Schedule Now
          </button>
        </div>
      )}
    </div>
  );
}
