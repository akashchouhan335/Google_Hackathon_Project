import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../utils/api';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

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
      console.warn('Failed to load user profile:', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchProfile();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    } catch (err) {
      setError(err.message || 'Login failed.');
      throw err;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      // Wait for auth state change to trigger profile fetch, but we also need to tell the backend to save the user's name
      await api.auth.register({ email: userData.email, name: userData.name });
      await fetchProfile();
    } catch (err) {
      setError(err.message || 'Registration failed.');
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
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
    if (auth.currentUser) {
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
      {loading ? (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderLeftColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ marginTop: '20px', fontSize: '1.5rem', fontWeight: 'bold' }}>Loading Deadline Guardian AI...</h2>
          <p style={{ marginTop: '10px', color: '#94a3b8', maxWidth: '400px', textAlign: 'center', lineHeight: '1.5' }}>Please wait a moment. If the server is waking up from sleep mode, this may take up to 50 seconds.</p>
        </div>
      ) : children}
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
