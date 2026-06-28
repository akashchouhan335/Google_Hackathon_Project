import { auth } from '../firebase';

// API Client Utility
const API_BASE = '/api';

async function getHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const resolvedHeaders = await getHeaders();
  const config = {
    ...options,
    headers: {
      ...resolvedHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }
    return data;
  } catch (error) {
    console.error(`API Error in ${endpoint}:`, error.message);
    throw error;
  }
}

export const api = {
  // Auth
  auth: {
    login: (credentials) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
    register: (userData) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    me: () => request('/auth/me'),
    updateSettings: (settings) => request('/auth/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  },

  // Tasks
  tasks: {
    getAll: () => request('/tasks'),
    getById: (id) => request(`/tasks/${id}`),
    create: (taskData) => request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    }),
    update: (id, taskData) => request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    }),
    delete: (id) => request(`/tasks/${id}`, {
      method: 'DELETE'
    })
  },

  // Schedule
  schedule: {
    get: (date) => request(`/schedule?date=${date || ''}`),
    generate: (availableHours, date, startTime) => request('/schedule/generate', {
      method: 'POST',
      body: JSON.stringify({ availableHours, date, startTime })
    })
  },

  // Rescue Mode
  rescue: {
    getActive: () => request('/rescue/active'),
    resolve: (id, status) => request(`/rescue/resolve/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status })
    })
  },

  // Focus Sprints
  focus: {
    getSprint: (taskId) => request('/focus/sprint', {
      method: 'POST',
      body: JSON.stringify({ taskId })
    }),
    startSession: (sessionData) => request('/focus/session', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    }),
    endSession: (id, status) => request(`/focus/session/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
  },

  // Notifications
  notifications: {
    getAll: () => request('/notifications'),
    markRead: (id) => request(`/notifications/${id}/read`, {
      method: 'PUT'
    }),
    clearRead: () => request('/notifications/clear-read', {
      method: 'DELETE'
    })
  },

  // Analytics & Coach
  analytics: {
    get: () => request('/analytics')
  },
  coach: {
    getInsights: () => request('/coach/insights')
  }
};
