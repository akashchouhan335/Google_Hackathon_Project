const express = require('express');
const router = express.Router();
const db = require('../db/firestore');
const auth = require('../middleware/auth');
const ai = require('../services/geminiService');

router.get('/insights', auth, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 1. Gather metrics
    const tasks = await db.find('tasks', { userId });
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    const rescueModes = await db.find('rescue_modes', { userId });
    const activeRescues = rescueModes.filter(r => r.status === 'active').length;
    const resolvedRescues = rescueModes.filter(r => r.status !== 'active');
    const successfulRescues = resolvedRescues.filter(r => r.status === 'resolved_success');
    
    const focusSessions = await db.find('focus_sessions', { userId });
    const startedSessions = focusSessions.filter(s => s.status !== 'active');
    const completedSessions = startedSessions.filter(s => s.status === 'completed');

    const focusConsistency = startedSessions.length > 0
      ? Math.round((completedSessions.length / startedSessions.length) * 100)
      : 100;

    const rescueSuccessRate = resolvedRescues.length > 0
      ? Math.round((successfulRescues.length / resolvedRescues.length) * 100)
      : 100;

    const metrics = {
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      activeRescues,
      totalRescues: rescueModes.length,
      rescueSuccessRate,
      focusConsistency
    };

    // 2. Fetch recent tasks for context
    const recentTasks = tasks.slice(-5); // Get last 5 tasks

    // 3. Call Coach Agent
    console.log('Running Productivity Coach Agent...');
    const coachResult = await ai.runCoachAgent(metrics, recentTasks);

    // Save insight snapshot to DB (optional, but tracks history)
    await db.insert('coach_insights', {
      userId,
      insights: coachResult.insights,
      focusRecommendations: coachResult.focusRecommendations,
      habitTips: coachResult.habitTips,
      generatedAt: new Date().toISOString()
    });

    res.json(coachResult);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate coach insights: ' + err.message });
  }
});

module.exports = router;
