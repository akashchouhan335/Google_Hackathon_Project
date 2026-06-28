const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

// Initialize database
require('./db/firestore');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/rescue', require('./routes/rescue'));
app.use('/api/focus', require('./routes/focus'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/coach', require('./routes/coach'));

// Test root route
app.get('/', (req, res) => {
  res.json({ message: 'Deadline Guardian AI Backend API is active.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// If not required by another module, start server locally
if (require.main === module) {
  // Start Server
  app.listen(config.PORT, () => {
    console.log(`==================================================`);
    console.log(`Deadline Guardian AI Server is running on port ${config.PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
    console.log(`==================================================`);
    
    // Start the background agent to check for overdue tasks
    const { startDeadlineAgent } = require('./services/deadlineAgent');
    startDeadlineAgent(30000); // Check every 30 seconds
  });
}

module.exports = app;
