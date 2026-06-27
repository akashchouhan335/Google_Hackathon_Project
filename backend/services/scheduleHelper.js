const db = require('../db/jsonDb');

/**
 * Automatically updates all schedules for a user when a task is completed or deleted.
 * Replaces any slots allocated to the completed/deleted task with the next highest-priority active task,
 * or with a buffer slot if no other active tasks are available.
 */
function updateSchedulesOnTaskCompletion(userId, completedTaskId) {
  try {
    const schedules = db.find('schedules', { userId });
    if (schedules.length === 0) return;

    // Find the next available active task for the user (pending or in progress)
    const activeTasks = db.find('tasks', { userId })
      .filter(t => (t.status === 'pending' || t.status === 'in_progress') && t.id !== completedTaskId)
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

    const nextTask = activeTasks[0]; // Highest priority pending/in_progress task

    for (const sched of schedules) {
      let modified = false;
      const newAllocation = sched.allocation.map(slot => {
        if (slot.taskId === completedTaskId) {
          modified = true;
          if (nextTask) {
            return {
              ...slot,
              taskId: nextTask.id,
              taskTitle: nextTask.title,
              activity: `Focus deep work session on next priority task: ${nextTask.title}`
            };
          } else {
            // Convert to buffer if no other tasks
            return {
              ...slot,
              taskId: 'buffer',
              taskTitle: 'Administrative Buffer & Catch-up',
              activity: 'Process pending notifications, plan tomorrow\'s sprint milestones, or continue overdue tasks.'
            };
          }
        }
        return slot;
      });

      if (modified) {
        db.update('schedules', { id: sched.id }, { allocation: newAllocation });
      }
    }
  } catch (err) {
    console.error('Error updating schedules on task completion:', err.message);
  }
}

module.exports = {
  updateSchedulesOnTaskCompletion
};
