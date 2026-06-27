const express = require('express');
const router = express.Router();
const db = require('../db/jsonDb');
const auth = require('../middleware/auth');
const ai = require('../services/geminiService');

// Get active schedule for a date
router.get('/', auth, (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const schedule = db.findOne('schedules', { userId: req.user.id, date });
  res.json(schedule || { date, allocation: [] });
});

// Generate a new schedule using the Schedule Agent
router.post('/generate', auth, async (req, res) => {
  const { availableHours, date } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  if (!availableHours || Number(availableHours) <= 0) {
    return res.status(400).json({ error: 'Please specify positive available study/work hours.' });
  }

  try {
    const user = db.findOne('users', { id: req.user.id });
    const workStartHour = user && user.settings ? user.settings.workStartHour : 9;

    // Get active tasks (pending or in progress)
    const activeTasks = db.find('tasks', { userId: req.user.id })
      .filter(t => t.status === 'pending' || t.status === 'in_progress');

    if (activeTasks.length === 0) {
      return res.status(400).json({ error: 'You have no pending tasks to schedule. Create some tasks first!' });
    }

    console.log(`Running Schedule Agent for ${activeTasks.length} active tasks, allocating ${availableHours} hours.`);
    const result = await ai.runScheduleAgent(activeTasks, Number(availableHours), Number(workStartHour));

    // Check if a schedule already exists for this date, and update or create
    const existingSchedule = db.findOne('schedules', { userId: req.user.id, date: targetDate });
    let finalSchedule;

    if (existingSchedule) {
      db.update('schedules', { id: existingSchedule.id }, {
        availableHours: Number(availableHours),
        allocation: result.allocation
      });
      finalSchedule = db.findOne('schedules', { id: existingSchedule.id });
    } else {
      finalSchedule = db.insert('schedules', {
        userId: req.user.id,
        date: targetDate,
        availableHours: Number(availableHours),
        allocation: result.allocation
      });
    }

    res.json(finalSchedule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate schedule: ' + err.message });
  }
});

module.exports = router;
