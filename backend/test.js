const db = require('./db/firestore');

async function run() {
  try {
    console.log("Testing multiple fields...");
    const schedule = await db.findOne('schedules', { userId: 'testUser', date: '2026-06-28' });
    console.log("Schedule:", schedule);
    
    console.log("All tests passed!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
