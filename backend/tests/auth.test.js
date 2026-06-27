const request = require('supertest');
const { app } = require('./utils');
const db = require('../db/jsonDb');

describe('Auth Routes', () => {
  const userSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string' },
      settings: {
        type: 'object',
        properties: {
          workStartHour: { type: 'number' },
          workEndHour: { type: 'number' },
          theme: { type: 'string' }
        },
        required: ['workStartHour', 'workEndHour', 'theme']
      },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' }
    },
    required: ['id', 'email', 'name', 'settings', 'createdAt', 'updatedAt']
  };

  const registerBody = {
    email: 'newuser@example.com',
    password: 'password123',
    name: 'New User'
  };

  it('POST /api/auth/register should register a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(registerBody);
    
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchSchema(userSchema);
    expect(res.body.user.email).toBe(registerBody.email);
    expect(res.body.user.name).toBe(registerBody.name);

    // Verify DB
    const dbUser = db.findOne('users', { email: registerBody.email });
    expect(dbUser).toBeDefined();
    expect(dbUser.passwordHash).toBeDefined();
  });

  it('POST /api/auth/register should fail if fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/register should fail if email already exists', async () => {
    await request(app).post('/api/auth/register').send(registerBody);
    const res = await request(app).post('/api/auth/register').send(registerBody);
    
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/);
  });

  it('POST /api/auth/login should login user', async () => {
    await request(app).post('/api/auth/register').send(registerBody);
    const res = await request(app).post('/api/auth/login').send({
      email: registerBody.email,
      password: registerBody.password
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchSchema(userSchema);
  });

  it('POST /api/auth/login should fail on invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'password123'
    });
    expect(res.status).toBe(400);
    
    await request(app).post('/api/auth/register').send(registerBody);
    const res2 = await request(app).post('/api/auth/login').send({
      email: registerBody.email,
      password: 'wrongpassword'
    });
    expect(res2.status).toBe(400);
  });

  it('POST /api/auth/login should fail on missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
  });

  it('GET /api/auth/me should return current user', async () => {
    const regRes = await request(app).post('/api/auth/register').send(registerBody);
    const token = regRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchSchema(userSchema);
    expect(res.body.email).toBe(registerBody.email);
  });

  it('GET /api/auth/me should fail without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me should fail with malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(403);
  });

  it('GET /api/auth/me should fail if user deleted', async () => {
    const regRes = await request(app).post('/api/auth/register').send(registerBody);
    const token = regRes.body.token;
    
    db.delete('users', { email: registerBody.email });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PUT /api/auth/settings should update settings', async () => {
    const regRes = await request(app).post('/api/auth/register').send(registerBody);
    const token = regRes.body.token;

    const res = await request(app)
      .put('/api/auth/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ workStartHour: 10, theme: 'dark' });

    expect(res.status).toBe(200);
    expect(res.body.settings.workStartHour).toBe(10);
    expect(res.body.settings.workEndHour).toBe(17); // unchanged
    expect(res.body.settings.theme).toBe('dark');
    expect(res.body).toMatchSchema(userSchema);
  });
  
  it('PUT /api/auth/settings should fail if user not found', async () => {
    const regRes = await request(app).post('/api/auth/register').send(registerBody);
    const token = regRes.body.token;
    db.delete('users', { email: registerBody.email });

    const res = await request(app)
      .put('/api/auth/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ workStartHour: 10 });
    expect(res.status).toBe(404);
  });
});
