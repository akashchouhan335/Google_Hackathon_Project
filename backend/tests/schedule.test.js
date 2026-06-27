const request = require('supertest');
const { app, createTestUser, loginAndGetToken, createTestTask } = require('./utils');
const db = require('../db/jsonDb');

jest.mock('../services/geminiService');

describe('Schedule Routes', () => {
  let token;
  let user;
  let task;

  const scheduleSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      userId: { type: 'string' },
      date: { type: 'string' },
      availableHours: { type: 'number' },
      allocation: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            timeSlot: { type: 'string' },
            reasoning: { type: 'string' }
          },
          required: ['taskId', 'timeSlot']
        }
      }
    },
    required: ['id', 'userId', 'date', 'availableHours', 'allocation']
  };

  beforeEach(async () => {
    user = await createTestUser();
    token = await loginAndGetToken();
    task = await createTestTask(token); // Need a pending task to generate schedule
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/schedule/generate should generate schedule', async () => {
    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableHours: 4 });
    
    expect(res.status).toBe(200);
    expect(res.body).toMatchSchema(scheduleSchema);
    expect(res.body.allocation).toBeInstanceOf(Array);
    expect(res.body.allocation.length).toBeGreaterThan(0);
  });

  it('POST /api/schedule/generate should update existing schedule for the same date', async () => {
    // Generate first time
    await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableHours: 4 });
    
    // Generate second time (should hit existingSchedule branch)
    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableHours: 6 });
      
    expect(res.status).toBe(200);
    expect(res.body.availableHours).toBe(6);
  });

  it('POST /api/schedule/generate should return 500 on internal error', async () => {
    jest.spyOn(db, 'findOne').mockImplementationOnce(() => {
      throw new Error('DB Error');
    });

    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableHours: 4 });
      
    expect(res.status).toBe(500);
  });



  it('POST /api/schedule/generate should return 400 if no pending tasks', async () => {
    // Complete the test task so there are no pending tasks
    await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableHours: 4 });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no pending tasks to schedule/);
  });

  it('POST /api/schedule/generate should return 400 if availableHours missing', async () => {
    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({});
      
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/positive available study\/work hours/);
  });

  it('POST /api/schedule/generate should fail without token', async () => {
    const res = await request(app).post('/api/schedule/generate').send({ availableHours: 4 });
    expect(res.status).toBe(401);
  });
  
  it('GET /api/schedule should return current active schedule', async () => {
    await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableHours: 4 });
      
    const res = await request(app)
      .get('/api/schedule')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body).toMatchSchema(scheduleSchema);
  });

  it('completing a task should reallocate its slots in the schedule to the next pending task', async () => {
    // Create a second task so we have a 'next' task
    const secondTask = await createTestTask(token);
    db.update('tasks', { id: secondTask.id }, { priorityScore: 90 });

    // Generate a schedule that allocates the first task
    await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableHours: 4 });

    // Mark the first task as completed
    await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    // Retrieve the schedule and assert that the first task has been replaced by the second task
    const res = await request(app)
      .get('/api/schedule')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const hasFirstTask = res.body.allocation.some(slot => slot.taskId === task.id);
    const hasSecondTask = res.body.allocation.some(slot => slot.taskId === secondTask.id);

    expect(hasFirstTask).toBe(false);
    expect(hasSecondTask).toBe(true);
  });
});
