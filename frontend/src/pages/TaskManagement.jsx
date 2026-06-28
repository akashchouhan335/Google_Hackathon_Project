import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useData } from '../context/DataContext';
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  X, 
  Trash2, 
  Edit2, 
  CheckSquare, 
  Flame,
  MessageSquare,
  Play,
  Pause
} from 'lucide-react';

export default function TaskManagement({ onTriggerToast }) {
  const { tasks, loading, refreshData, setTasks } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail Drawer and Forms State
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [formTask, setFormTask] = useState({
    title: '',
    description: '',
    deadline: '',
    estimatedHours: '',
    priorityLevel: 'medium',
    status: 'pending'
  });
  const [saving, setSaving] = useState(false);

  // Keep selectedTask reference fresh when tasks update
  useEffect(() => {
    if (selectedTask && tasks.length > 0) {
      const fresh = tasks.find(t => t.id === selectedTask.id);
      if (fresh) setSelectedTask(fresh);
    }
  }, [tasks]);

  // Poll for background AI updates (e.g. when priorityExplanation is 'Analyzing...')
  useEffect(() => {
    const analyzingTasks = tasks.filter(t => t.priorityExplanation === 'Analyzing...' && t.status !== 'completed');
    if (analyzingTasks.length === 0) return;

    const interval = setInterval(async () => {
      let updatedAny = false;
      const updatedTasksMap = {};

      for (const t of analyzingTasks) {
        try {
          const freshTask = await api.tasks.getById(t.id);
          if (freshTask && freshTask.priorityExplanation !== 'Analyzing...') {
            updatedTasksMap[t.id] = freshTask;
            updatedAny = true;
          }
        } catch (err) {
          console.error('Failed to poll AI update for task:', err);
        }
      }

      if (updatedAny) {
        setTasks(prevTasks => prevTasks.map(t => updatedTasksMap[t.id] || t));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tasks, setTasks]);

  const handleOpenCreateModal = () => {
    setFormTask({
      title: '',
      description: '',
      deadline: '',
      estimatedHours: '',
      priorityLevel: 'medium',
      status: 'pending'
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task, e) => {
    if (e) e.stopPropagation();
    setFormTask({
      id: task.id,
      title: task.title,
      description: task.description || '',
      deadline: task.deadline.substring(0, 16), // Format for datetime-local input YYYY-MM-DDTHH:MM
      estimatedHours: task.estimatedHours,
      priorityLevel: task.priorityLevel,
      status: task.status
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task? All related focus history will be cleared.')) return;
    
    try {
      setTasks(prevTasks => (prevTasks || []).filter(t => t.id !== id));
      await api.tasks.delete(id);
      onTriggerToast('info', 'Task deleted', 'The task and its associated logs were removed.');
      if (selectedTask?.id === id) setSelectedTask(null);
      refreshData(true); // Update analytics in background
    } catch (err) {
      onTriggerToast('error', 'Deletion failed', err.message);
      refreshData(); // Revert on failure
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (modalMode === 'create') {
        const newTask = await api.tasks.create(formTask);
        setTasks(prevTasks => [...(prevTasks || []), newTask]);
        onTriggerToast('success', 'Task Created', `AI Agents are analyzing your task...`);
      } else {
        const updated = await api.tasks.update(formTask.id, formTask);
        setTasks(prevTasks => (prevTasks || []).map(t => t.id === updated.id ? updated : t));
        onTriggerToast('success', 'Task Updated', `Task saved.`);
      }
      setIsModalOpen(false);
      refreshData(true); // Update analytics in background
    } catch (err) {
      onTriggerToast('error', 'Failed to save task', err.message);
      refreshData(); // Revert on failure
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (task, e) => {
    if (e) e.stopPropagation();
    
    let nextStatus = 'completed';
    if (task.status === 'completed') {
      const isOverdue = task.deadline && new Date(task.deadline).getTime() < new Date().getTime();
      nextStatus = isOverdue ? 'incomplete' : 'pending';
    }

    try {
      const optimisticTask = { ...task, status: nextStatus };
      setTasks(prevTasks => (prevTasks || []).map(t => t.id === task.id ? optimisticTask : t));

      const updated = await api.tasks.update(task.id, optimisticTask);
      setTasks(prevTasks => (prevTasks || []).map(t => t.id === task.id ? updated : t));
      
      onTriggerToast('success', 'Task Updated', `Task status changed to ${nextStatus}.`);
      refreshData(true); // Update analytics in background
    } catch (err) {
      onTriggerToast('error', 'Failed to update status', err.message);
      refreshData(); // Revert on failure
    }
  };

  const handleUpdateStatus = async (task, newStatus, e) => {
    if (e) e.stopPropagation();
    try {
      const optimisticTask = { ...task, status: newStatus };
      setTasks(prevTasks => (prevTasks || []).map(t => t.id === task.id ? optimisticTask : t));

      const updated = await api.tasks.update(task.id, optimisticTask);
      setTasks(prevTasks => (prevTasks || []).map(t => t.id === task.id ? updated : t));
      
      let toastTitle = 'Task Updated';
      let toastBody = `Task status changed to ${newStatus === 'in_progress' ? 'In Progress' : newStatus}.`;
      if (newStatus === 'in_progress') {
        toastTitle = 'Task Started';
        toastBody = `"${task.title}" is now In Progress (Ongoing).`;
      } else if (newStatus === 'pending') {
        toastTitle = 'Task Paused';
        toastBody = `"${task.title}" is back to Pending.`;
      } else if (newStatus === 'completed') {
        toastTitle = 'Task Completed';
        toastBody = `"${task.title}" has been checked off.`;
      }
      
      onTriggerToast('success', toastTitle, toastBody);
      refreshData(true); // Update analytics in background
    } catch (err) {
      onTriggerToast('error', 'Failed to update status', err.message);
      refreshData(); // Revert on failure
    }
  };

  const getFilteredTasks = () => {
    return tasks.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const categorizedTasks = {
    pending: getFilteredTasks().filter(t => t.status === 'pending'),
    in_progress: getFilteredTasks().filter(t => t.status === 'in_progress'),
    completed: getFilteredTasks().filter(t => t.status === 'completed'),
    incomplete: getFilteredTasks().filter(t => t.status === 'incomplete')
  };

  return (
    <div className="content-body">
      {/* Title block */}
      <div className="task-header-row">
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800 }}>Task Center</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your workspace and explore live multi-agent priorities and risk predictions.</p>
        </div>
        
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} /> New Task
        </button>
      </div>

      {/* Search Filter bar */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', marginBottom: '2rem' }}>
        <Search size={18} color="var(--text-muted)" />
        <input 
          type="text"
          className="form-input"
          placeholder="Filter tasks by name or details..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ border: 'none', background: 'none', width: '100%', padding: '0.25rem' }}
        />
      </div>

      {/* Kanban Board Grid */}
      {loading ? (
        <div className="task-board" style={{ opacity: 0.7, pointerEvents: 'none' }}>
          {[1, 2, 3, 4].map(col => (
            <div key={col} className="task-column">
              <div className="column-header" style={{ marginBottom: '1rem' }}>
                <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '12px' }}></div>
              </div>
              {[1, 2].map(card => (
                <div key={card} className="task-card" style={{ height: '140px', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                  <div className="skeleton" style={{ width: '80%', height: '20px', borderRadius: '4px', marginBottom: '1rem' }}></div>
                  <div className="skeleton" style={{ width: '60%', height: '16px', borderRadius: '4px', marginBottom: '1.5rem' }}></div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <style>{`
            .skeleton {
              background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
              background-size: 200% 100%;
              animation: loading 1.5s infinite;
            }
            @keyframes loading {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      ) : (
        <div className="task-board">
          {/* Column 1: Pending */}
          <div className="task-column">
            <div className="column-header">
              <span className="column-title"><CheckSquare size={16} /> Pending</span>
              <span className="column-count">{categorizedTasks.pending.length}</span>
            </div>
            
            <div className="task-cards-list">
              {categorizedTasks.pending.map(t => (
                <TaskCard 
                  key={t.id} 
                  task={t} 
                  onSelect={setSelectedTask} 
                  onToggleStatus={handleToggleStatus} 
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="task-column">
            <div className="column-header">
              <span className="column-title"><Clock size={16} color="var(--primary-blue)" /> In Progress</span>
              <span className="column-count">{categorizedTasks.in_progress.length}</span>
            </div>
            
            <div className="task-cards-list">
              {categorizedTasks.in_progress.map(t => (
                <TaskCard 
                  key={t.id} 
                  task={t} 
                  onSelect={setSelectedTask} 
                  onToggleStatus={handleToggleStatus} 
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="task-column">
            <div className="column-header">
              <span className="column-title" style={{ color: 'var(--success)' }}><CheckSquare size={16} /> Completed</span>
              <span className="column-count">{categorizedTasks.completed.length}</span>
            </div>
            
            <div className="task-cards-list">
              {categorizedTasks.completed.map(t => (
                <TaskCard 
                  key={t.id} 
                  task={t} 
                  onSelect={setSelectedTask} 
                  onToggleStatus={handleToggleStatus} 
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          </div>

          {/* Column 4: Incomplete */}
          <div className="task-column">
            <div className="column-header">
              <span className="column-title" style={{ color: 'var(--danger)' }}><X size={16} /> Missed/Incomplete</span>
              <span className="column-count">{categorizedTasks.incomplete.length}</span>
            </div>
            
            <div className="task-cards-list">
              {categorizedTasks.incomplete.map(t => (
                <TaskCard 
                  key={t.id} 
                  task={t} 
                  onSelect={setSelectedTask} 
                  onToggleStatus={handleToggleStatus} 
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Task Creation & Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {modalMode === 'create' ? 'Create New Task' : 'Edit Task'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTask}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Task Title</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g. Finish chemistry laboratory syllabus"
                    value={formTask.title}
                    onChange={(e) => setFormTask({ ...formTask, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Task Description (Optional)</label>
                  <textarea 
                    className="form-input"
                    rows="3"
                    placeholder="Provide micro details to assist AI priority ranking..."
                    value={formTask.description}
                    onChange={(e) => setFormTask({ ...formTask, description: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label>Absolute Deadline</label>
                  <input 
                    type="datetime-local"
                    className="form-input"
                    value={formTask.deadline}
                    onChange={(e) => setFormTask({ ...formTask, deadline: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>User Priority Indicator</label>
                  <select
                    className="form-input"
                    value={formTask.priorityLevel}
                    onChange={(e) => setFormTask({ ...formTask, priorityLevel: e.target.value })}
                    required
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                {modalMode === 'edit' && (
                  <div className="form-group">
                    <label>Execution Status</label>
                    <select
                      className="form-input"
                      value={formTask.status}
                      onChange={(e) => setFormTask({ ...formTask, status: e.target.value })}
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="incomplete">Incomplete / Missed</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Engaging AI Agents...' : 'Save Task & Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Sidepanel Drawer */}
      {selectedTask && (
        <div className="task-detail-sidepanel">
          <div className="sidepanel-header">
            <span className="ai-engine-badge"><Sparkles size={12} /> Gemini Agent Analysis</span>
            <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Title */}
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedTask.title}</h2>
              {selectedTask.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.4' }}>
                  {selectedTask.description}
                </p>
              )}
            </div>

            {/* General metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Deadline</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                  <Calendar size={14} /> {new Date(selectedTask.deadline).toLocaleDateString()} - {new Date(selectedTask.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Priority Level</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem', textTransform: 'capitalize' }}>
                  {selectedTask.priorityLevel}
                </p>
              </div>
            </div>

            {/* Priority Agent Insight */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--primary-blue)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority Agent</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-blue)' }}>{selectedTask.priorityScore}/100</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {selectedTask.priorityExplanation}
              </p>
            </div>

            {/* Risk Agent Insight */}
            <div className="glass-card" style={{ borderLeft: `4px solid ${selectedTask.riskLevel === 'High' ? 'var(--danger)' : selectedTask.riskLevel === 'Medium' ? 'var(--warning)' : 'var(--success)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risk Agent</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedTask.riskLevel === 'High' ? 'var(--danger)' : selectedTask.riskLevel === 'Medium' ? 'var(--warning)' : 'var(--success)' }}>
                  {selectedTask.riskScore}% ({selectedTask.riskLevel})
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {selectedTask.riskExplanation}
              </p>
            </div>

            {/* Recovery strategy if Rescue Mode is active */}
            {selectedTask.riskScore >= 80 && selectedTask.recoveryPlan && (
              <div className="glass-card" style={{ border: '1.5px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.02)', boxShadow: 'var(--shadow-rescue-glow)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  <Flame size={16} /> Recovery Strategy
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {selectedTask.recoveryPlan.strategy}
                </p>
                <div style={{ marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Emergency Action Steps:</span>
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {selectedTask.recoveryPlan.actionSteps?.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Quick Status Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Quick Status Update</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedTask.status !== 'pending' && (
                  <button 
                    className="btn btn-secondary"
                    onClick={(e) => handleUpdateStatus(selectedTask, 'pending', e)}
                    style={{ flexGrow: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <Pause size={14} /> Pending
                  </button>
                )}
                {selectedTask.status !== 'in_progress' && (
                  <button 
                    className="btn btn-primary"
                    onClick={(e) => handleUpdateStatus(selectedTask, 'in_progress', e)}
                    style={{ flexGrow: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <Play size={14} fill="currentColor" /> Start Work
                  </button>
                )}
                {selectedTask.status !== 'completed' && (
                  <button 
                    className="btn btn-secondary"
                    onClick={(e) => handleUpdateStatus(selectedTask, 'completed', e)}
                    style={{ flexGrow: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <CheckSquare size={14} /> Complete
                  </button>
                )}
              </div>
            </div>

            {/* Action Group */}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', borderTop: 'var(--card-border)', paddingTop: '1.5rem' }}>
              <button 
                className="btn btn-secondary"
                onClick={(e) => handleOpenEditModal(selectedTask, e)}
                style={{ flexGrow: 1 }}
              >
                <Edit2 size={16} /> Edit Task
              </button>
              <button 
                className="btn btn-secondary"
                onClick={(e) => handleDeleteTask(selectedTask.id, e)}
                style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Kanban Task Card Component
function TaskCard({ task, onSelect, onToggleStatus, onUpdateStatus }) {
  const isHighRisk = task.riskScore >= 80 && task.status !== 'completed';
  
  return (
    <div 
      className={`task-item-card ${isHighRisk ? 'danger-border' : ''}`}
      onClick={() => onSelect(task)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, textDecoration: task.status === 'completed' ? 'line-through' : 'none', color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {task.title}
        </h4>
        <input 
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={(e) => onToggleStatus(task, e)}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary-blue)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        <span className={`task-meta-tag priority-tag ${task.priorityLevel}`}>
          {task.priorityLevel}
        </span>
        {isHighRisk && (
          <span className="task-meta-tag priority-tag high" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
            <AlertTriangle size={10} /> Rescue
          </span>
        )}
      </div>

      {/* Progress slider visually for estimated effort vs risk */}
      <div className="task-progress-bar-bg">
        <div 
          className="task-progress-bar-fill" 
          style={{ 
            width: task.status === 'completed' ? '100%' : `${task.riskScore}%`,
            background: task.status === 'completed' ? 'var(--success)' : isHighRisk ? 'var(--danger-gradient)' : 'var(--primary-gradient)'
          }}
        ></div>
      </div>

      {/* Quick Status Control Buttons */}
      {task.status !== 'completed' && (
        <div style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
          {task.status === 'pending' ? (
            <button
              className="btn btn-primary"
              onClick={(e) => onUpdateStatus(task, 'in_progress', e)}
              style={{
                width: '100%',
                padding: '0.35rem 0.5rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                height: '32px',
                boxShadow: 'none'
              }}
            >
              <Play size={12} fill="currentColor" /> Start Task
            </button>
          ) : task.status === 'in_progress' ? (
            <button
              className="btn btn-secondary"
              onClick={(e) => onUpdateStatus(task, 'pending', e)}
              style={{
                width: '100%',
                padding: '0.35rem 0.5rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                height: '32px',
                color: 'var(--text-secondary)'
              }}
            >
              <Pause size={12} fill="currentColor" /> Pause Task
            </button>
          ) : null}
        </div>
      )}

      <div className="task-card-footer">
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Calendar size={12} /> {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
        <span>
          {task.status === 'completed' ? 'Completed' : `${task.riskLevel} Risk (${task.riskScore}%)`}
        </span>
      </div>
    </div>
  );
}
