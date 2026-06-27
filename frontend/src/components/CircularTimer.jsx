import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { Play, Pause, RotateCcw, Target, Sparkles, Check, AlertOctagon } from 'lucide-react';

export default function CircularTimer({ tasks, onSprintComplete }) {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [sprintConfig, setSprintConfig] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  
  const [loadingConfig, setLoadingConfig] = useState(false);
  const timerRef = useRef(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-select highest priority pending task if none selected or current is completed
  useEffect(() => {
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    if (pendingTasks.length > 0) {
      const isSelectedPending = selectedTaskId && pendingTasks.some(t => t.id === selectedTaskId);
      if (!isSelectedPending) {
        const sortedPending = [...pendingTasks].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
        if (sortedPending.length > 0) {
          setSelectedTaskId(sortedPending[0].id);
        }
      }
    } else {
      setSelectedTaskId('');
    }
  }, [tasks, selectedTaskId]);

  // Update timeLeft when sprintConfig changes
  useEffect(() => {
    if (sprintConfig) {
      const mins = isBreak ? sprintConfig.breakDuration : sprintConfig.duration;
      setTimeLeft(mins * 60);
      setTotalDuration(mins * 60);
      setIsRunning(false);
    }
  }, [sprintConfig, isBreak]);

  // Load AI sprint recommendation
  const handleGenerateSprint = async () => {
    if (!selectedTaskId) return;
    setLoadingConfig(true);
    try {
      const data = await api.focus.getSprint(selectedTaskId);
      setSprintConfig(data);
      setIsBreak(false);
    } catch (err) {
      console.error('Error generating sprint:', err.message);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Timer Tick Core Logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const handleStartSession = async () => {
    if (!sprintConfig) return;
    
    setIsRunning(true);
    
    // Only register session in DB if it's the Work interval (not breaks)
    if (!isBreak && !activeSession) {
      try {
        const session = await api.focus.startSession({
          taskId: sprintConfig.taskId,
          goal: sprintConfig.goal,
          duration: sprintConfig.duration,
          breakDuration: sprintConfig.breakDuration
        });
        setActiveSession(session);
      } catch (err) {
        console.error('Failed to log focus session startup:', err.message);
      }
    }
  };

  const handlePauseSession = () => {
    setIsRunning(false);
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);
    
    if (!isBreak && activeSession) {
      try {
        await api.focus.endSession(activeSession.id, 'completed');
        setActiveSession(null);
        if (onSprintComplete) onSprintComplete('success', `Completed sprint for task: ${sprintConfig.taskTitle}!`);
      } catch (err) {
        console.error('Failed to log focus completion:', err.message);
      }
      // Trigger break interval
      setIsBreak(true);
    } else {
      // Break is complete, return to work state
      setIsBreak(false);
      if (onSprintComplete) onSprintComplete('info', 'Break finished! Time to focus.');
      setSprintConfig(null);
      setActiveSession(null);
    }
  };

  const handleAbandonSession = async () => {
    setIsRunning(false);
    
    if (!isBreak && activeSession) {
      try {
        await api.focus.endSession(activeSession.id, 'abandoned');
        if (onSprintComplete) onSprintComplete('info', 'Focus Sprint abandoned. Keep trying!');
      } catch (err) {
        console.error('Failed to log abandoned session:', err.message);
      }
    }

    // Reset
    setActiveSession(null);
    setSprintConfig(null);
    setIsBreak(false);
    setTimeLeft(25 * 60);
    setTotalDuration(25 * 60);
  };

  // SVG calculations for Circular Progress ring
  const strokeRadius = 75;
  const strokeCircumference = 2 * Math.PI * strokeRadius;
  const progressRatio = timeLeft / totalDuration;
  const strokeDashoffset = strokeCircumference - progressRatio * strokeCircumference;

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  return (
    <div className="glass-card focus-widget-card" style={{ marginBottom: '2rem' }}>
      <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Target size={20} color="var(--primary-blue)" />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Focus Sprint Engine</h3>
      </div>

      {!sprintConfig ? (
        // Task Selection State
        <div style={{ width: '100%', textAlign: 'left' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Select an active task and let AI configure a customized deep-work sprint.
          </p>
          
          <div className="form-group">
            <select 
              className="form-input"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">-- Choose Task --</option>
              {pendingTasks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-primary"
            onClick={handleGenerateSprint}
            disabled={!selectedTaskId || loadingConfig}
            style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles size={16} />
            {loadingConfig ? 'Generating Sprint...' : 'Assemble AI Focus Sprint'}
          </button>
        </div>
      ) : (
        // Active Timer State
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="task-meta-tag priority-tag medium" style={{ marginBottom: '0.5rem', alignSelf: 'center', color: isBreak ? 'var(--primary-purple)' : '', backgroundColor: isBreak ? 'var(--warning-light)' : '' }}>
            {isBreak ? '☕ REST BREAK ACTIVE' : '⚡ DEEP WORK SPRINT'}
          </span>
          
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sprintConfig.taskTitle}
          </h4>

          {/* Time Dial */}
          <div className="timer-circle-container">
            <svg className="timer-svg">
              <circle
                className="timer-bg"
                cx="90"
                cy="90"
                r={strokeRadius}
              />
              <circle
                className={`timer-progress ${isBreak ? 'break-mode' : ''}`}
                cx="90"
                cy="90"
                r={strokeRadius}
                strokeDasharray={strokeCircumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="timer-text-overlay">
              <span className="timer-time">{formatTime(timeLeft)}</span>
              <p className="timer-mode-label">{isBreak ? 'Recharge' : 'Deep focus'}</p>
            </div>
          </div>

          {/* Goal Insight Box */}
          <div style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--input-border)', marginBottom: '1.25rem', textAlign: 'left', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary-blue)', display: 'block', marginBottom: '0.15rem' }}>AI Sprint Goal:</span>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{sprintConfig.goal}</p>
          </div>

          {/* Controls */}
          <div className="timer-controls">
            {!isRunning ? (
              <button className="btn btn-primary" onClick={handleStartSession} style={{ padding: '0.5rem 1.25rem' }}>
                <Play size={16} /> Start
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={handlePauseSession} style={{ padding: '0.5rem 1.25rem' }}>
                <Pause size={16} /> Pause
              </button>
            )}

            <button className="btn btn-secondary" onClick={handleAbandonSession} style={{ padding: '0.5rem 1.25rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <AlertOctagon size={16} /> Abandon
            </button>
            
            {/* Cheat button for development testing to instantly complete */}
            {process.env.NODE_ENV !== 'production' && (
              <button 
                className="btn btn-secondary" 
                onClick={handleTimerComplete} 
                title="Instant finish"
                style={{ padding: '0.5rem 0.5rem', width: '36px', height: '36px', borderRadius: '50%' }}
              >
                <Check size={16} color="var(--success)" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
