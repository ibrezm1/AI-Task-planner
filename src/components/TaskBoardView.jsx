import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Edit3, 
  Calendar, 
  Clock, 
  User,
  Search,
  Filter,
  CheckCircle,
  Play,
  ArrowLeftRight,
  Sparkles,
  ExternalLink,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';

const getAIExternalLinks = (task, goals) => {
  const goal = goals.find(g => g.id === task.goalId);
  const goalTitle = goal ? goal.title : '';
  const queryText = `How to accomplish task: "${task.title}"${task.description ? ` (${task.description})` : ''}${goalTitle ? ` under the goal: "${goalTitle}"` : ''}? Give me step-by-step guidance, useful resources, and practical tips.`;
  const encodedQuery = encodeURIComponent(queryText);
  return {
    queryText,
    links: [
      { name: 'ChatGPT', url: `https://chatgpt.com/?q=${encodedQuery}&hints=search&temporary-chat=true` },
      { name: 'Perplexity', url: `https://www.perplexity.ai/search?q=${encodedQuery}` },
      { name: 'Google Search', url: `https://www.google.com/search?q=${encodedQuery}` },
      { name: 'Duck AI', url: `https://duckduckgo.com/?q=${encodedQuery}&ia=chat` },
      { name: 'Brave Search', url: `https://search.brave.com/search?q=${encodedQuery}` },
      { name: 'Mistral AI', url: `https://chat.mistral.ai/chat?q=${encodedQuery}` },
      { name: 'Grok AI', url: `https://grok.com/?q=${encodedQuery}` },
      { name: 'Meta AI (Copy Prompt)', url: `https://www.meta.ai/` },
      { name: 'DeepSeek Chat (Copy Prompt)', url: `https://chat.deepseek.com/` },
      { name: 'Moonshot Kimi (Copy Prompt)', url: `https://kimi.moonshot.cn/` },
      { name: 'LongCat AI (Copy Prompt)', url: `https://longcat.chat/` }
    ]
  };
};

