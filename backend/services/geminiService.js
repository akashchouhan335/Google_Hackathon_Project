const { GoogleGenAI } = require('@google/generative-ai');
const config = require('../config');

// Initialize Gemini API if key is present
let genAI = null;
if (config.GEMINI_API_KEY) {
  try {
    // If the package uses GoogleGenAI or GoogleGenerativeAI
    // The standard package has: const { GoogleGenerativeAI } = require('@google/generative-ai');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    console.log('Gemini API client initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Gemini API client:', err.message);
  }
} else {
  console.log('No GEMINI_API_KEY found. Running in high-fidelity Mock AI fallback mode.');
}

/**
 * Call Gemini model with a structured prompt expecting JSON response
 */
async function callGemini(systemInstruction, userPrompt, fallbackFn) {
  if (!genAI) {
    return fallbackFn();
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const prompt = `
System Instructions:
${systemInstruction}

User Input Data:
${userPrompt}

Ensure your response is valid JSON matching the exact schema specified in instructions. Do not include markdown code block characters like \`\`\`json. Return only the JSON string.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Clean markdown wrappers if returned despite responseMimeType
    let cleanedText = text;
    if (text.startsWith('```')) {
      cleanedText = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(cleanedText);
  } catch (err) {
    console.warn('Gemini API call failed, falling back to Mock AI:', err.message);
    return fallbackFn();
  }
}

/**
 * 1. PRIORITY AGENT
 */
async function runPriorityAgent(task, userContextTasks = []) {
  const systemInstruction = `
You are the Priority Agent of Deadline Guardian AI.
Your job is to analyze a newly created or edited task and assign a Priority Score (1 to 100) and a detailed Explanation.
Consider:
- Urgency: proximity of the deadline.
- Estimated effort relative to the remaining time.
- Qualitative importance based on description.
- Workload: number of other pending tasks.

Response JSON Schema:
{
  "priorityScore": number (1-100),
  "explanation": string (2-3 sentences explaining the rating)
}
`;

  const userPrompt = JSON.stringify({
    newTask: {
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      priorityLevel: task.priorityLevel,
      estimatedHours: task.estimatedHours
    },
    existingPendingTasks: userContextTasks.map(t => ({
      title: t.title,
      deadline: t.deadline,
      estimatedHours: t.estimatedHours
    }))
  });

  const fallbackFn = () => {
    // Calculate heuristics
    const now = new Date();
    const deadlineDate = new Date(task.deadline);
    const msRemaining = deadlineDate - now;
    const hoursRemaining = Math.max(1, msRemaining / (1000 * 60 * 60));

    let score = 30; // base score
    if (task.priorityLevel === 'high') score += 30;
    if (task.priorityLevel === 'medium') score += 15;

    // Deadline urgency
    if (hoursRemaining < 24) {
      score += 35;
    } else if (hoursRemaining < 72) {
      score += 20;
    } else if (hoursRemaining < 168) {
      score += 10;
    }

    // Workload density
    const density = task.estimatedHours / hoursRemaining;
    if (density > 0.5) score += 15;

    score = Math.min(100, Math.max(1, Math.round(score)));

    let explanation = `The Priority Agent calculated a score of ${score}/100. `;
    if (hoursRemaining < 24) {
      explanation += `Urgent deadline detected (${Math.round(hoursRemaining)} hrs remaining). Immediate attention required.`;
    } else {
      explanation += `Based on the designated effort (${task.estimatedHours} hrs) and priority level (${task.priorityLevel}), this task requires moderate scheduling focus.`;
    }

    return { priorityScore: score, explanation };
  };

  return callGemini(systemInstruction, userPrompt, fallbackFn);
}

/**
 * 2. RISK AGENT
 */
