const db = require('../db/firestore');
const ai = require('./geminiService');

/**
 * Automatically regenerates today's schedule for a user.
 * Called when tasks are created, updated, completed, or deleted to keep the dashboard schedule in sync.
 */
async function regenerateTodaySchedule(userId) {
  try {
    const targetDate = new Date().toISOString().split('T')[0];
    const existingSchedule = await db.findOne('schedules', { userId, date: targetDate });
    
    // If no schedule exists, we don't automatically generate one
    if (!existingSchedule) return;

    const availableHours = existingSchedule.availableHours || 6;

    // Get active tasks (pending or in progress) and sort by priority
    const activeTasks = (await db.find('tasks', { userId }))
      .filter(t => t.status === 'pending' || t.status === 'in_progress')
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

    if (activeTasks.length === 0) {
      // Clear the schedule allocations since there are no active tasks left
      await db.update('schedules', { id: existingSchedule.id }, { allocation: [] });
      return;
    }

    const user = await db.findOne('users', { id: userId });
    const workStartHour = user && user.settings ? user.settings.workStartHour : 9;

    console.log(`Auto-regenerating schedule for user ${userId} with ${activeTasks.length} active tasks.`);
    const result = await ai.runScheduleAgent(activeTasks, Number(availableHours), Number(workStartHour));

    await db.update('schedules', { id: existingSchedule.id }, {
      allocation: result.allocation
    });
  } catch (err) {
    console.error('Error auto-regenerating schedule:', err.message);
  }
}

module.exports = {
  regenerateTodaySchedule
};
