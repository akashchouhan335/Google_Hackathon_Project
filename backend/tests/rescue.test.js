const request = require('supertest');
const { app, createTestUser, loginAndGetToken, createTestTask } = require('./utils');
const db = require('../db/jsonDb');

jest.mock('../services/geminiService');

describe('Rescue Routes', () => {
  let token;
  let user;
  let rescueTask;

  const rescueSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      userId: { type: 'string' },
      taskId: { type: 'string' },
      status: { type: 'string' },
      requiredDailyHours: { type: 'number' },
      successProbability: { type: 'number' },
      recoveryStrategy: { type: 'string' },
      extraWorkSessions: { type: 'array', items: { type: 'string' } },
      activatedAt: { type: 'string' }
    },
    required: ['id', 'userId', 'taskId', 'status', 'requiredDailyHours', 'successProbability']
  };

  beforeEach(async () => {
    user = await createTestUser();
    token = await loginAndGetToken();
    // High priority triggers mock RiskAgent to return riskScore=85, which triggers RecoveryAgent
    rescueTask = await createTestTask(token, { priorityLevel: 'high' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/rescue/active should return active rescue modes', async () => {
    const res = await request(app).get('/api/rescue/active').set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(1);
    
    const rescue = res.body[0];
    expect(rescue).toMatchSchema(rescueSchema);
    expect(rescue.taskId).toBe(rescueTask.id);
    expect(rescue.status).toBe('active');
  });

  it('GET /api/rescue/active should handle orphaned rescue records', async () => {
    // Insert an active rescue record that has a non-existent taskId
    const { db } = require('../db/jsonDb');
    // We already have db required at the top
    
    // Create orphaned record
    const orphanedRescue = {
      id: 'orphaned-123',
      userId: user.user.id, // Must match the test user's id
      taskId: 'non-existent-task-id',
      status: 'active',
      plan: ['Do something']
    };
    
    // For inserting we can just use the db module
    const jsonDb = require('../db/jsonDb');
    jsonDb.insert('rescue_modes', orphanedRescue);

    const res = await request(app).get('/api/rescue/active').set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    // Should filter out the orphaned record, leaving only the one created in beforeEach
    expect(res.body.length).toBe(1);
    expect(res.body[0].taskId).toBe(rescueTask.id);
  });

  it('GET /api/rescue/active should return empty if no active modes', async () => {
    // Resolve the active rescue mode
    await request(app)
      .put(`/api/tasks/${rescueTask.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    const res = await request(app).get('/api/rescue/active').set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(0);
  });

  it('POST /api/rescue/resolve/:id should resolve as success', async () => {
    const activeRes = await request(app).get('/api/rescue/active').set('Authorization', `Bearer ${token}`);
    const rescueId = activeRes.body[0].id;

    const res = await request(app)
      .post(`/api/rescue/resolve/${rescueId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved_success' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const checkRes = await request(app).get('/api/rescue/active').set('Authorization', `Bearer ${token}`);
    expect(checkRes.body.length).toBe(0);
  });

  it('POST /api/rescue/resolve/:id should resolve as failed', async () => {
    const activeRes = await request(app).get('/api/rescue/active').set('Authorization', `Bearer ${token}`);
    const rescueId = activeRes.body[0].id;

    const res = await request(app)
      .post(`/api/rescue/resolve/${rescueId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved_failed' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/rescue/resolve/:id should fail on invalid ID', async () => {
    const res = await request(app)
      .post('/api/rescue/resolve/invalid')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved_success' });

    expect(res.status).toBe(404);
  });
});