async function runRiskAgent(task) {
  const systemInstruction = `
You are the Risk Agent of Deadline Guardian AI.
Your job is to analyze task parameters and predict the risk of missing the deadline.
Calculate remaining time vs estimated work.

Response JSON Schema:
{
  "riskScore": number (0-100),
  "riskLevel": "Low" | "Medium" | "High",
  "riskExplanation": string (2-3 sentences outlining the risk factors)
}
`;

  const userPrompt = JSON.stringify({
    title: task.title,
    deadline: task.deadline,
    estimatedHours: task.estimatedHours,
    status: task.status
  });

  const fallbackFn = () => {
    const now = new Date();
    const deadlineDate = new Date(task.deadline);
    const msRemaining = deadlineDate - now;
    const hoursRemaining = msRemaining / (1000 * 60 * 60);

    if (task.status === 'completed') {
      return {
        riskScore: 0,
        riskLevel: 'Low',
        riskExplanation: 'Task is already marked as completed. Risk resolved.'
      };
    }

    if (hoursRemaining <= 0) {
      return {
        riskScore: 100,
        riskLevel: 'High',
        riskExplanation: 'The deadline for this task has already passed. Immediate recovery required.'
      };
    }

    // Ratio of work hours to hours left (density)
    // If we have 10 hours of work and 20 hours left, density is 0.5
    const density = task.estimatedHours / hoursRemaining;
    let riskScore = 0;

    if (density >= 1.0) {
      riskScore = 90 + Math.min(9, Math.round((density - 1) * 10)); // extremely high risk
    } else if (density >= 0.5) {
      riskScore = 70 + Math.round((density - 0.5) * 40); // high risk
    } else if (density >= 0.2) {
      riskScore = 35 + Math.round((density - 0.2) * 115); // medium risk
    } else {
      riskScore = Math.round(density * 175); // low risk
    }

    riskScore = Math.min(99, Math.max(1, Math.round(riskScore)));
    
    let riskLevel = 'Low';
    if (riskScore >= 80) riskLevel = 'High';
    else if (riskScore >= 40) riskLevel = 'Medium';

    let riskExplanation = '';
    if (riskLevel === 'High') {
      riskExplanation = `High risk detected. You have only ${Math.round(hoursRemaining)} hours remaining to complete ${task.estimatedHours} hours of work. Required daily concentration is extremely high.`;
    } else if (riskLevel === 'Medium') {
      riskExplanation = `Moderate risk. Time-on-task is adequate if work begins shortly. Watch out for potential schedule conflicts.`;
    } else {
      riskExplanation = `Safe margin. Plenty of time remains (${Math.round(hoursRemaining)} hours left vs ${task.estimatedHours} hours required).`;
    }

    return { riskScore, riskLevel, riskExplanation };
  };

  return callGemini(systemInstruction, userPrompt, fallbackFn);
}

/**
 * 3. RECOVERY AGENT
 */
async function runRecoveryAgent(task, riskScore, riskExplanation) {
  const systemInstruction = `
You are the Recovery Agent of Deadline Guardian AI.
Your job is to construct a tactical recovery strategy (Deadline Rescue Plan) for an endangered task.
Calculate:
- requiredDailyHours: number of hours needed per day.
- successProbability: percentage chance of finishing on time if user follows the plan.
- recoveryStrategy: a general tactical description.
- extraWorkSessions: list of specific extra time blocks to schedule.
- actionSteps: list of 3-4 physical, action-oriented items the user should take immediately.

Response JSON Schema:
{
  "requiredDailyHours": number,
  "successProbability": number (0-100),
  "recoveryStrategy": string,
  "extraWorkSessions": [string],
  "actionSteps": [string]
}
`;

  const userPrompt = JSON.stringify({
    title: task.title,
    deadline: task.deadline,
    estimatedHours: task.estimatedHours,
    riskScore,
    riskExplanation
  });

  const fallbackFn = () => {
    const now = new Date();
    const deadlineDate = new Date(task.deadline);
    const daysRemaining = Math.max(0.5, (deadlineDate - now) / (1000 * 60 * 60 * 24));
    
    const requiredDailyHours = Math.round((task.estimatedHours / daysRemaining) * 10) / 10;
    
    // Probability decreases as risk increases
    let successProbability = Math.round(100 - riskScore * 0.7);
    successProbability = Math.min(95, Math.max(10, successProbability));

    const extraWorkSessions = [
      `Emergency session tomorrow morning (2.0 hours)`,
      `Evening catch-up block before deadline (1.5 hours)`
    ];

    const actionSteps = [
      `Silence mobile notifications and isolate workspace for deep work blocks.`,
      `Decompose "${task.title}" into three 45-minute focus intervals.`,
      `Deliver draft milestones to peers/clients early to lock down critical requirements.`,
      `Defer non-essential meetings and social obligations until after this deadline.`
    ];

    return {
      requiredDailyHours,
      successProbability,
      recoveryStrategy: `Deploy active distraction-free sprints immediately. Leverage pre-morning and post-dinner blocks to bypass daily operational overhead.`,
      extraWorkSessions,
      actionSteps
    };
  };

  return callGemini(systemInstruction, userPrompt, fallbackFn);
}

/**
 * 4. SCHEDULE AGENT
 */
