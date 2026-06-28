const path = require('path');
const fs = require('fs');

const workerId = process.env.JEST_WORKER_ID || '1';
const testDbPath = path.join(__dirname, `../data/test_db_${workerId}.json`);
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_123';
process.env.GEMINI_API_KEY = ''; // Clear api key during tests to avoid real API rate limits

const config = require('../config');
config.DB_PATH = testDbPath;
config.NODE_ENV = 'test';
config.JWT_SECRET = 'test_secret_123';
config.GEMINI_API_KEY = ''; // Clear api key during tests to avoid real API rate limits

global.testDbPath = testDbPath;
