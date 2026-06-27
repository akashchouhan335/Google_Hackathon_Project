const express = require('express');
const router = express.Router();
const db = require('../db/jsonDb');
const auth = require('../middleware/auth');
const { updateSchedulesOnTaskCompletion } = require('../services/scheduleHelper');

// Get all active rescue plans
router.get('/active', auth, (req, res) => {
  const activeRescues = db.find('rescue_modes', { userId: req.user.id, status: 'active' });
  
  // Attach task details to each rescue mode
  const rescuesWithTask = activeRescues.map(rescue => {
    const task = db.findOne('tasks', { id: rescue.taskId });
    return {
      ...rescue,
      task: task ? {
        title: task.title,
        deadline: task.deadline,
        estimatedHours: task.estimatedHours,
        priorityLevel: task.priorityLevel
      } : null
    };
  }).filter(r => r.task !== null); // Filter out orphaned records

  res.json(rescuesWithTask);
});

// Resolve a rescue mode manually
router.post('/resolve/:id', auth, (req, res) => {
  const { status } = req.body; // 'resolved_success' or 'resolved_failed'
  const rescueId = req.params.id;

  const rescue = db.findOne('rescue_modes', { id: rescueId, userId: req.user.id });
  if (!rescue) {
    return res.status(404).json({ error: 'Rescue mode record not found.' });
  }

  const finalStatus = status === 'resolved_success' ? 'resolved_success' : 'resolved_failed';
  
  db.update('rescue_modes', { id: rescueId }, {
    status: finalStatus,
    resolvedAt: new Date().toISOString()
  });

  // Also update task if resolved successfully
  if (finalStatus === 'resolved_success') {
    db.update('tasks', { id: rescue.taskId }, { status: 'completed' });
    updateSchedulesOnTaskCompletion(req.user.id, rescue.taskId);
  }

  res.json({ success: true, message: `Rescue mode resolved as ${finalStatus}.` });
});

module.exports = router;
