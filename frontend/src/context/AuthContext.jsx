import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profile = await api.auth.me();
      setUser(profile);
      applyTheme(profile.settings?.theme || 'light');
    } catch (err) {
      console.warn('Failed to load user profile on startup:', err.message);
      setUser(null);
      localStorage.removeItem('dg_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('dg_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      const response = await api.auth.login(credentials);
      localStorage.setItem('dg_token', response.token);
      setUser(response.user);
      applyTheme(response.user.settings?.theme || 'light');
      return response.user;
    } catch (err) {
      setError(err.message || 'Login failed.');
      throw err;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const response = await api.auth.register(userData);
      localStorage.setItem('dg_token', response.token);
      setUser(response.user);
      applyTheme(response.user.settings?.theme || 'light');
      return response.user;
    } catch (err) {
      setError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('dg_token');
    setUser(null);
  };

  const updateSettings = async (settings) => {
    try {
      const updatedUser = await api.auth.updateSettings(settings);
      setUser(updatedUser);
      applyTheme(updatedUser.settings?.theme || 'light');
      return updatedUser;
    } catch (err) {
      console.error('Failed to update settings:', err.message);
      throw err;
    }
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  const reloadUser = async () => {
    if (localStorage.getItem('dg_token')) {
      await fetchProfile();
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateSettings,
    reloadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
