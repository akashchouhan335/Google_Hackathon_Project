const request = require('supertest');
const { app, createTestUser, loginAndGetToken, createTestTask } = require('./utils');
const db = require('../db/jsonDb');

jest.mock('../services/geminiService');

describe('Focus Routes', () => {
  let token;
  let user;
  let task;

  const focusSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      userId: { type: 'string' },
      taskId: { type: 'string' },
      status: { type: 'string' },
      durationMinutes: { type: 'number' },
      startedAt: { type: 'string' },
      completedAt: { type: 'string' }
    },
    required: ['id', 'userId', 'taskId', 'status', 'startedAt']
  };

  beforeEach(async () => {
    user = await createTestUser();
    token = await loginAndGetToken();
    task = await createTestTask(token);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/focus/sprint should generate sprint parameters', async () => {
    const res = await request(app)
      .post('/api/focus/sprint')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId: task.id });
      
    expect(res.status).toBe(200);
    expect(res.body.taskId).toBe(task.id);
    expect(res.body.taskTitle).toBe(task.title);
    expect(res.body.goal).toBeDefined();
    expect(res.body.duration).toBeDefined();
    expect(res.body.breakDuration).toBeDefined();
  });

  it('POST /api/focus/sprint should generate intensive sprint for high priority task', async () => {
    const highPriTask = await createTestTask(token, { priorityLevel: 'high' });
    const res = await request(app)
      .post('/api/focus/sprint')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId: highPriTask.id });
      
    expect(res.status).toBe(200);
    expect(res.body.duration).toBe(50);
    expect(res.body.breakDuration).toBe(10);
  });

  it('POST /api/focus/sprint should fail if taskId missing', async () => {
    const res = await request(app)
      .post('/api/focus/sprint')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/focus/sprint should fail if task not found', async () => {
    const res = await request(app)
      .post('/api/focus/sprint')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId: 'invalid-id' });
    expect(res.status).toBe(404);
  });

  it('POST /api/focus/sprint should generate moderate sprint for medium priority task', async () => {
    // Manually insert task with specific scores to hit the >= 40 branch
    db.insert('tasks', { id: 'med-task', userId: user.user.id, title: 'Med', priorityScore: 50, riskScore: 50 });
    const res = await request(app).post('/api/focus/sprint').set('Authorization', `Bearer ${token}`).send({ taskId: 'med-task' });
    expect(res.body.duration).toBe(30);
  });

  it('POST /api/focus/sprint should generate default sprint for low priority task', async () => {
    // Manually insert task with specific scores to hit the fallback branch
    db.insert('tasks', { id: 'low-task', userId: user.user.id, title: 'Low', priorityScore: 20, riskScore: 20 });
    const res = await request(app).post('/api/focus/sprint').set('Authorization', `Bearer ${token}`).send({ taskId: 'low-task' });
    expect(res.body.duration).toBe(25);
  });

  it('POST /api/focus/session should start a focus session', async () => {
    const res = await request(app)
      .post('/api/focus/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId: task.id, duration: 25, goal: 'Test goal' });
      
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('active');
    expect(res.body.duration).toBe(25);
    expect(res.body.taskId).toBe(task.id);
  });

  it('PUT /api/focus/session/:id should complete session', async () => {
    const startRes = await request(app)
      .post('/api/focus/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId: task.id, duration: 25, goal: 'Test goal' });
      
    const sessionId = startRes.body.id;

    const res = await request(app)
      .put(`/api/focus/session/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('PUT /api/focus/session/:id should abandon session', async () => {
    const startRes = await request(app)
      .post('/api/focus/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId: task.id, duration: 25, goal: 'Test goal' });
      
    const sessionId = startRes.body.id;

    const res = await request(app)
      .put(`/api/focus/session/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'abandoned' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('abandoned');
  });

  it('POST /api/focus/session should fail on invalid ID', async () => {
    const res = await request(app)
      .put('/api/focus/session/invalid')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });

  it('POST /api/focus/session should fail if taskId missing', async () => {
    const res = await request(app)
      .post('/api/focus/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ duration: 25, goal: 'Test goal' });
    expect(res.status).toBe(400);
  });

  it('POST /api/focus/session should fail if task not found', async () => {
    const res = await request(app)
      .post('/api/focus/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId: 'non-existent', duration: 25, goal: 'Test goal' });
    expect(res.status).toBe(404);
  });

  it('PUT /api/focus/session/:id should fail if status is missing', async () => {
    const startRes = await request(app)
      .post('/api/focus/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId: task.id, duration: 25, goal: 'Test goal' });
      
    const sessionId = startRes.body.id;

    const res = await request(app)
      .put(`/api/focus/session/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
