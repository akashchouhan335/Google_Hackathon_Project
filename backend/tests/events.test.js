const request = require('supertest');
const { app, createTestUser, loginAndGetToken, createTestTask } = require('./utils');
const db = require('../db/jsonDb');

jest.mock('../services/geminiService');

describe('Event-Dispatch Workflow Tests', () => {
  let token;
  let user;

  beforeEach(async () => {
    user = await createTestUser();
    token = await loginAndGetToken();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Task creation event dispatches Priority and Risk agents, then triggers Recovery event if high risk', async () => {
    // PriorityLevel 'high' will trigger mock RiskScore = 85 -> triggers Recovery
    const taskData = {
      title: 'High Risk Task Event',
      description: 'Triggers cascade',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      estimatedHours: 10,
      priorityLevel: 'high'
    };

    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send(taskData);
    expect(res.status).toBe(201);
    const taskId = res.body.id;

    // Verify cascade effects
    const rescue = db.findOne('rescue_modes', { taskId });
    expect(rescue).toBeDefined();
    expect(rescue.status).toBe('active');

    const notifs = db.find('notifications', { userId: user.user.id });
    const rescueNotif = notifs.find(n => n.type === 'rescue_activated');
    expect(rescueNotif).toBeDefined();
  });

  it('Task completion event resolves rescue mode and dispatches success notification', async () => {
    const task = await createTestTask(token, { priorityLevel: 'high' }); // Creates rescue

    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });
    
    expect(res.status).toBe(200);

    // Verify event dispatch
    const rescue = db.findOne('rescue_modes', { taskId: task.id });
    expect(rescue.status).toBe('resolved_success');

    const notifs = db.find('notifications', { userId: user.user.id });
    const completionNotifs = notifs.filter(n => n.type === 'focus_reminder' || n.type === 'deadline_alert');
    expect(completionNotifs.length).toBeGreaterThan(0);
    expect(completionNotifs.some(n => n.message.includes('Rescue Mission Successful'))).toBe(true);
  });
});
