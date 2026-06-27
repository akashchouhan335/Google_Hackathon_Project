const fs = require('fs');
const db = require('../db/jsonDb');

describe('JSON Database Edge Cases', () => {
  const dbPath = db.dbPath;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle JSON parse errors during init by resetting db', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{ invalid json }');
    const writeSpy = jest.spyOn(db, 'write').mockImplementation(() => {});
    
    // Call init manually
    db.init();
    
    expect(writeSpy).toHaveBeenCalled();
  });

  it('should handle read errors gracefully', () => {
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('Read error');
    });
    
    const data = db.read();
    expect(data).toHaveProperty('users');
    expect(data.users).toEqual([]);
  });

  it('should handle write errors gracefully', () => {
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('Write error');
    });
    
    const result = db.write({});
    expect(result).toBe(false);
  });

  it('should return false on delete if no records match', () => {
    db.write({ users: [{ id: '1', name: 'Alice' }] });
    const result = db.delete('users', { id: 'non-existent' });
    expect(result).toBe(false);
  });

  it('should return false on delete if table does not exist', () => {
    const result = db.delete('invalid_table', { id: 'non-existent' });
    expect(result).toBe(false);
  });
});
