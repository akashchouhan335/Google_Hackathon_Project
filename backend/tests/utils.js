const request = require('supertest');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Register API Routes for testing
app.use('/api/auth', require('../routes/auth'));
app.use('/api/tasks', require('../routes/tasks'));
app.use('/api/rescue', require('../routes/rescue'));
app.use('/api/focus', require('../routes/focus'));
app.use('/api/schedule', require('../routes/schedule'));
app.use('/api/notifications', require('../routes/notifications'));
app.use('/api/analytics', require('../routes/analytics'));
app.use('/api/coach', require('../routes/coach'));

// Global Error Handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error occurred.' });
});

async function createTestUser(email = 'test@example.com', password = 'password123', name = 'Test User') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name });
  return res.body;
}

async function loginAndGetToken(email = 'test@example.com', password = 'password123') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.token;
}

async function createTestTask(token, taskOverrides = {}) {
  const defaultTask = {
    title: 'Test Task',
    description: 'A test description',
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    estimatedHours: 4,
    priorityLevel: 'high'
  };
  
  const res = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...defaultTask, ...taskOverrides });
    
  return res.body;
}

module.exports = {
  app,
  createTestUser,
  loginAndGetToken,
  createTestTask
};
