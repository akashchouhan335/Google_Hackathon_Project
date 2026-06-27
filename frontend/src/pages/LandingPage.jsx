import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowRight, Brain, Clock, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export default function LandingPage({ setCurrentPage }) {
  const { user } = useAuth();

  const handleStart = () => {
    if (user) {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('auth');
    }
  };

  return (
    <div className="landing-hero">
      <header className="landing-nav">
        <div className="logo-container">
          <ShieldAlert className="logo-icon" size={28} />
          <span>Guardian AI</span>
        </div>
        <div>
          <button className="btn btn-secondary" onClick={handleStart}>
            {user ? 'Go to Dashboard' : 'Sign In'}
          </button>
        </div>
      </header>

      <main className="landing-hero-section">
        <div className="hero-text">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-blue)', marginBottom: '1.5rem' }}>
            <Sparkles size={12} /> Powered by Gemini Multi-Agent System
          </div>
          <h1>Proactive AI Protection for Your Deadlines.</h1>
          <p>
            Traditional reminder apps only notify you when it's too late. Deadline Guardian AI actively helps you plan, schedule, and execute tasks before the countdown hits zero.
          </p>
          <div className="cta-group">
            <button className="btn btn-primary" onClick={handleStart}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <a href="#features" className="btn btn-secondary">Learn More</a>
          </div>
        </div>

        <div className="hero-image-container">
          <div className="hero-dashboard-mock">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '0.5rem' }}>
              <span className="rescue-pulse-badge" style={{ fontSize: '0.65rem' }}>
                <ShieldAlert size={10} /> Rescue Mission Active
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required Effort: 2.5h / Day</span>
            </div>
            
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.5rem 0' }}>Finish React Backend APIs</h4>
            <div className="task-progress-bar-bg">
              <div className="task-progress-bar-fill" style={{ width: '85%' }}></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
              <div style={{ padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: '8px', textAlign: 'center' }}>
                <h5 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Survival Chance</h5>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>92%</p>
              </div>
              <div style={{ padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: '8px', textAlign: 'center' }}>
                <h5 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deadline Risk</h5>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>High (84%)</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section id="features" style={{ backgroundColor: 'var(--bg-secondary)', borderTop: 'var(--card-border)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.25rem', marginBottom: '3rem' }}>
            Why simple Todo lists are failing you
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            <div className="glass-card" style={{ borderLeft: '4px solid var(--primary-blue)' }}>
              <Brain size={24} color="var(--primary-blue)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>AI Priority Engine</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Gemini automatically scores and explains task urgency based on your actual workload density and complex descriptions.
              </p>
            </div>

            <div className="glass-card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <ShieldAlert size={24} color="var(--danger)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Deadline Rescue Mode</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                When estimated task hours exceed the time remaining, the Recovery Agent activates Rescue Mode, mapping out emergency work slots.
              </p>
            </div>

            <div className="glass-card" style={{ borderLeft: '4px solid var(--primary-purple)' }}>
              <Zap size={24} color="var(--primary-purple)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>AI Focus Sprints</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Get structured, micro-goal focused deep-work blocks. Track your focus consistency and completion metrics automatically.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
