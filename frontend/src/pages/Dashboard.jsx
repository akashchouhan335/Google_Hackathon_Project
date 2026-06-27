import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
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
  ClipboardList
} from 'lucide-react';

export default function Dashboard({ onTriggerToast }) {
  const [tasks, setTasks] = useState([]);
  const [activeRescues, setActiveRescues] = useState([]);
  const [coachInsights, setCoachInsights] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch concurrent parameters
      const [
        tasksList, 
        rescues, 
        insights, 
        stats, 
        sched
      ] = await Promise.all([
        api.tasks.getAll(),
        api.rescue.getActive(),
        api.coach.getInsights(),
        api.analytics.get(),
        api.schedule.get(new Date().toISOString().split('T')[0])
      ]);

      setTasks(tasksList);
      setActiveRescues(rescues);
      setCoachInsights(insights);
      setAnalytics(stats);
      setTodaySchedule(sched);
    } catch (err) {
      console.error('Failed to load dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleResolveRescue = async (rescueId, status) => {
    try {
      await api.rescue.resolve(rescueId, status);
      onTriggerToast('success', 'Rescue mission resolved!', 'Task status updated to completed.');
      fetchDashboardData(); // Reload analytics and layouts
    } catch (err) {
      onTriggerToast('error', 'Failed to resolve rescue', err.message);
    }
  };

  const handleTimerEvent = (type, title) => {
    onTriggerToast(type === 'success' ? 'success' : 'info', type === 'success' ? 'Sprint Complete!' : 'Focus Timer Notification', title);
    fetchDashboardData(); // Refresh tasks and stats upon session logging
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ border: '4px solid var(--bg-tertiary)', borderTop: '4px solid var(--primary-blue)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Assembling Guardian AI Workspace...</p>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const summary = analytics?.summary || {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    highRiskTasks: 0,
    productivityScore: 70
  };

  return (
    <div className="content-body">
      {/* Welcome banner */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Productivity Console</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back! Your AI agents are actively protecting your pending deadlines.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: 'var(--card-border)', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
          <Sparkles size={16} color="var(--primary-purple)" />
          <span>Active Agents: 5 Online</span>
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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Total Tasks</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{summary.totalTasks}</h3>
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

          {/* Today's Schedule Overview */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} color="var(--primary-blue)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Today's Time Allocation</h3>
              </div>
            </div>

            {todaySchedule?.allocation && todaySchedule.allocation.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {todaySchedule.allocation.map((slot, index) => {
                  let borderClass = 'buffer';
                  if (slot.taskId === 'break') borderClass = 'break';
                  else if (slot.taskId !== 'buffer') borderClass = 'task-allocated';

                  return (
                    <div 
                      key={index} 
                      className={`timeline-block-card ${borderClass}`}
                      style={{ padding: '1rem', borderLeftWidth: '4px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {slot.timeSlot}
                        </span>
                        <span className={`task-meta-tag ${slot.taskId === 'break' ? 'low' : slot.taskId === 'buffer' ? 'medium' : 'high'}`} style={{ fontSize: '0.65rem' }}>
                          {slot.taskId === 'break' ? 'Break' : slot.taskId === 'buffer' ? 'Buffer' : 'Work'}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem' }}>{slot.taskTitle}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{slot.activity}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No active schedule generated for today. Navigate to the Daily Planner to allocate work hours.
              </div>
            )}
          </div>
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
