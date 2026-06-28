const db = require('../db/firestore');

function startDeadlineAgent(intervalMs = 30000) {
  console.log(`[Deadline Agent] Started with interval ${intervalMs}ms`);
  
  const runAgent = async () => {
    try {
      // Find all tasks that are 'pending' or 'in_progress'
      const pendingTasks = await db.find('tasks', { status: 'pending' });
      const inProgressTasks = await db.find('tasks', { status: 'in_progress' });
      const activeTasks = [...pendingTasks, ...inProgressTasks];
      
      const now = new Date();
      
      for (const task of activeTasks) {
        if (task.deadline && new Date(task.deadline) < now) {
          console.log(`[Deadline Agent] Task "${task.title}" (ID: ${task.id}) missed deadline. Marking as incomplete.`);
          await db.update('tasks', { id: task.id }, {
            status: 'incomplete',
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error('[Deadline Agent] Error processing tasks:', err);
    }
  };

  // Run immediately on startup
  runAgent();
  
  // Then schedule periodic runs
  setInterval(runAgent, intervalMs);
}

module.exports = {
  startDeadlineAgent
};
