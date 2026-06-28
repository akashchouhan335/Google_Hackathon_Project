import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useData } from '../context/DataContext';
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  Briefcase, 
  Coffee, 
  RefreshCw, 
  CheckCircle,
  Play
} from 'lucide-react';

export default function SchedulePage() {
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('19:00');
  const { todaySchedule: schedule, loading, setTodaySchedule, refreshData } = useData();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (schedule && schedule.isGenerating) {
      setGenerating(true);
    } else {
      setGenerating(false);
    }
  }, [schedule]);

  // Poll for schedule if it's currently generating
  useEffect(() => {
    let interval;
    if (generating) {
      interval = setInterval(async () => {
        try {
          const dateStr = new Date().toISOString().split('T')[0];
          const data = await api.schedule.get(dateStr);
          if (data && !data.isGenerating) {
            setTodaySchedule(data);
            setGenerating(false);
            refreshData(); // Refresh other stats
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000); // Check every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [generating, setTodaySchedule, refreshData]);

  const handleGenerate = async () => {
    try {
      setError(null);
      setGenerating(true);
      const dateStr = new Date().toISOString().split('T')[0];
      
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      let calculatedHours = (endH + endM / 60) - (startH + startM / 60);
      if (calculatedHours <= 0) calculatedHours += 24;
      
      const data = await api.schedule.generate(calculatedHours, dateStr, startTime);
      setTodaySchedule(data);
    } catch (err) {
      console.error('Generate error:', err);
      setError(err.message || 'Failed to start schedule generation.');
      setGenerating(false);
    }
  };

  const getIconForTask = (taskId) => {
    if (taskId === 'break') return <Coffee size={20} color="var(--success)" />;
    if (taskId === 'buffer') return <RefreshCw size={20} color="var(--warning)" />;
    return <Briefcase size={20} color="var(--primary-blue)" />;
  };

  const hasAllocation = schedule && schedule.allocation && schedule.allocation.length > 0;

  return (
    <div className="content-body">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>AI Schedule Generator</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Dynamically build your day based on task priority, deadlines, and AI insights.</p>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
        {/* Main Content Area */}
        {generating ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', borderTop: '4px solid var(--primary-purple)' }}>
            <Sparkles size={48} color="var(--primary-purple)" style={{ animation: 'pulse 1.5s infinite' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Agents at Work</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
              Analyzing task priorities, deadlines, and focus patterns to assemble the optimal day for you.
            </p>
            <style>{`
              @keyframes pulse {
                0% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(1); opacity: 0.8; }
              }
            `}</style>
          </div>
        ) : hasAllocation ? (
          <>
            {/* Top Compact Configuration/Regeneration Bar */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', padding: '1.25rem 2rem', borderLeft: '4px solid var(--primary-blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '320px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Start Time</span>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>End Time</span>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleGenerate} 
                disabled={generating}
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-gradient)', minWidth: '180px', justifyContent: 'center' }}
              >
                <Play size={16} fill="currentColor" /> Regenerate Plan
              </button>
            </div>

            {/* Centered Schedule Card */}
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <Calendar size={26} color="var(--primary-blue)" /> Today's Intelligent Timeline
              </h2>
              
              <div style={{ position: 'relative', paddingLeft: '2rem', margin: '0.5rem 0' }}>
                <div style={{ position: 'absolute', left: '9px', top: '12px', bottom: '12px', width: '3px', background: 'var(--primary-gradient)', opacity: 0.3, borderRadius: '3px' }}></div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {schedule.allocation.map((slot, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* Timeline Dot */}
                      <div style={{ 
                        position: 'absolute', 
                        left: '-2rem', 
                        top: '6px', 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        background: slot.taskId === 'break' ? 'var(--success)' : slot.taskId === 'buffer' ? 'var(--warning)' : 'var(--primary-blue)',
                        border: '4px solid var(--bg-primary)',
                        boxShadow: slot.taskId === 'break' ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : slot.taskId === 'buffer' ? '0 0 0 2px rgba(245, 158, 11, 0.2)' : '0 0 0 2px rgba(37, 99, 235, 0.2)',
                        transform: 'translateX(-50%)',
                        zIndex: 1
                      }}></div>
                      
                      {/* Content Card */}
                      <div style={{ 
                        background: 'var(--bg-secondary)', 
                        border: 'var(--card-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'default',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px) translateX(4px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        e.currentTarget.style.borderColor = 'var(--primary-blue)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) translateX(0)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '0.6rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {getIconForTask(slot.taskId)}
                            </div>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{slot.taskTitle}</h4>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '0.4rem 1rem', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
                            <Clock size={15} color="var(--text-secondary)" /> {slot.timeSlot}
                          </div>
                        </div>
                        
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, paddingLeft: '3.75rem' }}>
                          {slot.activity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Centered Schedule Configuration Card (No Schedule Yet) */
          <div className="glass-card" style={{ borderTop: '4px solid var(--primary-purple)', padding: '2.5rem', maxWidth: '600px', margin: '2rem auto', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <Sparkles size={32} color="var(--primary-purple)" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Schedule Configuration</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                Set your available working hours for today to generate an AI-optimized schedule.
              </p>
            </div>
            
            {error && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1.5rem' }}>
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '2.5rem', display: 'flex', gap: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, textAlign: 'left' }}>Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, textAlign: 'left' }}>End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem' }} />
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handleGenerate} 
              disabled={generating}
              style={{ width: '100%', padding: '1.1rem', fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', background: 'var(--primary-gradient)' }}
            >
              <Play size={18} fill="currentColor" /> Generate Optimized Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
