// Mocks for Gemini Service to ensure tests run offline and deterministically

const runPriorityAgent = jest.fn().mockImplementation(async (task, userContextTasks = []) => {
  return {
    priorityScore: 75,
    explanation: 'Mocked priority explanation.'
  };
});

const runRiskAgent = jest.fn().mockImplementation(async (task) => {
  // We can make the risk score dependent on a property to test branching
  // For instance, if priorityLevel is "high", make riskScore 85, else 20
  if (task.priorityLevel === 'high') {
    return {
      riskScore: 85,
      riskLevel: 'High',
      riskExplanation: 'Mocked high risk explanation.'
    };
  }
  return {
    riskScore: 20,
    riskLevel: 'Low',
    riskExplanation: 'Mocked low risk explanation.'
  };
});

const runRecoveryAgent = jest.fn().mockImplementation(async (task, riskScore, riskExplanation) => {
  return {
    requiredDailyHours: 2.5,
    successProbability: 80,
    recoveryStrategy: 'Mocked recovery strategy.',
    extraWorkSessions: ['Mocked Extra Session 1', 'Mocked Extra Session 2'],
    actionSteps: ['Mocked Action 1', 'Mocked Action 2']
  };
});

const runScheduleAgent = jest.fn().mockImplementation(async (tasks, availableHours, workStartHour) => {
  return {
    allocation: [
      {
        timeSlot: '09:00 - 11:00',
        taskId: tasks.length > 0 ? tasks[0].id : 'mock_task_id',
        taskTitle: tasks.length > 0 ? tasks[0].title : 'Mock Title',
        activity: 'Mocked activity description.'
      }
    ]
  };
});

const runCoachAgent = jest.fn().mockImplementation(async (metrics, recentTasks) => {
  return {
    insights: ['Mocked Insight 1', 'Mocked Insight 2', 'Mocked Insight 3'],
    focusRecommendations: ['Mocked Recommendation 1', 'Mocked Recommendation 2'],
    habitTips: ['Mocked Habit Tip 1', 'Mocked Habit Tip 2']
  };
});

module.exports = {
  runPriorityAgent,
  runRiskAgent,
  runRecoveryAgent,
  runScheduleAgent,
  runCoachAgent
};
