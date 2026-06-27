const { 
  runPriorityAgent, 
  runRiskAgent, 
  runRecoveryAgent, 
  runScheduleAgent, 
  runCoachAgent 
} = require('../services/geminiService');

// Do NOT mock geminiService here. We want to test the actual fallback heuristics of the service.
// In the test environment, GEMINI_API_KEY is not set, so genAI is null and the fallback functions run.

describe('AI Agents Unit Tests', () => {
  const baseTask = {
    id: 'test-id',
    title: 'Test Task',
    description: 'Test description',
    estimatedHours: 5,
    priorityLevel: 'medium',
    status: 'pending'
  };

  it('Priority Agent calculates correct priority based on urgency and workload', async () => {
    // Deadline in 20 hours (urgent)
    const task = { ...baseTask, deadline: new Date(Date.now() + 20 * 3600000).toISOString() };
    const result = await runPriorityAgent(task, []);
    
    // Base 30 + medium 15 + urgent 35 = 80
    // Density = 5 / 20 = 0.25 (no density bonus)
    expect(result.priorityScore).toBe(80);
    expect(result.explanation).toMatch(/Urgent deadline detected/);
  });

  it('Risk Agent calculates risk accurately based on density', async () => {
    // 5 hours estimated, 10 hours remaining -> density 0.5
    const task = { ...baseTask, deadline: new Date(Date.now() + 10 * 3600000).toISOString() };
    const result = await runRiskAgent(task);

    // density 0.5 -> 70 + (0.5 - 0.5)*40 = 70
    expect(result.riskScore).toBe(70);
    expect(result.riskLevel).toBe('Medium');
  });

  it('Risk Agent handles passed deadlines', async () => {
    const task = { ...baseTask, deadline: new Date(Date.now() - 3600000).toISOString() };
    const result = await runRiskAgent(task);

    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe('High');
  });

  it('Recovery Agent constructs recovery strategy', async () => {
    // Deadline in 2 days (48 hrs)
    const task = { ...baseTask, deadline: new Date(Date.now() + 48 * 3600000).toISOString() };
    const riskScore = 85;
    const riskExplanation = 'High risk';

    const result = await runRecoveryAgent(task, riskScore, riskExplanation);
    
    // requiredDailyHours = 5 hours / 2 days = 2.5
    expect(result.requiredDailyHours).toBe(2.5);
    // success = 100 - (85 * 0.7) = 40.5 -> 41
    expect(result.successProbability).toBe(41);
    expect(result.recoveryStrategy).toBeDefined();
    expect(result.extraWorkSessions.length).toBeGreaterThan(0);
    expect(result.actionSteps.length).toBeGreaterThan(0);
  });

  it('Schedule Agent allocates tasks correctly', async () => {
    const tasks = [
      { ...baseTask, id: 't1', estimatedHours: 3, priorityScore: 90 },
      { ...baseTask, id: 't2', estimatedHours: 2, priorityScore: 50 }
    ];
    
    const availableHours = 4;
    const workStartHour = 9;

    const result = await runScheduleAgent(tasks, availableHours, workStartHour);
    const alloc = result.allocation;

    // t1 takes 2 hours (max block), then 0.25 break, then t1 takes remaining 1 hour...
    expect(alloc.length).toBeGreaterThan(1);
    expect(alloc[0].taskId).toBe('t1');
    expect(alloc[0].timeSlot).toMatch(/^09:00 - 11:00/);
    
    // Total time shouldn't exceed availableHours (4)
    let totalTime = 0;
    alloc.forEach(a => {
      const [start, end] = a.timeSlot.split(' - ');
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      totalTime += (eh + em/60) - (sh + sm/60);
    });
    expect(Math.abs(totalTime - availableHours)).toBeLessThan(0.01);
  });

  it('Coach Agent provides insights based on metrics', async () => {
    const metrics = { focusConsistency: 40, rescueSuccessRate: 30, activeRescues: 2, totalRescues: 5, completedTasks: 10 };
    const recentTasks = [];

    const result = await runCoachAgent(metrics, recentTasks);
    
    expect(result.insights.length).toBeGreaterThanOrEqual(3);
    expect(result.focusRecommendations.length).toBeGreaterThanOrEqual(2);
    expect(result.habitTips.length).toBeGreaterThanOrEqual(2);
    
    // 40 consistency < 60, should have a specific recommendation
    expect(result.focusRecommendations.some(r => r.includes('shortening sprint durations'))).toBe(true);
    
    // 30 success < 50, should have a specific insight
    expect(result.insights.some(i => i.includes('under-budgeted'))).toBe(true);
  });
});