async function runScheduleAgent(tasks, availableHours, workStartHour) {
  const systemInstruction = `
You are the Schedule Agent of Deadline Guardian AI.
Your job is to allocate task hours into a daily timeline structure starting at a specific workStartHour.
Tasks have title, estimatedHours, priorityScore, and riskScore.
Allocate blocks in chunks of 30, 60, or 90 minutes.

Response JSON Schema:
{
  "allocation": [
    {
      "timeSlot": "HH:MM - HH:MM",
      "taskId": string (id of task, or "break" or "buffer"),
      "taskTitle": string,
      "activity": string (what they should do during this slot)
    }
  ]
}
`;

  const userPrompt = JSON.stringify({
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      estimatedHours: t.estimatedHours,
      priorityScore: t.priorityScore,
      riskScore: t.riskScore
    })),
    availableHours,
    workStartHour
  });

  const fallbackFn = () => {
    // Greedy schedule allocation
    const allocation = [];
    let currentHour = workStartHour;
    
    // Sort tasks by priority score (descending)
    const sortedTasks = [...tasks].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    
    const padTime = (h) => {
      const hrs = Math.floor(h);
      const mins = Math.round((h - hrs) * 60);
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    let remainingHoursAvailable = availableHours;

    for (const task of sortedTasks) {
      if (remainingHoursAvailable <= 0) break;

      // Allocate task in up to 2-hour blocks
      const blockTime = Math.min(2, task.estimatedHours, remainingHoursAvailable);
      if (blockTime <= 0) continue;

      const startTimeStr = padTime(currentHour);
      currentHour += blockTime;
      const endTimeStr = padTime(currentHour);
      remainingHoursAvailable -= blockTime;

      allocation.push({
        timeSlot: `${startTimeStr} - ${endTimeStr}`,
        taskId: task.id,
        taskTitle: task.title,
        activity: `Focus deep work session: outline objectives, execute core code/writing blocks, and wrap up draft.`
      });

      // Add a short break if we have room
      if (remainingHoursAvailable > 0.25) {
        const breakStart = padTime(currentHour);
        currentHour += 0.25;
        const breakEnd = padTime(currentHour);
        remainingHoursAvailable -= 0.25;

        allocation.push({
          timeSlot: `${breakStart} - ${breakEnd}`,
          taskId: 'break',
          taskTitle: 'Mental Recharge',
          activity: 'Step away from screens. Hydrate, do light stretching, or take a brief walk.'
        });
      }
    }

    // Fill remaining hours with buffer
    if (remainingHoursAvailable > 0) {
      const bufferStart = padTime(currentHour);
      currentHour += remainingHoursAvailable;
      const bufferEnd = padTime(currentHour);
      
      allocation.push({
        timeSlot: `${bufferStart} - ${bufferEnd}`,
        taskId: 'buffer',
        taskTitle: 'Administrative Buffer & Catch-up',
        activity: 'Process pending notifications, plan tomorrow\'s sprint milestones, or continue overdue tasks.'
      });
    }

    return { allocation };
  };

  return callGemini(systemInstruction, userPrompt, fallbackFn);
}

/**
 * 5. PRODUCTIVITY COACH AGENT
 */
async function runCoachAgent(metrics, recentTasks) {
  const systemInstruction = `
You are the Productivity Coach Agent of Deadline Guardian AI.
Your job is to analyze user behavior metrics (completion rates, focus consistency, rescue success rates) and recent tasks to provide coaching insights.

Response JSON Schema:
{
  "insights": [string], (3 insights highlighting observations)
  "focusRecommendations": [string], (2-3 suggestions for focus improvements)
  "habitTips": [string] (2-3 actionable habit building routines)
}
`;

  const userPrompt = JSON.stringify({
    metrics,
    recentTasks: recentTasks.map(t => ({
      title: t.title,
      status: t.status,
      riskLevel: t.riskLevel,
      priorityScore: t.priorityScore
    }))
  });

  const fallbackFn = () => {
    let focusConsistency = metrics.focusConsistency || 0;
    let rescueSuccessRate = metrics.rescueSuccessRate || 0;

    let insights = [
      `Your current focus sprint consistency is sitting at ${focusConsistency}%. You perform exceptionally well during morning blocks.`,
      `Active Rescue Operations: ${metrics.activeRescues || 0} tasks are currently in critical danger, demanding tight boundary management.`,
      `Task velocity is strong: you completed ${metrics.completedTasks || 0} tasks over the recent timeframe.`
    ];

    let focusRecommendations = [
      `Start work with a single 25-minute Pomodoro style Focus Sprint for your highest priority task to build momentum.`,
      `Set up your daily planner calendar early in the morning so you don't exhaust decision energy on 'what to do next'.`
    ];

    let habitTips = [
      `Implement the 2-Minute Rule: if a task checkoff or update takes less than two minutes, complete it immediately.`,
      `Perform a Sunday Evening Reset: Spend 10 minutes reviewing deadlines for the upcoming week and scheduling buffer blocks.`
    ];

    if (focusConsistency < 60) {
      focusRecommendations.unshift(`Your focus completion rate is low. Try shortening sprint durations from 50 minutes down to 25 minutes to increase completion success.`);
    }
    if (rescueSuccessRate < 50 && metrics.totalRescues > 0) {
      insights.push(`Your rescue resolution success rate is ${rescueSuccessRate}%. This suggests estimated task hours are under-budgeted during initial planning stages.`);
    }

    return { insights, focusRecommendations, habitTips };
  };

  return callGemini(systemInstruction, userPrompt, fallbackFn);
}

module.exports = {
  runPriorityAgent,
  runRiskAgent,
  runRecoveryAgent,
  runScheduleAgent,
  runCoachAgent
};
