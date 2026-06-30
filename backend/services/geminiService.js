const config = require('../config');

// Initialize Gemini API if key is present
let genAI = null;
if (config.GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    console.log('Gemini API client initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Gemini API client:', err.message);
  }
} else {
  console.log('No GEMINI_API_KEY found. Running in high-fidelity Mock AI fallback mode.');
}

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 4500; // 4.5 seconds between API requests to stay under free tier (15 RPM)

async function waitIfNeeded() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    const delay = MIN_REQUEST_INTERVAL_MS - timeSinceLast;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
}

let circuitBreakerTrippedUntil = 0;

/**
 * Call Gemini model with a structured prompt expecting JSON response
 */
async function callGemini(systemInstruction, userPrompt, fallbackFn) {
  if (Date.now() < circuitBreakerTrippedUntil) {
    const remainingMins = Math.ceil((circuitBreakerTrippedUntil - Date.now()) / 60000);
    console.warn(`[Gemini API] Circuit breaker is active for ~${remainingMins} more min(s). Falling back to Mock AI instantly.`);
    return fallbackFn();
  }

  if (!genAI) {
    return fallbackFn();
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      // Ensure minimum interval between requests
      await waitIfNeeded();

      const model = genAI.getGenerativeModel({
        model: config.GEMINI_MODEL || 'gemini-2.5-flash',
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
      const isQuotaExhausted = err.message.includes('Quota exceeded') || (err.message.includes('429 Too Many Requests') && err.message.includes('generativelanguage'));
      
      if (isQuotaExhausted) {
        console.warn(`[Gemini API] Quota Exceeded detected! Tripping circuit breaker for 15 minutes.`);
        circuitBreakerTrippedUntil = Date.now() + 15 * 60 * 1000;
        break; // Stop retrying immediately
      }

      const isRateLimit = err.message.includes('429') || err.message.includes('Quota exceeded') || err.message.includes('Too Many Requests');
      
      if (isRateLimit && attempt < maxRetries) {
        // Try to parse wait time from error message, e.g. "Please retry in 28.286136477s."
        let waitMs = Math.pow(2, attempt) * 2000; // Default exponential backoff (4s, 8s, etc.)
        const match = err.message.match(/retry in ([\d.]+)\s*s/i);
        if (match && match[1]) {
          waitMs = Math.ceil(parseFloat(match[1]) * 1000) + 500; // Add 500ms safety buffer
        }
        
        console.warn(`[Gemini API] Rate limit hit (429). Retrying in ${Math.round(waitMs / 1000)}s... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      console.warn(`[Gemini API] Call failed (Attempt ${attempt}/${maxRetries}):`, err.message);
      break;
    }
  }

  console.warn('[Gemini API] Falling back to Mock AI.');
  return fallbackFn();
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
Your job is to allocate task hours into a daily timeline structure.
Tasks have title, estimatedHours, priorityLevel, priorityScore, riskScore, and deadline.
Allocate blocks in chunks of 30, 60, or 90 minutes.

IMPORTANT: You MUST start the very first time slot at the EXACT \`workStartTime\` provided in the JSON.
IMPORTANT: You MUST schedule the first task to begin EXACTLY at the \`workStartTime\` without any delay. Do NOT shift the start time later.
IMPORTANT: You MUST schedule tasks sequentially and contiguously. Do NOT leave any unexplained gaps in time.
IMPORTANT: You MUST arrange and schedule the tasks strictly according to a combination of their priorityLevel (High > Medium > Low) and their deadline date (earliest first).
IMPORTANT: Only schedule buffer or catch-up slots ("taskId": "buffer") if there are tasks with high riskScore (>= 80) or if a task is overdue. If all tasks are low/medium risk and not overdue, do NOT schedule any buffer slots; let the timeline end once all tasks and breaks are scheduled.

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
      priorityLevel: t.priorityLevel,
      priorityScore: t.priorityScore,
      riskScore: t.riskScore,
      deadline: t.deadline
    })),
    availableHours,
    workStartTime: `${Math.floor(workStartHour).toString().padStart(2, '0')}:${Math.round((workStartHour % 1) * 60).toString().padStart(2, '0')}`
  });

  const fallbackFn = () => {
    // Greedy schedule allocation
    const allocation = [];
    let currentHour = workStartHour;
    
    // Sort tasks by priority Level (descending), then by deadline date (ascending)
    const sortedTasks = [...tasks].sort((a, b) => {
      const levelMap = { 'high': 3, 'medium': 2, 'low': 1 };
      const aLevel = levelMap[a.priorityLevel] || 0;
      const bLevel = levelMap[b.priorityLevel] || 0;
      if (bLevel !== aLevel) return bLevel - aLevel;
      return new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime();
    });
    
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

    // Fill remaining hours with buffer ONLY if there is at least one high-risk task (riskScore >= 80)
    // or if a task's deadline is overdue (has already passed)
    const hasHighRiskOrOverdue = tasks.some(t => t.riskScore >= 80 || new Date(t.deadline) < new Date());

    if (remainingHoursAvailable > 0 && hasHighRiskOrOverdue) {
      const bufferStart = padTime(currentHour);
      const bufferDuration = Math.min(1.5, remainingHoursAvailable); // Limit buffer to max 1.5 hours
      currentHour += bufferDuration;
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

  const rawResult = await callGemini(systemInstruction, userPrompt, fallbackFn);

  if (rawResult && Array.isArray(rawResult.allocation)) {
    // Force sort tasks by priority to ensure LLM compliance
    const finalAllocation = [];
    const taskSlots = [];
    const nonTaskSlots = [];

    // Extract all slots
    rawResult.allocation.forEach(slot => {
      if (slot.taskId === 'break' || slot.taskId === 'buffer') {
        nonTaskSlots.push(slot);
      } else {
        taskSlots.push(slot);
      }
    });

    // Map task slots to their actual task data for sorting
    const mappedTaskSlots = taskSlots.map((slot, index) => {
      const task = tasks.find(t => String(t.id) === String(slot.taskId));
      return {
        originalSlot: slot,
        originalIndex: index,
        priorityLevel: task ? task.priorityLevel : 'low',
        deadline: task ? task.deadline : null
      };
    });

    // Sort by priorityLevel > deadline > originalIndex
    mappedTaskSlots.sort((a, b) => {
      const levelMap = { 'high': 3, 'medium': 2, 'low': 1 };
      const aLevel = levelMap[a.priorityLevel?.toLowerCase()] || 0;
      const bLevel = levelMap[b.priorityLevel?.toLowerCase()] || 0;
      
      if (bLevel !== aLevel) return bLevel - aLevel;
      
      const aTime = new Date(a.deadline || 0).getTime();
      const bTime = new Date(b.deadline || 0).getTime();
      
      if (aTime !== bTime) return aTime - bTime;
      
      return a.originalIndex - b.originalIndex;
    });

    // Re-assign task slots in the newly sorted order, preserving time slots
    let taskIdx = 0;
    let nonTaskIdx = 0;

    for (let i = 0; i < rawResult.allocation.length; i++) {
      const originalSlot = rawResult.allocation[i];
      if (originalSlot.taskId === 'break' || originalSlot.taskId === 'buffer') {
        finalAllocation.push({
          ...nonTaskSlots[nonTaskIdx],
          timeSlot: originalSlot.timeSlot // enforce timeline constraint
        });
        nonTaskIdx++;
      } else {
        finalAllocation.push({
          ...mappedTaskSlots[taskIdx].originalSlot,
          timeSlot: originalSlot.timeSlot // enforce timeline constraint
        });
        taskIdx++;
      }
    }

    rawResult.allocation = finalAllocation;
  }

  // Extract the allocation array robustly
  let allocation = null;
  if (rawResult && Array.isArray(rawResult.allocation)) {
    allocation = rawResult.allocation;
  } else if (rawResult && Array.isArray(rawResult)) {
    allocation = rawResult;
  } else if (rawResult && Array.isArray(rawResult.schedule)) {
    allocation = rawResult.schedule;
  } else if (rawResult && Array.isArray(rawResult.timeline)) {
    allocation = rawResult.timeline;
  }

  // If no valid array is found, run fallback function
  if (!allocation || !Array.isArray(allocation) || allocation.length === 0) {
    console.warn('[Schedule Agent] Gemini response did not contain a valid allocation array. Using fallback.', rawResult);
    return fallbackFn();
  }

  // Normalize slots to ensure no undefined property crashes
  const sanitizedAllocation = allocation.map(slot => {
    return {
      timeSlot: slot.timeSlot || '00:00 - 00:00',
      taskId: slot.taskId !== undefined ? String(slot.taskId) : 'buffer',
      taskTitle: slot.taskTitle || 'Activity block',
      activity: slot.activity || 'Focus work block'
    };
  });

  return { allocation: sanitizedAllocation };
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
    let completedTasks = metrics.completedTasks || 0;
    let pendingTasks = metrics.pendingTasks || 0;
    let activeRescues = metrics.activeRescues || 0;

    let insights = [];
    
    if (focusConsistency >= 80) {
      insights.push(`Excellent focus consistency at ${focusConsistency}%. You are maintaining strong concentration during your sessions.`);
    } else if (focusConsistency >= 50) {
      insights.push(`Your focus consistency is ${focusConsistency}%. There's room for improvement in completing your sessions without interruptions.`);
    } else {
      insights.push(`Focus consistency is currently low at ${focusConsistency}%. Try to minimize distractions during your planned work blocks.`);
    }

    if (activeRescues > 0) {
      insights.push(`You currently have ${activeRescues} active rescue operations. Prioritize these tasks as they are in critical danger.`);
    } else {
      insights.push(`Great job keeping up! You have no active rescue operations at the moment.`);
    }

    if (completedTasks > pendingTasks) {
      insights.push(`Task velocity is strong: you have completed ${completedTasks} tasks, outpacing your ${pendingTasks} pending tasks.`);
    } else if (completedTasks > 0) {
       insights.push(`You have completed ${completedTasks} tasks, with ${pendingTasks} still pending. Keep pushing forward.`);
    } else {
      insights.push(`You have ${pendingTasks} pending tasks waiting to be started. Let's build some momentum!`);
    }

    let focusRecommendations = [];

    if (activeRescues > 0) {
       focusRecommendations.push(`Allocate your next focus sprint strictly to resolving your active rescue tasks.`);
    }
    if (focusConsistency < 60) {
      focusRecommendations.push(`Since your focus completion rate is low, try shortening sprint durations down to 25 minutes to build endurance.`);
    } else {
       focusRecommendations.push(`Your focus is strong. Consider tackling your most complex task in a 50-minute deep work block.`);
    }
    if (pendingTasks > 5) {
       focusRecommendations.push(`With a high number of pending tasks, break them down into smaller sub-tasks to avoid feeling overwhelmed.`);
    } else {
       focusRecommendations.push(`Start work with a single Pomodoro Focus Sprint on your highest priority task to build momentum.`);
    }

    let habitTips = [];

    if (rescueSuccessRate < 50 && metrics.totalRescues > 0) {
      habitTips.push(`Your rescue success rate is ${rescueSuccessRate}%. Consider budgeting more time during initial planning stages to prevent tasks from slipping.`);
    } else if (metrics.totalRescues > 0) {
      habitTips.push(`You've successfully managed rescues with a ${rescueSuccessRate}% success rate. Review what went wrong initially to prevent future rescues.`);
    } else {
       habitTips.push(`You've avoided rescue situations completely! Consistently review deadlines weekly to maintain this proactive habit.`);
    }
    
    if (completedTasks === 0) {
       habitTips.push(`Implement the 2-Minute Rule: if a task checkoff or update takes less than two minutes, complete it immediately to get a quick win.`);
    } else {
       habitTips.push(`Perform a daily wrap-up: spend 5 minutes at the end of the day planning tomorrow's sprint milestones.`);
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
