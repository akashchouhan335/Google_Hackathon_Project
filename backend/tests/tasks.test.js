const request = require('supertest');
const { app, createTestUser, loginAndGetToken, createTestTask } = require('./utils');
const db = require('../db/jsonDb');

jest.mock('../services/geminiService');
const ai = require('../services/geminiService');

describe('Tasks Routes', () => {
  let token;
  let user;

  const taskSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      userId: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      deadline: { type: 'string' },
      estimatedHours: { type: 'number' },
      priorityLevel: { type: 'string' },
      status: { type: 'string' },
      priorityScore: { type: 'number' },
      priorityExplanation: { type: 'string' },
      riskScore: { type: 'number' },
      riskLevel: { type: 'string' },
      riskExplanation: { type: 'string' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' }
    },
    required: [
      'id', 'userId', 'title', 'deadline', 'estimatedHours', 'priorityLevel', 'status',
      'priorityScore', 'priorityExplanation', 'riskScore', 'riskLevel', 'riskExplanation'
    ]
  };

  beforeEach(async () => {
    user = await createTestUser();
    token = await loginAndGetToken();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/tasks should return all tasks for user', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it('GET /api/tasks should return 401 if no auth token is provided', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/No authorization header provided/i);
  });

  it('POST /api/tasks should create a task and run AI agents cascade', async () => {
    const taskData = {
      title: 'New Task',
      description: 'Test description',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      estimatedHours: 5,
      priorityLevel: 'high'
    };

    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send(taskData);
    
    expect(res.status).toBe(201);
    expect(res.body).toMatchSchema(taskSchema);
    expect(res.body.title).toBe(taskData.title);
    
    // Verify AI cascade was called
    expect(ai.runPriorityAgent).toHaveBeenCalled();
    expect(ai.runRiskAgent).toHaveBeenCalled();
    // Since priorityLevel is high, our mock returns riskScore=85
    expect(ai.runRecoveryAgent).toHaveBeenCalled();

    // Verify DB
    const dbTask = db.findOne('tasks', { id: res.body.id });
    expect(dbTask.priorityScore).toBe(75); // from mock
    expect(dbTask.riskScore).toBe(85); // from mock

    const rescue = db.findOne('rescue_modes', { taskId: res.body.id, status: 'active' });
    expect(rescue).toBeDefined();
    
    const notification = db.findOne('notifications', { userId: user.user.id });
    expect(notification).toBeDefined();
    expect(notification.message).toMatch(/Rescue Activated/);
  });

  it('POST /api/tasks should fail on missing title', async () => {
    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ deadline: '2025', estimatedHours: 2, priorityLevel: 'high' });
    expect(res.status).toBe(400);
  });

  it('POST /api/tasks should fail on missing deadline', async () => {
    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'Test', estimatedHours: 2, priorityLevel: 'high' });
    expect(res.status).toBe(400);
  });

  it('POST /api/tasks should default estimatedHours to 2 when missing', async () => {
    const res = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Default Test', deadline: new Date(Date.now() + 86400000).toISOString(), priorityLevel: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.estimatedHours).toBe(2);
  });

  it('POST /api/tasks should fail on missing priorityLevel', async () => {
    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'Test', deadline: '2025', estimatedHours: 2 });
    expect(res.status).toBe(400);
  });

  it('GET /api/tasks should sort tasks by status and priorityScore', async () => {
    // Insert tasks manually with different statuses and scores
    db.insert('tasks', { id: 't1', userId: user.user.id, title: 'T1', status: 'completed', priorityScore: 90 });
    db.insert('tasks', { id: 't2', userId: user.user.id, title: 'T2', status: 'pending', priorityScore: 50 });
    db.insert('tasks', { id: 't3', userId: user.user.id, title: 'T3', status: 'in_progress', priorityScore: 60 });
    db.insert('tasks', { id: 't4', userId: user.user.id, title: 'T4', status: 'pending', priorityScore: 80 });

    const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Order should be: in_progress (t3), pending-80 (t4), pending-50 (t2), completed (t1)
    expect(res.body[0].id).toBe('t3');
    expect(res.body[1].id).toBe('t4');
    expect(res.body[2].id).toBe('t2');
    expect(res.body[3].id).toBe('t1');
  });

  it('PUT /api/tasks/:id should update a task with all fields and re-run AI agents', async () => {
    const task = await createTestTask(token);
    
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ 
        title: 'Updated Title', 
        description: 'Updated Description',
        deadline: new Date(Date.now() + 100000000).toISOString(),
        estimatedHours: 2, 
        priorityLevel: 'low' 
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.description).toBe('Updated Description');
    expect(res.body.estimatedHours).toBe(2);

    // AI should be re-run
    // priorityLevel 'low' returns riskScore=20 in mock, so recovery shouldn't activate (or it resolves if it was active)
    const activeRescue = db.findOne('rescue_modes', { taskId: task.id, status: 'active' });
    expect(activeRescue).toBeNull();
  });
  
  it('PUT /api/tasks/:id should resolve active rescue if status is completed', async () => {
    const task = await createTestTask(token, { priorityLevel: 'high' }); // creates rescue
    
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    
    // Rescue should be resolved_success
    const resolvedRescue = db.findOne('rescue_modes', { taskId: task.id });
    expect(resolvedRescue.status).toBe('resolved_success');
    
    const notifs = db.find('notifications', { type: 'deadline_alert' });
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs[0].message).toMatch(/Rescue Mission Successful/);
  });

  it('PUT /api/tasks/:id should update existing active rescue if risk remains high', async () => {
    const task = await createTestTask(token, { priorityLevel: 'high' }); // creates rescue
    const rescue1 = db.findOne('rescue_modes', { taskId: task.id, status: 'active' });
    
    // Updating but keeping priority high keeps risk high (85)
    await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estimatedHours: 10, priorityLevel: 'high' });

    const rescue2 = db.findOne('rescue_modes', { taskId: task.id, status: 'active' });
    expect(rescue2).toBeDefined();
    // They should have the same ID since it was updated, not inserted
    expect(rescue1.id).toBe(rescue2.id);
  });

  it('PUT /api/tasks/:id should resolve active rescue to failed if risk drops but not completed', async () => {
    // Creating high priority task gives riskScore=85
    const task = await createTestTask(token, { priorityLevel: 'high' }); 
    const rescue1 = db.findOne('rescue_modes', { taskId: task.id, status: 'active' });
    expect(rescue1).toBeDefined();

    // Updating to low priority makes mock riskScore=20 (< 80)
    await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ priorityLevel: 'low', status: 'pending' });

    const resolvedRescue = db.findOne('rescue_modes', { taskId: task.id });
    expect(resolvedRescue.status).toBe('resolved_failed');
  });

  it('PUT /api/tasks/:id should return 404 for non-existent task', async () => {
    const res = await request(app)
      .put('/api/tasks/invalid-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New title' });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/tasks/:id should delete task and related objects', async () => {
    const task = await createTestTask(token, { priorityLevel: 'high' }); // triggers rescue
    db.insert('focus_sessions', { taskId: task.id, userId: user.user.id });

    const res = await request(app).delete(`/api/tasks/${task.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const dbTask = db.findOne('tasks', { id: task.id });
    expect(dbTask).toBeNull();
    const dbRescue = db.findOne('rescue_modes', { taskId: task.id });
    expect(dbRescue).toBeNull();
    const dbFocus = db.findOne('focus_sessions', { taskId: task.id });
    expect(dbFocus).toBeNull();
  });

  it('DELETE /api/tasks/:id should return 404 for invalid id', async () => {
    const res = await request(app).delete('/api/tasks/invalid-id').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('POST /api/tasks should return 500 on internal error', async () => {
    jest.spyOn(db, 'insert').mockImplementationOnce(() => {
      throw new Error('Database insertion failed');
    });

    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
      title: 'New Task', deadline: new Date().toISOString(), estimatedHours: 5, priorityLevel: 'high'
    });
    
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Failed to create task/);
  });

  it('PUT /api/tasks/:id should return 500 on internal error', async () => {
    const task = await createTestTask(token);
    jest.spyOn(db, 'update').mockImplementationOnce(() => {
      throw new Error('Database update failed');
    });

    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Failed to update task/);
  });
});
