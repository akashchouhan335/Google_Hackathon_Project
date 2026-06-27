const ai = require('../services/geminiService');

describe('Gemini Service Fallback', () => {
  it('should run Priority Agent fallback', async () => {
    const task = { title: 'Test', description: 'Test', estimatedHours: 2, priorityLevel: 'high', deadline: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString() };
    const result = await ai.runPriorityAgent(task, []);
    expect(result.priorityScore).toBeDefined();
    expect(result.explanation).toBeDefined();
  });

  it('should run Priority Agent fallback (urgent)', async () => {
    const task = { title: 'Test', description: 'Test', estimatedHours: 2, priorityLevel: 'medium', deadline: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString() };
    const result = await ai.runPriorityAgent(task, []);
    expect(result.priorityScore).toBeDefined();
    expect(result.explanation).toBeDefined();
  });

  it('should run Risk Agent fallback for high density (extremely high risk)', async () => {
    const task = { title: 'Test', priorityLevel: 'high', deadline: new Date(Date.now() + 18000000).toISOString(), estimatedHours: 6 }; // 5 hours away, 6 est
    const result = await ai.runRiskAgent(task);
    expect(result.riskScore).toBeGreaterThanOrEqual(90);
    expect(result.riskLevel).toBe('High');
  });

  it('should run Risk Agent fallback for medium-high density (high risk)', async () => {
    const task = { title: 'Test', priorityLevel: 'high', deadline: new Date(Date.now() + 72000000).toISOString(), estimatedHours: 16 }; // 20 hours away, 16 est
    const result = await ai.runRiskAgent(task);
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.riskLevel).toBe('High');
  });

  it('should run Risk Agent fallback for medium density (medium risk)', async () => {
    const task = { title: 'Test', priorityLevel: 'high', deadline: new Date(Date.now() + 144000000).toISOString(), estimatedHours: 12 }; // 40 hours away, 12 est
    const result = await ai.runRiskAgent(task);
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
    expect(result.riskLevel).toBe('Medium');
  });

  it('should run Risk Agent fallback for low density (low risk)', async () => {
    const task = { title: 'Test', priorityLevel: 'high', deadline: new Date(Date.now() + 360000000).toISOString(), estimatedHours: 12 }; // 100 hours away, 12 est
    const result = await ai.runRiskAgent(task);
    expect(result.riskScore).toBeLessThan(40);
    expect(result.riskLevel).toBe('Low');
  });

  it('should run Priority Agent fallback with existing pending tasks', async () => {
    const task = { title: 'Test', priorityLevel: 'high', deadline: new Date(Date.now() + 86400000).toISOString() }; 
    const existing = [{ title: 'Old', deadline: new Date().toISOString(), estimatedHours: 1 }];
    const result = await ai.runPriorityAgent(task, existing);
    expect(result.priorityScore).toBeDefined();
  });

  it('should run Priority Agent fallback for deadline < 72 hours', async () => {
    const task = { title: 'Test', priorityLevel: 'medium', deadline: new Date(Date.now() + 172800000).toISOString() }; // 48 hours
    const result = await ai.runPriorityAgent(task, []);
    expect(result.priorityScore).toBeGreaterThanOrEqual(20);
  });

  it('should run Priority Agent fallback for deadline < 168 hours', async () => {
    const task = { title: 'Test', priorityLevel: 'low', deadline: new Date(Date.now() + 432000000).toISOString() }; // 120 hours (5 days)
    const result = await ai.runPriorityAgent(task, []);
    expect(result.priorityScore).toBeGreaterThanOrEqual(10);
  });

  it('should run Priority Agent fallback for deadline > 168 hours', async () => {
    const task = { title: 'Test', priorityLevel: 'low', deadline: new Date(Date.now() + 864000000).toISOString() }; // 240 hours (10 days)
    const result = await ai.runPriorityAgent(task, []);
    expect(result.priorityScore).toBeGreaterThanOrEqual(0);
  });

  it('should run Coach Agent fallback with recent tasks', async () => {
    const metrics = { totalCompleted: 5 };
    const recentTasks = [{ title: 'T1', status: 'completed', riskLevel: 'Low', priorityScore: 50 }];
    const result = await ai.runCoachAgent(metrics, recentTasks);
    expect(result.insights).toBeInstanceOf(Array);
  });

  it('should run Risk Agent fallback', async () => {
    const task = { title: 'Test', priorityLevel: 'high', deadline: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), estimatedHours: 2 };
    const result = await ai.runRiskAgent(task);
    expect(result.riskScore).toBeDefined();
    expect(result.riskLevel).toBeDefined();
    expect(result.riskExplanation).toBeDefined();
  });

  it('should run Risk Agent fallback (completed)', async () => {
    const task = { title: 'Test', status: 'completed', deadline: new Date().toISOString(), estimatedHours: 2 };
    const result = await ai.runRiskAgent(task);
    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe('Low');
  });

  it('should run Risk Agent fallback (past deadline)', async () => {
    const task = { title: 'Test', deadline: new Date(Date.now() - 1000 * 60 * 60).toISOString(), estimatedHours: 2 };
    const result = await ai.runRiskAgent(task);
    expect(result.riskScore).toBe(100);
    expect(result.riskLevel).toBe('High');
  });

  it('should run Risk Agent fallback (extreme risk)', async () => {
    const task = { title: 'Test', deadline: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(), estimatedHours: 10 };
    const result = await ai.runRiskAgent(task);
    expect(result.riskScore).toBeGreaterThan(90);
    expect(result.riskLevel).toBe('High');
  });

  it('should run Recovery Agent fallback', async () => {
    const task = { title: 'Test', priorityLevel: 'high', deadline: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), estimatedHours: 2 };
    const result = await ai.runRecoveryAgent(task, 85, 'high risk');
    expect(result.recoveryStrategy).toBeDefined();
    expect(result.successProbability).toBeDefined();
    expect(result.requiredDailyHours).toBeDefined();
    expect(result.extraWorkSessions).toBeInstanceOf(Array);
  });

  it('should run Coach Agent fallback (good metrics)', async () => {
    const metrics = { completedTasks: 5, focusConsistency: 80, rescueSuccessRate: 80, totalRescues: 2, activeRescues: 0 };
    const result = await ai.runCoachAgent(metrics, []);
    expect(result.insights).toBeInstanceOf(Array);
    expect(result.focusRecommendations).toBeInstanceOf(Array);
    expect(result.habitTips).toBeInstanceOf(Array);
  });

  it('should run Coach Agent fallback (poor metrics)', async () => {
    const metrics = { completedTasks: 1, focusConsistency: 40, rescueSuccessRate: 40, totalRescues: 2, activeRescues: 1 };
    const result = await ai.runCoachAgent(metrics, []);
    expect(result.insights).toBeInstanceOf(Array);
    expect(result.focusRecommendations).toBeInstanceOf(Array);
    expect(result.habitTips).toBeInstanceOf(Array);
  });

  it('should run Schedule Agent fallback', async () => {
    const activeTasks = [
      { id: '1', title: 'Task 1', estimatedHours: 2, priorityLevel: 'high', priorityScore: 90 }
    ];
    const result = await ai.runScheduleAgent(activeTasks, 4, 9);
    expect(result.allocation).toBeInstanceOf(Array);
  });
});

