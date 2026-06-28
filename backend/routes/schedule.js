const express = require('express');
const router = express.Router();
const db = require('../db/firestore');
const auth = require('../middleware/auth');
const ai = require('../services/geminiService');

// Get active schedule for a date
router.get('/', auth, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const schedule = await db.findOne('schedules', { userId: req.user.id, date });
  
  if (!schedule) {
    return res.json({ date, allocation: [] });
  }

  // Get active tasks (pending or in progress)
  const activeTasks = (await db.find('tasks', { userId: req.user.id }))
    .filter(t => t.status === 'pending' || t.status === 'in_progress');

  if (activeTasks.length === 0) {
    // If no active tasks exist, clear the schedule allocations
    if (Array.isArray(schedule.allocation) && schedule.allocation.length > 0) {
      await db.update('schedules', { id: schedule.id }, { allocation: [] });
      schedule.allocation = [];
    }
    return res.json(schedule);
  }

  // Check if any slot is allocated to a completed or non-existent task
  let modified = false;
  const sortedTasks = [...activeTasks].sort((a, b) => {
    const levelMap = { 'high': 3, 'medium': 2, 'low': 1 };
    const aLevel = levelMap[a.priorityLevel] || 0;
    const bLevel = levelMap[b.priorityLevel] || 0;
    if (bLevel !== aLevel) return bLevel - aLevel;
    return new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime();
  });
  
  // Track tasks already in the schedule so we don't duplicate them
  const assignedTaskIds = new Set((schedule.allocation || []).map(s => s.taskId));

  const sanitizedAllocation = await Promise.all((schedule.allocation || []).map(async slot => {
    if (slot.taskId !== 'break' && slot.taskId !== 'buffer') {
      const task = await db.findOne('tasks', { id: slot.taskId, userId: req.user.id });
      if (!task || task.status === 'completed') {
        modified = true;
        // Replace with the next available active task that isn't already scheduled
        const nextTask = sortedTasks.find(t => !assignedTaskIds.has(t.id));
        if (nextTask) {
          assignedTaskIds.add(nextTask.id);
          return {
            ...slot,
            taskId: nextTask.id,
            taskTitle: nextTask.title,
            activity: `Focus deep work session on next priority task: ${nextTask.title}`
          };
        } else {
          return {
            ...slot,
            taskId: 'buffer',
            taskTitle: 'Catch-up / Review',
            activity: 'Review progress and plan next steps.'
          };
        }
      }
    }
    return slot;
  }));

  if (modified) {
    await db.update('schedules', { id: schedule.id }, { allocation: sanitizedAllocation });
    schedule.allocation = sanitizedAllocation;
  }

  res.json(schedule);
});

// Generate a new schedule using the Schedule Agent
router.post('/generate', auth, async (req, res) => {
  const { availableHours, date, startTime } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  if (!availableHours || Number(availableHours) <= 0) {
    return res.status(400).json({ error: 'Please specify positive available study/work hours.' });
  }

  try {
    const user = await db.findOne('users', { id: req.user.id });
    
    let workStartHour = user && user.settings ? user.settings.workStartHour : 9;
    if (startTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      workStartHour = startH + (startM / 60);
    }

    // Get active tasks (pending or in progress) and sort by priority
    const activeTasks = (await db.find('tasks', { userId: req.user.id }))
      .filter(t => t.status === 'pending' || t.status === 'in_progress')
      .sort((a, b) => {
        const levelMap = { 'high': 3, 'medium': 2, 'low': 1 };
        const aLevel = levelMap[a.priorityLevel] || 0;
        const bLevel = levelMap[b.priorityLevel] || 0;
        if (bLevel !== aLevel) return bLevel - aLevel;
        return new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime();
      });

    if (activeTasks.length === 0) {
      return res.status(400).json({ error: 'You have no pending tasks to schedule. Create some tasks first!' });
    }

    // Mark schedule as generating
    let existingSchedule = await db.findOne('schedules', { userId: req.user.id, date: targetDate });
    if (existingSchedule) {
      await db.update('schedules', { id: existingSchedule.id }, { isGenerating: true });
    } else {
      existingSchedule = await db.insert('schedules', {
        userId: req.user.id,
        date: targetDate,
        availableHours: Number(availableHours),
        allocation: [],
        isGenerating: true
      });
    }

    // Return immediately to frontend
    const tempSchedule = await db.findOne('schedules', { id: existingSchedule.id });
    res.status(202).json(tempSchedule);

    // Run AI in background
    console.log(`[Background] Running Schedule Agent for ${activeTasks.length} active tasks...`);
    ai.runScheduleAgent(activeTasks, Number(availableHours), Number(workStartHour))
      .then(async result => {
        const allocation = (result && Array.isArray(result.allocation)) ? result.allocation : [];
        await db.update('schedules', { id: existingSchedule.id }, {
          availableHours: Number(availableHours),
          allocation,
          isGenerating: false
        });
        console.log(`[Background] Schedule Agent finished successfully.`);
      })
      .catch(async err => {
        console.error("[Background] Schedule Agent failed:", err);
        await db.update('schedules', { id: existingSchedule.id }, { isGenerating: false });
      });

  } catch (err) {
    res.status(500).json({ error: 'Failed to generate schedule: ' + err.message });
  }
});

module.exports = router;
