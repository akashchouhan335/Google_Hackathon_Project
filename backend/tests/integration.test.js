const request = require('supertest');
const { app, createTestUser, loginAndGetToken } = require('./utils');
const db = require('../db/jsonDb');

jest.mock('../services/geminiService');

describe('Integration Tests (Multi-Agent Workflow)', () => {
  let token;
  let user;

  beforeEach(async () => {
    user = await createTestUser();
    token = await loginAndGetToken();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Flow: Task Created -> High Risk -> Rescue Activated -> Focused -> Completed -> Analytics updated', async () => {
    // 1. Task Created
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Critical Deployment',
        description: 'Needs immediate attention',
        deadline: new Date(Date.now() + 86400000).toISOString(),
        estimatedHours: 8,
        priorityLevel: 'high'
      });
    
    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.id;

    // Verify Rescue Activated
    const activeRescueRes = await request(app).get('/api/rescue/active').set('Authorization', `Bearer ${token}`);
    expect(activeRescueRes.status).toBe(200);
    expect(activeRescueRes.body.length).toBe(1);
    expect(activeRescueRes.body[0].taskId).toBe(taskId);

    // Verify Notification triggered
    const notifRes = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(notifRes.body.some(n => n.type === 'rescue_activated')).toBe(true);

    // 2. Focus Sprint started and completed
    const focusStartRes = await request(app)
      .post('/api/focus/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId, duration: 60, goal: 'Finish' });
    expect(focusStartRes.status).toBe(201);
    const sessionId = focusStartRes.body.id;

    const focusEndRes = await request(app)
      .put(`/api/focus/session/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });
    expect(focusEndRes.status).toBe(200);

    // 3. Rescue resolved successfully
    const activeRescueId = activeRescueRes.body[0].id;
    await request(app)
      .post(`/api/rescue/resolve/${activeRescueId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved_success' });

    const rescueCheckRes = await request(app).get('/api/rescue/active').set('Authorization', `Bearer ${token}`);
    expect(rescueCheckRes.body.length).toBe(0);
    const analyticsRes = await request(app).get('/api/analytics').set('Authorization', `Bearer ${token}`);
    expect(analyticsRes.body.summary.completedTasks).toBe(1);
    expect(analyticsRes.body.summary.rescueSuccessRate).toBe(100);
    expect(analyticsRes.body.summary.focusConsistency).toBe(100);
  });
});
