const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Ensure data directory exists
const dataDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial structure if database doesn't exist
const initialDb = {
  users: [],
  tasks: [],
  rescue_modes: [],
  focus_sessions: [],
  notifications: []
};

class JsonDb {
  constructor() {
    this.dbPath = config.DB_PATH;
    this.init();
  }

  init() {
    if (!fs.existsSync(this.dbPath)) {
      this.write(initialDb);
    } else {
      // Validate JSON structure
      try {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        JSON.parse(data);
      } catch (err) {
        console.warn('DB file was corrupted, resetting database:', err.message);
        this.write(initialDb);
      }
    }
  }

  read() {
    try {
      const data = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading database:', err);
      return initialDb;
    }
  }

  write(data) {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error writing database:', err);
      return false;
    }
  }

  // Find multiple records
  find(table, query = {}) {
    const data = this.read();
    if (!data[table]) return [];
    
    return data[table].filter(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  }

  // Find a single record
  findOne(table, query = {}) {
    const data = this.read();
    if (!data[table]) return null;
    
    const record = data[table].find(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    return record || null;
  }

  // Insert a record
  insert(table, record) {
    const data = this.read();
    if (!data[table]) {
      data[table] = [];
    }

    const newRecord = {
      id: uuidv4(),
      ...record,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data[table].push(newRecord);
    this.write(data);
    return newRecord;
  }

  // Update records matching a query
  update(table, query, updateData) {
    const data = this.read();
    if (!data[table]) return [];

    let updatedRecords = [];
    data[table] = data[table].map(item => {
      let matches = true;
      for (const key in query) {
        if (item[key] !== query[key]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        const updated = {
          ...item,
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        updatedRecords.push(updated);
        return updated;
      }
      return item;
    });

    if (updatedRecords.length > 0) {
      this.write(data);
    }
    return updatedRecords;
  }

  // Delete records matching a query
  delete(table, query) {
    const data = this.read();
    if (!data[table]) return false;

    const initialLength = data[table].length;
    data[table] = data[table].filter(item => {
      let matches = true;
      for (const key in query) {
        if (item[key] !== query[key]) {
          matches = false;
          break;
        }
      }
      return !matches; // Keep non-matching items
    });

    const deletedCount = initialLength - data[table].length;
    if (deletedCount > 0) {
      this.write(data);
      return true;
    }
    return false;
  }
}

module.exports = new JsonDb();
