const express = require('express');
const router = express.Router();
const db = require('../db/firestore');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  
  const [tasks, focusSessions, rescueModes] = await Promise.all([
    db.find('tasks', { userId }),
    db.find('focus_sessions', { userId }),
    db.find('rescue_modes', { userId })
  ]);
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'incomplete');
  const missedTasks = tasks.filter(t => t.status === 'incomplete');
  
  // High risk tasks (risk >= 80 and not completed)
  const highRiskTasks = pendingTasks.filter(t => t.riskScore >= 80);

  // 1. Focus Consistency Score: (completed / total started) * 100
  const startedSessions = focusSessions.filter(s => s.status !== 'active'); // completed or abandoned
  const completedSessions = startedSessions.filter(s => s.status === 'completed');
  const focusConsistency = startedSessions.length > 0
    ? Math.round((completedSessions.length / startedSessions.length) * 100)
    : 100;

  // 2. Rescue Success Rate: (resolved_success / total resolved) * 100
  const resolvedRescues = rescueModes.filter(r => r.status !== 'active');
  const successfulRescues = resolvedRescues.filter(r => r.status === 'resolved_success');
  const rescueSuccessRate = resolvedRescues.length > 0
    ? Math.round((successfulRescues.length / resolvedRescues.length) * 100)
    : 100; // Default 100 if none resolved yet

  // 3. Deadline Completion Rate: (tasks completed before deadline / total completed) * 100
  const onTimeCompletions = completedTasks.filter(t => {
    const deadline = new Date(t.deadline);
    const completedAt = new Date(t.updatedAt); // updatedAt acts as completion time when completed
    return completedAt <= deadline;
  });
  const deadlineCompletionRate = completedTasks.length > 0
    ? Math.round((onTimeCompletions.length / completedTasks.length) * 100)
    : 100;

  // 4. Productivity Score: Combined weight
  // If no sessions or completed tasks, set a default base score of 70
  let productivityScore = 70;
  if (totalTasks > 0) {
    const completionWeight = (completedTasks.length / totalTasks) * 40; // max 40 points
    const onTimeWeight = (deadlineCompletionRate / 100) * 30; // max 30 points
    const focusWeight = (focusConsistency / 100) * 30; // max 30 points
    productivityScore = Math.round(completionWeight + onTimeWeight + focusWeight);
  }
  productivityScore = Math.min(100, Math.max(10, productivityScore));

  // Risk Distribution
  const riskDistribution = {
    low: pendingTasks.filter(t => t.riskLevel === 'Low').length,
    medium: pendingTasks.filter(t => t.riskLevel === 'Medium').length,
    high: highRiskTasks.length
  };

  // Generate 7-day historical trend charts
  const completionTrend = [];
  const productivityTrend = [];
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = days[d.getDay()];

    // Count tasks completed on this date
    const completedOnDate = completedTasks.filter(t => {
      if (!t.updatedAt && !t.createdAt) return false;
      const dateToUse = t.updatedAt || t.createdAt;
      const completionDateStr = new Date(dateToUse).toISOString().split('T')[0];
      return completionDateStr === dateStr;
    }).length;

    completionTrend.push({
      label: dayName,
      value: completedOnDate
    });

    // Mock slightly fluctuating daily productivity score for graph visualization
    const dailyFluctuation = Math.sin(i) * 5;
    const computedProdScore = Math.min(100, Math.max(20, Math.round(productivityScore - dailyFluctuation)));
    productivityTrend.push({
      label: dayName,
      value: computedProdScore
    });
  }

  res.json({
    summary: {
      totalTasks,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      missedTasks: missedTasks.length,
      highRiskTasks: highRiskTasks.length,
      productivityScore,
      focusConsistency,
      rescueSuccessRate,
      deadlineCompletionRate
    },
    charts: {
      completionTrend,
      productivityTrend,
      riskDistribution
    }
  });
});

module.exports = router;
