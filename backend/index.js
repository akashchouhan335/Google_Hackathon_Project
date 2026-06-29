const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const app = require("./server");
const db = require("./db/firestore");

// Export the Express API as an HTTP Cloud Function
exports.api = onRequest(app);

// Export the Deadline Agent as a Scheduled Cloud Function (Runs every minute)
exports.checkDeadlines = onSchedule("every 1 minutes", async (event) => {
  console.log(`[Scheduled Agent] Checking for missed deadlines...`);
  try {
    const pendingTasks = await db.find('tasks', { status: 'pending' });
    const inProgressTasks = await db.find('tasks', { status: 'in_progress' });
    const activeTasks = [...pendingTasks, ...inProgressTasks];
    
    const now = new Date();
    
    for (const task of activeTasks) {
      if (task.deadline && new Date(task.deadline) < now) {
        console.log(`[Scheduled Agent] Task "${task.title}" (ID: ${task.id}) missed deadline. Marking as incomplete.`);
        await db.update('tasks', { id: task.id }, {
          status: 'incomplete',
          updatedAt: new Date().toISOString()
        });
      }
    }
    console.log(`[Scheduled Agent] Finished checking deadlines.`);
  } catch (err) {
    console.error('[Scheduled Agent] Error processing tasks:', err);
  }
});
