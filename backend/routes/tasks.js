const express = require('express');
const router = express.Router();
const db = require('../db/firestore');
const auth = require('../middleware/auth');
const ai = require('../services/geminiService');
const { regenerateTodaySchedule } = require('../services/scheduleHelper');

// Get all tasks for user
router.get('/', auth, async (req, res) => {
  const tasks = await db.find('tasks', { userId: req.user.id });
  
  // Sort tasks: pending/in_progress first, then by priority Score descending, then deadline ascending
  const sorted = tasks.sort((a, b) => {
    const statusOrder = { 'in_progress': 0, 'pending': 1, 'completed': 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    const levelMap = { 'high': 3, 'medium': 2, 'low': 1 };
    const aLevel = levelMap[a.priorityLevel] || 0;
    const bLevel = levelMap[b.priorityLevel] || 0;
    if (bLevel !== aLevel) return bLevel - aLevel;
    return new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime();
  });
  
  res.json(sorted);
});

// Get single task for user
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await db.findOne('tasks', { id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch task: ' + err.message });
  }
});


// Helper function to process AI Agents on a task
async function runTaskAgentCascade(task, userId) {
  // 1. Get user context (existing pending tasks) for priority comparison
  const userTasks = (await db.find('tasks', { userId, status: 'pending' })).filter(t => t.id !== task.id);
  
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
    const existingRescue = await db.findOne('rescue_modes', { taskId: task.id, status: 'active' });
    if (!existingRescue) {
      await db.insert('rescue_modes', {
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
      await db.insert('notifications', {
        userId,
        type: 'rescue_activated',
        message: `🚨 Deadline Rescue Activated for "${task.title}"! High risk of missing deadline (${riskResult.riskScore}%). Recovery plan generated.`,
        read: false
      });
    } else {
      // Update existing active rescue plan
      await db.update('rescue_modes', { id: existingRescue.id }, {
        requiredDailyHours: recoveryResult.requiredDailyHours,
        successProbability: recoveryResult.successProbability,
        recoveryStrategy: recoveryResult.recoveryStrategy,
        extraWorkSessions: recoveryResult.extraWorkSessions
      });
    }
  } else {
    // If risk drops below 80% or task is completed, resolve active rescue mode if any
    const activeRescue = await db.findOne('rescue_modes', { taskId: task.id, status: 'active' });
    if (activeRescue) {
      const newStatus = task.status === 'completed' ? 'resolved_success' : 'resolved_failed';
      await db.update('rescue_modes', { id: activeRescue.id }, {
        status: newStatus,
        resolvedAt: new Date().toISOString()
      });

      if (task.status === 'completed') {
        await db.insert('notifications', {
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
    const initialTask = await db.insert('tasks', {
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
      riskExplanation: 'Analyzing...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Auto-regenerate today's schedule to include the new task (in background)
    regenerateTodaySchedule(req.user.id).catch(err => console.error("Background schedule generation error:", err.message));
    
    // Run agents cascade in background
    runTaskAgentCascade(initialTask, req.user.id)
      .then(async aiUpdates => {
        await db.update('tasks', { id: initialTask.id }, { ...aiUpdates, updatedAt: new Date().toISOString() });
        regenerateTodaySchedule(req.user.id).catch(err => console.error("Background schedule generation error:", err.message));
      })
      .catch(err => console.error("Background AI cascade error:", err.message));
    
    // Return immediately to keep UI responsive
    res.status(201).json(initialTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task: ' + err.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, deadline, estimatedHours, priorityLevel, status } = req.body;
    const taskId = req.params.id;

    const task = await db.findOne('tasks', { id: taskId, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    const updates = {
      title: title !== undefined ? title : task.title,
      description: description !== undefined ? description : task.description,
      deadline: deadline !== undefined ? deadline : task.deadline,
      estimatedHours: estimatedHours !== undefined ? Number(estimatedHours) : task.estimatedHours,
      priorityLevel: priorityLevel !== undefined ? priorityLevel : task.priorityLevel,
      status: status !== undefined ? status : task.status,
      updatedAt: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    // Update values first
    await db.update('tasks', { id: taskId }, updates);
    const updatedTask = await db.findOne('tasks', { id: taskId });

    // Return immediately to keep UI responsive
    res.json(updatedTask);

    // Run AI Agent Cascade to recompute risk & priority unless completed (in background)
    runTaskAgentCascade(updatedTask, req.user.id)
      .then(async aiUpdates => {
        await db.update('tasks', { id: updatedTask.id }, aiUpdates);
        
        // Generate notifications for manual completion
        if (status === 'completed' && task.status !== 'completed') {
          await db.insert('notifications', {
            userId: req.user.id,
            type: 'focus_reminder',
            message: `✅ Completed: "${updatedTask.title}" has been checked off.`,
            read: false
          });
        }
        
        regenerateTodaySchedule(req.user.id).catch(err => console.error("Background schedule error:", err.message));
      })
      .catch(err => console.error("Background AI cascade error:", err.message));

  } catch (err) {
    res.status(500).json({ error: 'Failed to update task: ' + err.message });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await db.findOne('tasks', { id: taskId, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    // Remove related active rescue modes
    await db.remove('rescue_modes', { taskId, userId: req.user.id });
    // Remove related focus sessions
    await db.remove('focus_sessions', { taskId, userId: req.user.id });
    
    // Delete the task itself
    await db.remove('tasks', { id: taskId });
    
    res.json({ message: 'Task deleted successfully' });
    
    // Auto-regenerate today's schedule
    regenerateTodaySchedule(req.user.id).catch(err => console.error("Background schedule error:", err.message));
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task: ' + err.message });
  }
});

module.exports = router;
