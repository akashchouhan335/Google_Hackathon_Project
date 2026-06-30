import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { useData } from '../context/DataContext';
import RescuePanel from '../components/RescuePanel';
import CircularTimer from '../components/CircularTimer';
import CoachPanel from '../components/CoachPanel';
import { TrendChart } from '../components/SvgCharts';
import { 
  CheckCircle, 
  Hourglass, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  Zap,
  Sparkles,
  ClipboardList,
  XCircle
} from 'lucide-react';

export default function Dashboard({ onTriggerToast }) {
  const { tasks, activeRescues, coachInsights, analytics, todaySchedule, loading, refreshData } = useData();

  const handleResolveRescue = async (rescueId, status) => {
    try {
      await api.rescue.resolve(rescueId, status);
      onTriggerToast('success', 'Rescue mission resolved!', 'Task status updated to completed.');
      refreshData(true); // Reload analytics and layouts silently
    } catch (err) {
      onTriggerToast('error', 'Failed to resolve rescue', err.message);
    }
  };

  const handleTimerEvent = (type, title) => {
    onTriggerToast(type === 'success' ? 'success' : 'info', type === 'success' ? 'Sprint Complete!' : 'Focus Timer Notification', title);
    refreshData(true); // Refresh tasks and stats upon session logging silently
  };

  if (loading) {
    return (
      <div className="content-body" style={{ opacity: 0.7, pointerEvents: 'none' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div className="skeleton" style={{ width: '300px', height: '40px', borderRadius: '8px', marginBottom: '1rem' }}></div>
          <div className="skeleton" style={{ width: '400px', height: '20px', borderRadius: '4px' }}></div>
        </div>
        
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card stat-card" style={{ height: '120px' }}>
              <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '8px', marginBottom: '1rem' }}></div>
              <div className="skeleton" style={{ width: '100px', height: '16px', borderRadius: '4px', marginBottom: '0.5rem' }}></div>
              <div className="skeleton" style={{ width: '60px', height: '30px', borderRadius: '4px' }}></div>
            </div>
          ))}
        </div>
        
        <div className="dashboard-grid" style={{ marginTop: '2rem' }}>
          <div className="glass-card" style={{ height: '300px' }}>
             <div className="skeleton" style={{ width: '150px', height: '24px', borderRadius: '4px', marginBottom: '2rem' }}></div>
             <div className="skeleton" style={{ width: '200px', height: '200px', borderRadius: '50%', margin: '0 auto' }}></div>
          </div>
          <div className="glass-card" style={{ height: '300px' }}>
             <div className="skeleton" style={{ width: '150px', height: '24px', borderRadius: '4px', marginBottom: '2rem' }}></div>
             <div className="skeleton" style={{ width: '100%', height: '80px', borderRadius: '8px', marginBottom: '1rem' }}></div>
             <div className="skeleton" style={{ width: '100%', height: '80px', borderRadius: '8px' }}></div>
          </div>
        </div>
        <style>{`
          .skeleton {
            background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
          }
          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  const summary = analytics?.summary || {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    missedTasks: 0,
    highRiskTasks: 0,
    productivityScore: 70
  };

  const getDynamicGreeting = (score) => {
    if (score >= 90) return "Outstanding! You're operating at peak efficiency today.";
    if (score >= 70) return "Great work! You're maintaining solid momentum on your tasks.";
    if (score >= 50) return "Steady progress. Let's tackle those pending deadlines.";
    return "Action required. Let's focus on recovering some critical tasks today.";
  };

  return (
    <div className="content-body">
      {/* Welcome banner */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Productivity Console</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back! {getDynamicGreeting(summary.productivityScore)}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: 'var(--card-border)', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
          <Sparkles size={16} color="var(--primary-purple)" />
          <span>Active Agents: 6 Online</span>
        </div>
      </div>

      {/* Critical Rescue Panel at top */}
      {activeRescues.length > 0 && (
        <RescuePanel 
          activeRescues={activeRescues} 
          onResolveRescue={handleResolveRescue} 
        />
      )}

      {/* Analytics Tiles */}
      <div className="stats-grid">
        <div className="glass-card stat-card blue">
          <div className="stat-icon-box">
            <ClipboardList size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Active Tasks</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{summary.pendingTasks}</h3>
          </div>
        </div>

        <div className="glass-card stat-card green">
          <div className="stat-icon-box">
            <CheckCircle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Completed</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{summary.completedTasks}</h3>
          </div>
        </div>

        <div className="glass-card stat-card orange">
          <div className="stat-icon-box">
            <XCircle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Missed Tasks</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{summary.missedTasks}</h3>
          </div>
        </div>

        <div className="glass-card stat-card red">
          <div className="stat-icon-box">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Rescue Danger</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{activeRescues.length}</h3>
          </div>
        </div>

        <div className="glass-card stat-card purple">
          <div className="stat-icon-box">
            <TrendingUp size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Productivity</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{summary.productivityScore}%</h3>
          </div>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="dashboard-grid">
        {/* Left Column: Focus Sprint and Schedule */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <CircularTimer 
            tasks={tasks} 
            onSprintComplete={handleTimerEvent} 
          />
        </div>

        {/* Right Column: AI Coach and Completion trends */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <CoachPanel 
            coachInsights={coachInsights} 
            loading={false} 
          />

          {/* Mini line graph for completion trends */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Zap size={20} color="var(--primary-blue)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Task Completion Rate</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily volume of finished tasks over the past week.</p>
            <TrendChart 
              data={analytics?.charts?.completionTrend || []} 
              height={160} 
              color="var(--primary-blue)" 
              gradientId="blue-trend"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
