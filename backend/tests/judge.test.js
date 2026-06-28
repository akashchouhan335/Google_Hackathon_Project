const request = require('supertest');
const { app } = require('./utils');
const db = require('../db/jsonDb');

jest.mock('../services/geminiService');

describe('Hackathon Judging Criteria - End-to-End System robustness', () => {
  let token;
  const testUser = {
    email: 'judge@hackathon.com',
    password: 'password123',
    name: 'Hackathon Judge'
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. Zero-to-Hero flow: Registration, Task Cascade, Rescue Lifecycle, Coaching', async () => {
    // 1. Register User
    const regRes = await request(app).post('/api/auth/register').send(testUser);
    expect(regRes.status).toBe(201);
    token = regRes.body.token;
    expect(token).toBeDefined();

    // 2. Adjust settings to start work early
    await request(app).put('/api/auth/settings').set('Authorization', `Bearer ${token}`).send({ workStartHour: 8 });

    // 3. Create normal task (low risk)
    const task1Res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Draft Documentation',
        description: 'Basic docs',
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        estimatedHours: 2,
        priorityLevel: 'low'
      });
    expect(task1Res.status).toBe(201);

    // 4. Create high risk task (triggers rescue)
    const task2Res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Fix Production Bug',
        description: 'ASAP',
        deadline: new Date(Date.now() + 3600000).toISOString(),
        estimatedHours: 5,
        priorityLevel: 'high'
      });
    expect(task2Res.status).toBe(201);
    
    // 5. Generate schedule
    const schedRes = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ availableHours: 4 });
    expect(schedRes.status).toBe(202);
    expect(schedRes.body.isGenerating).toBe(true);
    expect(schedRes.body.allocation).toBeInstanceOf(Array);

    // 6. Complete focus session for normal task
    const focus1Res = await request(app)
      .post('/api/focus/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId: task1Res.body.id, duration: 25, goal: 'docs' });
    await request(app)
      .put(`/api/focus/session/${focus1Res.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });
      
    // Mark task as completed
    await request(app)
      .put(`/api/tasks/${task1Res.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    // 7. Abandon focus session for high risk task
    const focus2Res = await request(app)
      .post('/api/focus/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ taskId: task2Res.body.id, duration: 60, goal: 'fix' });
    await request(app)
      .put(`/api/focus/session/${focus2Res.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'abandoned' });

    // 8. View Analytics and verify calculations
    const analyticsRes = await request(app).get('/api/analytics').set('Authorization', `Bearer ${token}`);
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.summary.totalTasks).toBe(2);
    expect(analyticsRes.body.summary.completedTasks).toBe(1);
    expect(analyticsRes.body.summary.focusConsistency).toBe(50); // 1 complete, 1 abandoned
    
    // 9. Get Coaching insights
    const coachRes = await request(app).get('/api/coach/insights').set('Authorization', `Bearer ${token}`);
    expect(coachRes.status).toBe(200);
    expect(coachRes.body.insights).toBeDefined();
    
    // 10. Check notifications flow
    const notifRes = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.length).toBeGreaterThan(0);
  });
});
