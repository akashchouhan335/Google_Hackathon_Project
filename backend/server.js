const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

// Initialize database
require('./db/jsonDb');

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

// Serve Static Assets in Production
if (config.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true') {
  const frontendDistPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDistPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
  console.log(`Serving static production build from: ${frontendDistPath}`);
} else {
  // Test root route in dev
  app.get('/', (req, res) => {
    res.json({ message: 'Deadline Guardian AI Backend API is active.' });
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// Start Server
app.listen(config.PORT, () => {
  console.log(`==================================================`);
  console.log(`Deadline Guardian AI Server is running on port ${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`==================================================`);
});
