const request = require('supertest');
const { app, createTestUser, loginAndGetToken } = require('./utils');
const db = require('../db/jsonDb');

describe('Analytics Routes', () => {
  let token;
  let user;

  const analyticsSchema = {
    type: 'object',
    properties: {
      summary: {
        type: 'object',
        properties: {
          totalTasks: { type: 'number' },
          completedTasks: { type: 'number' },
          pendingTasks: { type: 'number' },
          highRiskTasks: { type: 'number' },
          rescueSuccessRate: { type: 'number' },
          productivityScore: { type: 'number' },
          focusConsistency: { type: 'number' },
          deadlineCompletionRate: { type: 'number' }
        },
        required: [
          'totalTasks', 'completedTasks', 'pendingTasks', 'highRiskTasks', 
          'rescueSuccessRate', 'productivityScore', 'focusConsistency', 'deadlineCompletionRate'
        ]
      },
      charts: { type: 'object' }
    },
    required: ['summary', 'charts']
  };

  beforeEach(async () => {
    user = await createTestUser();
    token = await loginAndGetToken();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/analytics should calculate accurate metrics', async () => {
    // Seed some data directly for analytics calculation
    const uId = user.user.id;
    db.insert('tasks', { userId: uId, status: 'completed', deadline: new Date(Date.now() + 100000).toISOString(), updatedAt: new Date().toISOString() });
    db.insert('tasks', { userId: uId, status: 'completed', deadline: new Date(Date.now() + 100000).toISOString(), updatedAt: new Date().toISOString() });
    db.insert('tasks', { userId: uId, status: 'pending' });

    db.insert('rescue_modes', { userId: uId, status: 'resolved_success' });
    db.insert('rescue_modes', { userId: uId, status: 'resolved_failed' });
    db.insert('rescue_modes', { userId: uId, status: 'active' });

    db.insert('focus_sessions', { userId: uId, status: 'completed' });
    db.insert('focus_sessions', { userId: uId, status: 'completed' });
    db.insert('focus_sessions', { userId: uId, status: 'abandoned' });

    const res = await request(app).get('/api/analytics').set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toMatchSchema(analyticsSchema);
    
    expect(res.body.summary.totalTasks).toBe(3);
    expect(res.body.summary.completedTasks).toBe(2);
    expect(res.body.summary.pendingTasks).toBe(1);

    // Success rate = successful / total resolved = 1 / 2 = 50%
    expect(res.body.summary.rescueSuccessRate).toBe(50);

    // Focus consistency = completed / total = 2 / 3 = 66.7 -> 67%
    expect(res.body.summary.focusConsistency).toBe(67);
  });

  it('GET /api/analytics should return 0/100 default rates when no data', async () => {
    const res = await request(app).get('/api/analytics').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.rescueSuccessRate).toBe(100);
    expect(res.body.summary.focusConsistency).toBe(100);
    expect(res.body.summary.productivityScore).toBe(70); // Default is 70
  });
});