describe('Gemini Service Active Client', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.GEMINI_API_KEY;
  });

  it('should initialize GoogleGenAI and call the API', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    
    // Mock the GoogleGenerativeAI constructor and generateContent method
    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => '```json\n{"priorityScore": 99, "explanation": "Test"}\n```'
      }
    });

    jest.mock('@google/generative-ai', () => {
      return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
          return {
            getGenerativeModel: () => ({
              generateContent: mockGenerateContent
            })
          };
        })
      };
    });

    jest.isolateModules(() => {
      const config = require('../config');
      config.GEMINI_API_KEY = 'test-key'; // Ensure config reflects it
      
      const liveAi = require('../services/geminiService');
      
      // Act
      const task = { title: 'Test', description: 'Test', estimatedHours: 2, priorityLevel: 'high', deadline: new Date().toISOString() };
      return liveAi.runPriorityAgent(task, []).then(result => {
        expect(result.priorityScore).toBe(99);
        expect(result.explanation).toBe('Test');
        expect(mockGenerateContent).toHaveBeenCalled();
      });
    });
  });

  it('should fallback to mock if API throws', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    
    const mockGenerateContent = jest.fn().mockRejectedValue(new Error('API Error'));

    jest.mock('@google/generative-ai', () => {
      return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
          return {
            getGenerativeModel: () => ({
              generateContent: mockGenerateContent
            })
          };
        })
      };
    });

    jest.isolateModules(() => {
      const config = require('../config');
      config.GEMINI_API_KEY = 'test-key';
      
      const liveAi = require('../services/geminiService');
      
      // Act
      const task = { title: 'Test', priorityLevel: 'high', deadline: new Date().toISOString() };
      return liveAi.runRiskAgent(task).then(result => {
        expect(result.riskScore).toBeDefined();
      });
    });
  });

  it('should handle initialization error gracefully', () => {
    process.env.GEMINI_API_KEY = 'test-key';

    jest.mock('@google/generative-ai', () => {
      return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
          throw new Error('Init error');
        })
      };
    });

    jest.isolateModules(() => {
      const config = require('../config');
      config.GEMINI_API_KEY = 'test-key';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      require('../services/geminiService');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize Gemini API client:', 'Init error');
      consoleSpy.mockRestore();
    });
  });
});
