import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

export default function AuthPage({ setCurrentPage }) {
  const { login, register, error: authError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    const { name, email, password, confirmPassword } = formData;

    if (!email || !password) {
      setLocalError('Please fill in all credentials.');
      setLoading(false);
      return;
    }

    if (!isLogin && !name) {
      setLocalError('Please enter your full name.');
      setLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }
      setCurrentPage('dashboard');
    } catch (err) {
      // AuthContext sets error state which is read from useAuth()
      console.error('Authentication attempt failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = localError || authError;

  return (
    <div className="auth-page">
      <div className="auth-sidebar">
        <div>
          <div className="logo-container" style={{ color: 'white' }}>
            <ShieldAlert size={32} />
            <span style={{ color: 'white' }}>Guardian AI</span>
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '4rem', color: 'white', lineHeight: '1.2' }}>
            Take control of your schedules before they slip away.
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.85)', marginTop: '1rem', fontSize: '1.1rem' }}>
            Join professionals, students, and freelancers who rely on Guardian AI to rescue endangered projects and execute tasks with deep focus.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>
          <Sparkles size={16} /> 100% locally secure JSON Database
        </div>
      </div>

      <div className="auth-content">
        <div className="glass-card auth-form-card">
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            {isLogin ? 'Sign in to access your AI productivity coach.' : 'Register to protect your deadlines from missing milestones.'}
          </p>

          {errorMessage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  className="form-input" 
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                name="email" 
                className="form-input" 
                placeholder="e.g. john@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                name="password" 
                className="form-input" 
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>Confirm Password</label>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  className="form-input" 
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.9rem' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setLocalError('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontWeight: 600, cursor: 'pointer' }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