export default function TaskBoardView({ 
  goals = [], 
  tasks = [], 
  onUpdateTask, 
  onDeleteTask,
  onConsultTaskAI,
  onAddTasks
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [activeMobileColumn, setActiveMobileColumn] = useState('pending');
  
  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState('medium');

  // External AI Links state
  const [activeExternalMenuTaskId, setActiveExternalMenuTaskId] = useState(null);

  // Manual Task Creation state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskGoalId, setNewTaskGoalId] = useState('');

  React.useEffect(() => {
    if (activeExternalMenuTaskId === null) return;
    const handleOutsideClick = () => setActiveExternalMenuTaskId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [activeExternalMenuTaskId]);

  const handleStartAddTask = () => {
    setIsAddingTask(true);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDueDate(new Date().toISOString().split('T')[0]);
    setNewTaskPriority('medium');
    if (selectedGoalId !== 'all') {
      setNewTaskGoalId(selectedGoalId);
    } else if (goals.length > 0) {
      setNewTaskGoalId(goals[0].id);
    } else {
      setNewTaskGoalId('');
    }
  };

  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskGoalId) return;

    if (onAddTasks) {
      onAddTasks([{
        goalId: newTaskGoalId,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        dueDate: newTaskDueDate,
        priority: newTaskPriority
      }]);
    }
    
    setIsAddingTask(false);
    setNewTaskTitle('');
    setNewTaskDesc('');
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleStartEdit = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditDueDate(task.dueDate);
    setEditPriority(task.priority || 'medium');
  };

  const handleSaveEdit = (taskId) => {
    onUpdateTask(taskId, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      dueDate: editDueDate,
      priority: editPriority
    });
    setEditingTaskId(null);
  };

  const handleToggleStatus = (task) => {
    let nextStatus = 'pending';
    if (task.status === 'pending') {
      nextStatus = 'in_progress';
    } else if (task.status === 'in_progress') {
      nextStatus = 'completed';
      triggerConfetti();
    } else {
      nextStatus = 'pending';
    }
    
    onUpdateTask(task.id, { 
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : null
    });
  };

  const handleMoveToColumn = (task, targetStatus) => {
    if (targetStatus === 'completed') {
      triggerConfetti();
    }
    onUpdateTask(task.id, { 
      status: targetStatus,
      completedAt: targetStatus === 'completed' ? new Date().toISOString() : null
    });
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGoal = selectedGoalId === 'all' || task.goalId === selectedGoalId;
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    return matchesSearch && matchesGoal && matchesPriority;
  });

  const columns = [
    { id: 'pending', name: 'To Do', color: 'var(--text-muted)' },
    { id: 'in_progress', name: 'In Progress', color: 'var(--warning-color)' },
    { id: 'completed', name: 'Completed', color: 'var(--success-color)' }
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Tasks Board
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            View and edit all schedules generated by the AI or defined by you.
          </p>
        </div>
        {!isAddingTask && (
          <button 
            onClick={handleStartAddTask} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Add Task
          </button>
        )}
      </div>

      {/* Manual Add Task Form */}
      {isAddingTask && (
        <form onSubmit={handleAddTaskSubmit} className="glass-panel fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Create New Task</h3>
          
          {goals.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
              <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem', margin: 0 }}>
                You don't have any goals defined yet. Please create at least one goal in the Goal Manager before manually adding tasks.
              </p>
              <button 
                type="button" 
                onClick={() => setIsAddingTask(false)} 
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Task Title *</label>
                  <input 
                    type="text" 
                    placeholder="Enter task title..." 
                    className="input-field"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    required
                    style={{ padding: '8px 12px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Assign to Goal *</label>
                  <select 
                    value={newTaskGoalId}
                    onChange={e => setNewTaskGoalId(e.target.value)}
                    className="input-field"
                    required
                    style={{ padding: '8px 12px' }}
                  >
                    <option value="" disabled>Select a goal...</option>
                    {goals.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
                <textarea 
                  placeholder="Enter task details..." 
                  className="input-field"
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  style={{ padding: '8px 12px', minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Due Date *</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={newTaskDueDate}
                    onChange={e => setNewTaskDueDate(e.target.value)}
                    required
                    style={{ padding: '8px 12px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Priority *</label>
                  <select 
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value)}
                    className="input-field"
                    required
                    style={{ padding: '8px 12px' }}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button 
                  type="button"
                  onClick={() => setIsAddingTask(false)} 
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Create Task
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ 
        padding: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="input-field"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px' }}
          />
        </div>

        {/* Goal Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select 
            value={selectedGoalId} 
            onChange={e => setSelectedGoalId(e.target.value)}
            className="input-field"
            style={{ width: '180px', padding: '8px 12px', fontSize: '0.88rem' }}
          >
            <option value="all">All Goals</option>
            {goals.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select 
            value={selectedPriority} 
            onChange={e => setSelectedPriority(e.target.value)}
            className="input-field"
            style={{ width: '140px', padding: '8px 12px', fontSize: '0.88rem' }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="kanban-tabs">
        {columns.map(col => (
          <button
            key={col.id}
            type="button"
            onClick={() => setActiveMobileColumn(col.id)}
            className="btn"
            style={{
              flex: 1,
              fontSize: '0.8rem',
              padding: '8px 10px',
              backgroundColor: activeMobileColumn === col.id ? 'var(--accent-color)' : 'rgba(255,255,255,0.03)',
              color: activeMobileColumn === col.id ? '#ffffff' : 'var(--text-secondary)',
              border: activeMobileColumn === col.id ? 'none' : '1px solid var(--border-color)',
              fontWeight: 600
            }}
          >
            {col.name}
          </button>
        ))}
      </div>

      {/* Kanban Board Grid */}
      <div className="kanban-board-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', minHeight: '500px', alignItems: 'start' }}>
        {columns.map(column => {
          const columnTasks = filteredTasks.filter(t => t.status === column.id);
          const isMobileHidden = activeMobileColumn !== column.id;

          return (
            <div 
              key={column.id} 
              className={`glass-panel ${isMobileHidden ? 'kanban-column-mobile-hidden' : ''}`} 
              style={{ 
                padding: '16px', 
                backgroundColor: 'rgba(255,255,255,0.01)', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '14px',
                height: '100%' 
              }}
            >
              {/* Column Title */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: `2px solid ${column.color}`,
                paddingBottom: '8px',
                marginBottom: '4px'
              }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {column.name}
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  backgroundColor: 'var(--border-hover)', 
                  padding: '2px 8px', 
                  borderRadius: '10px',
                  fontWeight: 700
                }}>
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks List within Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '400px' }}>
                {columnTasks.map(task => {
                  const goal = goals.find(g => g.id === task.goalId);
                  const isEditing = editingTaskId === task.id;
                  const isHigh = task.priority === 'high';
                  const isLow = task.priority === 'low';

                  return (
                    <div 
                      key={task.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '14px', 
                        backgroundColor: task.status === 'completed' ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255,255,255,0.02)',
                        border: isEditing ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      {isEditing ? (
                        /* Edit Task Panel */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input 
                            type="text" 
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="input-field"
                            style={{ fontSize: '0.88rem', padding: '4px 8px' }}
                          />
                          <textarea 
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            className="input-field"
                            style={{ fontSize: '0.8rem', padding: '4px 8px', minHeight: '50px', resize: 'vertical' }}
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <input 
                              type="date"
                              value={editDueDate}
                              onChange={e => setEditDueDate(e.target.value)}
                              className="input-field"
                              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                            />
                            <select
                              value={editPriority}
                              onChange={e => setEditPriority(e.target.value)}
                              className="input-field"
                              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button 
                              onClick={() => setEditingTaskId(null)} 
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSaveEdit(task.id)} 
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard Read Mode Task Card */
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                              <span style={{ 
                                fontWeight: 600, 
                                fontSize: '0.92rem', 
                                textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                                lineBreak: 'anywhere'
                              }}>
                                {task.title}
                              </span>
                              {goal && (
                                <span style={{ 
                                  alignSelf: 'flex-start',
                                  fontSize: '0.7rem', 
                                  backgroundColor: 'rgba(255,255,255,0.05)', 
                                  color: 'var(--text-secondary)',
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {goal.title}
                                </span>
                              )}
                            </div>
                            
                            {/* Toggle complete button shortcut */}
                            <button
                              onClick={() => handleToggleStatus(task)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: task.status === 'completed' ? 'var(--success-color)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px'
                              }}
                              title={task.status === 'completed' ? 'Reopen task' : 'Complete task'}
                            >
                              {task.status === 'completed' ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                          </div>

                          <p style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--text-secondary)',
                            margin: 0,
                            lineBreak: 'anywhere'
                          }}>
                            {task.description || 'No description.'}
                          </p>

                          {/* Info Footer Row */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginTop: 'auto',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--border-color)',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} />
                              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{task.dueDate}</span>
                            </div>
                            
                            <span style={{
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              color: isHigh ? 'var(--danger-color)' : isLow ? 'var(--text-muted)' : 'var(--warning-color)',
                              backgroundColor: isHigh ? 'rgba(239, 68, 68, 0.1)' : isLow ? 'rgba(255,255,255,0.05)' : 'rgba(245, 158, 11, 0.1)',
                              textTransform: 'uppercase'
                            }}>
                              {task.priority}
                            </span>
                          </div>

                          {/* Action Bar */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            marginTop: '6px',
                            paddingTop: '6px',
                            gap: '8px'
                          }}>
                            {/* Column shifting triggers */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {task.status !== 'pending' && (
                                <button 
                                  onClick={() => handleMoveToColumn(task, 'pending')}
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: '4px' }}
                                  title="Move to To Do"
                                >
                                  To Do
                                </button>
                              )}
                              {task.status !== 'in_progress' && (
                                <button 
                                  onClick={() => handleMoveToColumn(task, 'in_progress')}
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: '4px' }}
                                  title="Move to In Progress"
                                >
                                  In Progress
                                </button>
                              )}
                              {task.status !== 'completed' && (
                                <button 
                                  onClick={() => handleMoveToColumn(task, 'completed')}
                                  className="btn btn-secondary" 
                                  style={{ padding: '4px 6px', fontSize: '0.7rem', borderRadius: '4px' }}
                                  title="Move to Completed"
                                >
                                  Done
                                </button>
                              )}
                            </div>

                            {/* Edit / Delete triggers */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {onConsultTaskAI && (
                                <>
                                  <button 
                                    onClick={() => onConsultTaskAI(task)}
                                    className="btn btn-secondary" 
                                    style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--accent-glow)' }}
                                    title="Ask AI for study tips and start ideas"
                                  >
                                    <Sparkles size={11} color="var(--accent-color)" />
                                  </button>
                                  
                                  <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveExternalMenuTaskId(activeExternalMenuTaskId === task.id ? null : task.id);
                                      }}
                                      className="btn btn-secondary" 
                                      style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                      title="Search with external AI tools"
                                    >
                                      <ExternalLink size={11} />
                                    </button>
                                    {activeExternalMenuTaskId === task.id && (() => {
                                      const { queryText, links } = getAIExternalLinks(task, goals);
                                      return (
                                        <div className="ai-dropdown-menu">
                                          {links.map(link => (
                                            <a 
                                              key={link.name}
                                              href={link.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="ai-dropdown-item"
                                              onClick={() => {
                                                navigator.clipboard.writeText(queryText).catch(() => {});
                                                setActiveExternalMenuTaskId(null);
                                              }}
                                            >
                                              <ExternalLink size={10} style={{ opacity: 0.7 }} />
                                              {link.name}
                                            </a>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </>
                              )}
                              <button 
                                onClick={() => handleStartEdit(task)}
                                className="btn btn-secondary" 
                                style={{ padding: '4px 6px', borderRadius: '4px' }}
                                title="Edit Task"
                              >
                                <Edit3 size={11} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm(`Delete task "${task.title}"?`)) {
                                    onDeleteTask(task.id);
                                  }
                                }}
                                className="btn btn-secondary" 
                                style={{ padding: '4px 6px', color: 'var(--danger-color)', borderRadius: '4px' }}
                                title="Delete Task"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {columnTasks.length === 0 && (
                  <div style={{ 
                    padding: '30px 10px', 
                    textAlign: 'center', 
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    marginTop: '8px'
                  }}>
                    Empty Column
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
