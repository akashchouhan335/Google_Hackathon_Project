const path = require('path');
const fs = require('fs');

const testDbPath = process.env.DB_PATH;

const db = require('../db/jsonDb');

// Helper to reset the test database before each test
global.resetTestDb = () => {
  const initialDb = {
    users: [],
    tasks: [],
    rescue_modes: [],
    focus_sessions: [],
    notifications: []
  };
  
  // Ensure the directory exists
  const dir = path.dirname(testDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(testDbPath, JSON.stringify(initialDb, null, 2), 'utf8');
};

// Jest global setup
beforeEach(() => {
  global.resetTestDb();
});

afterAll(() => {
  // Clean up the test database file
  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch (e) {
    // Ignore EBUSY errors on Windows
  }
});

// Jest json schema configuration
const { matchers } = require('jest-json-schema');
expect.extend(matchers);
