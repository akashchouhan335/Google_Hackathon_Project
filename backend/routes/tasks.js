const express = require('express');
const router = express.Router();
const db = require('../db/jsonDb');
const auth = require('../middleware/auth');
const ai = require('../services/geminiService');
const { updateSchedulesOnTaskCompletion } = require('../services/scheduleHelper');

// Get all tasks for user
router.get('/', auth, (req, res) => {
  const tasks = db.find('tasks', { userId: req.user.id });
  
  // Sort tasks: pending/in_progress first, then by priorityScore descending
  const sorted = tasks.sort((a, b) => {
    const statusOrder = { 'in_progress': 0, 'pending': 1, 'completed': 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return (b.priorityScore || 0) - (a.priorityScore || 0);
  });
  
  res.json(sorted);
});

// Helper function to process AI Agents on a task
async function runTaskAgentCascade(task, userId) {
  // 1. Get user context (existing pending tasks) for priority comparison
  const userTasks = db.find('tasks', { userId, status: 'pending' }).filter(t => t.id !== task.id);
  
  // 2. Run Priority Agent
  console.log(`Running Priority Agent for task: "${task.title}"`);
  const priorityResult = await ai.runPriorityAgent(task, userTasks);
  
  // 3. Run Risk Agent
  console.log(`Running Risk Agent for task: "${task.title}"`);
  const riskResult = await ai.runRiskAgent({
    ...task,
    priorityScore: priorityResult.priorityScore
  });

  let rescueData = null;
  let finalRecoveryPlan = null;

  // 4. Run Recovery Agent if Risk is High (>= 80%) and task is not completed
  if (riskResult.riskScore >= 80 && task.status !== 'completed') {
    console.log(`[ALERT] Risk is high (${riskResult.riskScore}%). Activating Recovery Agent for: "${task.title}"`);
    const recoveryResult = await ai.runRecoveryAgent(task, riskResult.riskScore, riskResult.riskExplanation);
    
    finalRecoveryPlan = {
      strategy: recoveryResult.recoveryStrategy,
      extraSessions: recoveryResult.extraWorkSessions,
      actionSteps: recoveryResult.actionSteps
    };

    // Upsert Rescue Mode record
    const existingRescue = db.findOne('rescue_modes', { taskId: task.id, status: 'active' });
    if (!existingRescue) {
      db.insert('rescue_modes', {
        userId,
        taskId: task.id,
        status: 'active',
        requiredDailyHours: recoveryResult.requiredDailyHours,
        successProbability: recoveryResult.successProbability,
        recoveryStrategy: recoveryResult.recoveryStrategy,
        extraWorkSessions: recoveryResult.extraWorkSessions,
        activatedAt: new Date().toISOString()
      });

      // Create notification
      db.insert('notifications', {
        userId,
        type: 'rescue_activated',
        message: `🚨 Deadline Rescue Activated for "${task.title}"! High risk of missing deadline (${riskResult.riskScore}%). Recovery plan generated.`,
        read: false
      });
    } else {
      // Update existing active rescue plan
      db.update('rescue_modes', { id: existingRescue.id }, {
        requiredDailyHours: recoveryResult.requiredDailyHours,
        successProbability: recoveryResult.successProbability,
        recoveryStrategy: recoveryResult.recoveryStrategy,
        extraWorkSessions: recoveryResult.extraWorkSessions
      });
    }
  } else {
    // If risk drops below 80% or task is completed, resolve active rescue mode if any
    const activeRescue = db.findOne('rescue_modes', { taskId: task.id, status: 'active' });
    if (activeRescue) {
      const newStatus = task.status === 'completed' ? 'resolved_success' : 'resolved_failed';
      db.update('rescue_modes', { id: activeRescue.id }, {
        status: newStatus,
        resolvedAt: new Date().toISOString()
      });

      if (task.status === 'completed') {
        db.insert('notifications', {
          userId,
          type: 'deadline_alert',
          message: `🎉 Rescue Mission Successful! You completed "${task.title}" before the deadline.`,
          read: false
        });
      }
    }
  }

  // Return combined AI values
  return {
    priorityScore: priorityResult.priorityScore,
    priorityExplanation: priorityResult.explanation,
    riskScore: riskResult.riskScore,
    riskLevel: riskResult.riskLevel,
    riskExplanation: riskResult.riskExplanation,
    recoveryPlan: finalRecoveryPlan
  };
}

// Create task
router.post('/', auth, async (req, res) => {
  const { title, description, deadline, estimatedHours, priorityLevel } = req.body;
  
  if (!title || !deadline || !priorityLevel) {
    return res.status(400).json({ error: 'Please enter all required fields.' });
  }

  try {
    // Insert temporary task
    const initialTask = db.insert('tasks', {
      userId: req.user.id,
      title,
      description: description || '',
      deadline,
      estimatedHours: (estimatedHours !== undefined && estimatedHours !== '') ? Number(estimatedHours) : 2,
      priorityLevel,
      status: 'pending',
      priorityScore: 50, // placeholders until AI completes
      priorityExplanation: 'Analyzing...',
      riskScore: 0,
      riskLevel: 'Low',
      riskExplanation: 'Analyzing...'
    });

    // Run agents cascade
    const aiUpdates = await runTaskAgentCascade(initialTask, req.user.id);
    
    // Update task with AI results
    db.update('tasks', { id: initialTask.id }, aiUpdates);
    
    const finalTask = db.findOne('tasks', { id: initialTask.id });
    res.status(201).json(finalTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task with AI cascade: ' + err.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  const { title, description, deadline, estimatedHours, priorityLevel, status } = req.body;
  const taskId = req.params.id;

  const task = db.findOne('tasks', { id: taskId, userId: req.user.id });
  if (!task) {
    return res.status(404).json({ error: 'Task not found or unauthorized.' });
  }

  try {
    const updates = {
      title: title !== undefined ? title : task.title,
      description: description !== undefined ? description : task.description,
      deadline: deadline !== undefined ? deadline : task.deadline,
      estimatedHours: estimatedHours !== undefined ? Number(estimatedHours) : task.estimatedHours,
      priorityLevel: priorityLevel !== undefined ? priorityLevel : task.priorityLevel,
      status: status !== undefined ? status : task.status
    };

    // Update values first
    db.update('tasks', { id: taskId }, updates);
    const updatedTask = db.findOne('tasks', { id: taskId });

    // Run AI Agent Cascade to recompute risk & priority unless completed
    const aiUpdates = await runTaskAgentCascade(updatedTask, req.user.id);
    
    db.update('tasks', { id: taskId }, aiUpdates);
    const finalTask = db.findOne('tasks', { id: taskId });

    // Generate notifications for manual completion
    if (status === 'completed' && task.status !== 'completed') {
      db.insert('notifications', {
        userId: req.user.id,
        type: 'focus_reminder',
        message: `✅ Completed: "${finalTask.title}" has been checked off.`,
        read: false
      });
      // Update schedules to replace the completed task with the next priority task
      updateSchedulesOnTaskCompletion(req.user.id, taskId);
    }

    res.json(finalTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task: ' + err.message });
  }
});

// Delete task
router.delete('/:id', auth, (req, res) => {
  const taskId = req.params.id;
  const task = db.findOne('tasks', { id: taskId, userId: req.user.id });
  if (!task) {
    return res.status(404).json({ error: 'Task not found or unauthorized.' });
  }

  // Remove related active rescue modes
  db.delete('rescue_modes', { taskId, userId: req.user.id });
  // Remove related focus sessions
  db.delete('focus_sessions', { taskId, userId: req.user.id });
  
  // Reallocate task slots in schedules first
  updateSchedulesOnTaskCompletion(req.user.id, taskId);

  // Delete the task itself
  db.delete('tasks', { id: taskId });
  res.json({ success: true, message: 'Task deleted successfully.' });
});

module.exports = router;
