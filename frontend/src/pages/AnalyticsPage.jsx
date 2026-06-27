import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { TrendChart, CircleGauge, DistributionBar } from '../components/SvgCharts';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Target, 
  Award,
  Zap,
  Bookmark
} from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.analytics.get();
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0' }}>Consulting Productivity Analyst...</div>;
  }

  const summary = data?.summary || {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    highRiskTasks: 0,
    productivityScore: 70,
    focusConsistency: 100,
    rescueSuccessRate: 100,
    deadlineCompletionRate: 100
  };

  const charts = data?.charts || {
    completionTrend: [],
    productivityTrend: [],
    riskDistribution: { low: 0, medium: 0, high: 0 }
  };

  return (
    <div className="content-body">
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Productivity Labs</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Review advanced analytics, focus sprint metrics, and rescue mission statistics.</p>
      </div>

      {/* SVG Score Circle Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <CircleGauge 
          score={summary.productivityScore}
          title="Overall Productivity"
          subtitle="Rolling Grade"
          color="var(--primary-gradient)"
        />
        
        <CircleGauge 
          score={summary.focusConsistency}
          title="Focus Consistency"
          subtitle="Sprint Finish Ratio"
          color="var(--primary-purple)"
        />

        <CircleGauge 
          score={summary.rescueSuccessRate}
          title="Rescue Success Rate"
          subtitle="Crisis Completed"
          color="var(--danger)"
        />

        <CircleGauge 
          score={summary.deadlineCompletionRate}
          title="On-Time Completion"
          subtitle="Before Deadline"
          color="var(--success)"
        />
      </div>

      {/* Trend Graphs and Risk Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Left: Productivity Score Trend Line Chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={20} color="var(--primary-blue)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Productivity Score Trend</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Historical daily score variations over the past week.</p>
          <TrendChart 
            data={charts.productivityTrend}
            height={200}
            color="var(--primary-purple)"
            gradientId="purple-trend"
          />
        </div>

        {/* Right: Risk distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <DistributionBar distribution={charts.riskDistribution} />

          {/* Quick Metrics list */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--primary-blue)" /> Desk Summary
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Desk Tasks</span>
                <span style={{ fontWeight: 700 }}>{summary.totalTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Completed Workloads</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{summary.completedTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pending Projects</span>
                <span style={{ fontWeight: 700, color: 'var(--primary-blue)' }}>{summary.pendingTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Critical Rescue Targets</span>
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{summary.highRiskTasks}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Trends Chart Row */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Zap size={20} color="var(--primary-blue)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Completion Velocity</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily completed task counters.</p>
        <TrendChart 
          data={charts.completionTrend}
          height={200}
          color="var(--primary-blue)"
          gradientId="blue-trend-lab"
        />
      </div>
    </div>
  );
}
