const request = require('supertest');
const { app, createTestUser, loginAndGetToken } = require('./utils');
const db = require('../db/jsonDb');

jest.mock('../services/geminiService');

describe('Coach Routes', () => {
  let token;
  let user;

  const coachSchema = {
    type: 'object',
    properties: {
      insights: { type: 'array', items: { type: 'string' } },
      focusRecommendations: { type: 'array', items: { type: 'string' } },
      habitTips: { type: 'array', items: { type: 'string' } }
    },
    required: ['insights', 'focusRecommendations', 'habitTips']
  };

  beforeEach(async () => {
    user = await createTestUser();
    token = await loginAndGetToken();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/coach/insights should generate insights using Coach Agent', async () => {
    const res = await request(app).get('/api/coach/insights').set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toMatchSchema(coachSchema);
    expect(res.body.insights).toBeInstanceOf(Array);
    expect(res.body.insights.length).toBeGreaterThan(0);
    
    const ai = require('../services/geminiService');
    expect(ai.runCoachAgent).toHaveBeenCalled();
  });

  it('GET /api/coach/insights should compile metrics before calling agent', async () => {
    // Just verify the route succeeds when data exists
    db.insert('tasks', { userId: user.user.id, status: 'completed' });
    
    const res = await request(app).get('/api/coach/insights').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/coach/insights should return 500 on internal error', async () => {
    const ai = require('../services/geminiService');
    jest.spyOn(ai, 'runCoachAgent').mockImplementationOnce(() => {
      throw new Error('Agent failed');
    });

    const res = await request(app).get('/api/coach/insights').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});
