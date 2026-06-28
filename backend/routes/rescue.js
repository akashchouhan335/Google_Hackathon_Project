const express = require('express');
const router = express.Router();
const db = require('../db/firestore');
const auth = require('../middleware/auth');
const { regenerateTodaySchedule } = require('../services/scheduleHelper');

// Get all active rescue plans
router.get('/active', auth, async (req, res) => {
  const activeRescues = await db.find('rescue_modes', { userId: req.user.id, status: 'active' });
  
  // Attach task details to each rescue mode
  const rescuesWithTask = (await Promise.all(activeRescues.map(async rescue => {
    const task = await db.findOne('tasks', { id: rescue.taskId });
    return {
      ...rescue,
      task: task ? {
        title: task.title,
        deadline: task.deadline,
        estimatedHours: task.estimatedHours,
        priorityLevel: task.priorityLevel
      } : null
    };
  }))).filter(r => r.task !== null); // Filter out orphaned records

  res.json(rescuesWithTask);
});

// Resolve a rescue mode manually
router.post('/resolve/:id', auth, async (req, res) => {
  const { status } = req.body; // 'resolved_success' or 'resolved_failed'
  const rescueId = req.params.id;

  const rescue = await db.findOne('rescue_modes', { id: rescueId, userId: req.user.id });
  if (!rescue) {
    return res.status(404).json({ error: 'Rescue mode record not found.' });
  }

  const finalStatus = status === 'resolved_success' ? 'resolved_success' : 'resolved_failed';
  
  await db.update('rescue_modes', { id: rescueId }, {
    status: finalStatus,
    resolvedAt: new Date().toISOString()
  });

  // Also update task if resolved successfully
  if (finalStatus === 'resolved_success') {
    await db.update('tasks', { id: rescue.taskId }, { status: 'completed' });
    await regenerateTodaySchedule(req.user.id);
  }

  res.json({ success: true, message: `Rescue mode resolved as ${finalStatus}.` });
});

module.exports = router;
