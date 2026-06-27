const request = require('supertest');
const { app, createTestUser, loginAndGetToken } = require('./utils');
const db = require('../db/jsonDb');

describe('Notifications Routes', () => {
  let token;
  let user;
  let notifId;

  const notifSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      userId: { type: 'string' },
      type: { type: 'string' },
      message: { type: 'string' },
      read: { type: 'boolean' },
      createdAt: { type: 'string' }
    },
    required: ['id', 'userId', 'type', 'message', 'read', 'createdAt']
  };

  beforeEach(async () => {
    user = await createTestUser();
    token = await loginAndGetToken();

    const notif = db.insert('notifications', {
      userId: user.user.id,
      type: 'test_alert',
      message: 'This is a test notification',
      read: false
    });
    notifId = notif.id;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/notifications should return user notifications', async () => {
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchSchema(notifSchema);
  });

  it('PUT /api/notifications/:id/read should mark as read', async () => {
    const res = await request(app)
      .put(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const dbNotif = db.findOne('notifications', { id: notifId });
    expect(dbNotif.read).toBe(true);
  });

  it('PUT /api/notifications/:id/read should fail on invalid id', async () => {
    const res = await request(app)
      .put('/api/notifications/invalid-id/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
