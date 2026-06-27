const uuid = require('uuid');

const generateUser = (overrides = {}) => ({
  id: overrides.id || uuid.v4(),
  email: 'seeded@example.com',
  name: 'Seeded User',
  passwordHash: 'hashed_password_mock',
  settings: {
    workStartHour: 9,
    workEndHour: 17,
    theme: 'dark'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

const generateTask = (userId, overrides = {}) => ({
  id: overrides.id || uuid.v4(),
  userId,
  title: 'Seeded Task',
  description: 'Seeded Description',
  deadline: new Date(Date.now() + 86400000).toISOString(),
  estimatedHours: 5,
  priorityLevel: 'high',
  status: 'pending',
  priorityScore: 80,
  priorityExplanation: 'High priority seeded task.',
  riskScore: 20,
  riskLevel: 'Low',
  riskExplanation: 'Plenty of time.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

const generateRescueMode = (userId, taskId, overrides = {}) => ({
  id: overrides.id || uuid.v4(),
  userId,
  taskId,
  status: 'active',
  requiredDailyHours: 3.5,
  successProbability: 45,
  recoveryStrategy: 'Seeded strategy',
  extraWorkSessions: ['Seeded extra session'],
  activatedAt: new Date().toISOString(),
  ...overrides
});

const generateFocusSession = (userId, taskId, overrides = {}) => ({
  id: overrides.id || uuid.v4(),
  userId,
  taskId,
  status: 'completed',
  durationMinutes: 25,
  startedAt: new Date(Date.now() - 30 * 60000).toISOString(),
  completedAt: new Date().toISOString(),
  ...overrides
});

module.exports = {
  generateUser,
  generateTask,
  generateRescueMode,
  generateFocusSession
};
