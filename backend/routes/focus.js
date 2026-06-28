const express = require('express');
const router = express.Router();
const db = require('../db/firestore');
const auth = require('../middleware/auth');

// Generate sprint parameters for a task
router.post('/sprint', auth, async (req, res) => {
  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required.' });
  }

  const task = await db.findOne('tasks', { id: taskId, userId: req.user.id });
  if (!task) {
    return res.status(404).json({ error: 'Task not found or unauthorized.' });
  }

  // AI-inspired session guidelines based on priority and risk
  let duration = 25; // Default Pomodoro
  let breakDuration = 5;
  let goal = `Outline key aspects of "${task.title}" and write down the core items.`;

  if (task.priorityScore >= 75 || task.riskScore >= 70) {
    duration = 50; // Deep work block
    breakDuration = 10;
    goal = `Execute critical, intensive deep work on "${task.title}". Avoid all distractions and complete key components.`;
  } else if (task.priorityScore >= 40) {
    duration = 30;
    breakDuration = 5;
    goal = `Draft intermediate progress milestones for "${task.title}". Check off active items.`;
  }

  // Contextualize goals based on task description
  if (task.description) {
    goal += ` Focus details: ${task.description.substring(0, 80)}...`;
  }

  res.json({
    taskId: task.id,
    taskTitle: task.title,
    goal,
    duration,
    breakDuration
  });
});

// Start a focus session (save to db)
router.post('/session', auth, async (req, res) => {
  const { taskId, goal, duration, breakDuration } = req.body;
  if (!taskId || !goal || !duration) {
    return res.status(400).json({ error: 'Please enter all required fields.' });
  }

  const task = await db.findOne('tasks', { id: taskId, userId: req.user.id });
  if (!task) {
    return res.status(404).json({ error: 'Task not found or unauthorized.' });
  }

  const newSession = await db.insert('focus_sessions', {
    userId: req.user.id,
    taskId,
    goal,
    duration: Number(duration),
    breakDuration: Number(breakDuration || 5),
    status: 'active'
  });

  res.status(201).json(newSession);
});

// Complete or abandon focus session
router.put('/session/:id', auth, async (req, res) => {
  const { status } = req.body; // 'completed' or 'abandoned'
  const sessionId = req.params.id;

  if (!status || !['completed', 'abandoned'].includes(status)) {
    return res.status(400).json({ error: 'Valid status ("completed" or "abandoned") is required.' });
  }

  const session = await db.findOne('focus_sessions', { id: sessionId, userId: req.user.id });
  if (!session) {
    return res.status(404).json({ error: 'Focus session record not found.' });
  }

  await db.update('focus_sessions', { id: sessionId }, { status });
  const updatedSession = await db.findOne('focus_sessions', { id: sessionId });

  // Add coach advice notification if completed
  if (status === 'completed') {
    const task = await db.findOne('tasks', { id: session.taskId });
    await db.insert('notifications', {
      userId: req.user.id,
      type: 'focus_reminder',
      message: `⚡ Focus Sprint completed! You spent ${session.duration} minutes on "${task ? task.title : 'Task'}". Great job!`,
      read: false
    });
  }

  res.json(updatedSession);
});

module.exports = router;
