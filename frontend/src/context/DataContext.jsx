import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [data, setData] = useState({
    tasks: [],
    activeRescues: [],
    analytics: null,
    todaySchedule: null,
    coachInsights: null,
    loading: true,
    error: null
  });

  const refreshData = async (silent = false) => {
    if (!user) return;
    
    try {
      if (!silent) {
        setData(prev => ({ ...prev, loading: true, error: null }));
      }
      
      const [tasksList, rescues, stats, sched] = await Promise.all([
        api.tasks.getAll().catch(() => []),
        api.rescue.getActive().catch(() => []),
        api.analytics.get().catch(() => null),
        api.schedule.get(new Date().toISOString().split('T')[0]).catch(() => null)
      ]);

      setData(prev => ({
        ...prev,
        tasks: tasksList,
        activeRescues: rescues,
        analytics: stats,
        todaySchedule: sched,
        loading: false,
        error: null
      }));

      // Background fetch for AI Coach Insights
      api.coach.getInsights()
        .then(insights => {
          setData(prev => ({ ...prev, coachInsights: insights }));
        })
        .catch(err => console.error('Failed to load Coach Insights in background:', err.message));

    } catch (err) {
      console.error('Failed to load primary user data:', err.message);
      setData(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      // Clear data when logged out
      setData({
        tasks: [],
        activeRescues: [],
        analytics: null,
        todaySchedule: null,
        coachInsights: null,
        loading: true,
        error: null
      });
    }
  }, [user]);

  // Context value exposes data fields and refreshData function directly
  const contextValue = {
    ...data,
    refreshData,
    // Add mutators for specific data if necessary to avoid full reload,
    // but a full reload is safer for keeping all tiles perfectly in sync.
    setTasks: (tasksUpdater) => setData(prev => ({ 
      ...prev, 
      tasks: typeof tasksUpdater === 'function' ? tasksUpdater(prev.tasks) : tasksUpdater 
    })),
    setTodaySchedule: (schedUpdater) => setData(prev => ({ 
      ...prev, 
      todaySchedule: typeof schedUpdater === 'function' ? schedUpdater(prev.todaySchedule) : schedUpdater 
    }))
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};
