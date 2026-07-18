import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';

export default function GoalsView({ 
  goals = [], 
  tasks = [], 
  onAddGoal, 
  onEditGoal, 
  onDeleteGoal, 
  setView 
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState('weekly');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingGoal) {
      onEditGoal(editingGoal.id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        frequency
      });
      setEditingGoal(null);
    } else {
      onAddGoal({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        frequency
      });
      setIsAdding(false);
    }

    // Reset Form
    setTitle('');
    setDescription('');
    setCategory('');
    setFrequency('weekly');
  };

  const handleStartEdit = (goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setCategory(goal.category || '');
    setFrequency(goal.frequency || 'weekly');
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setFrequency('weekly');
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="view-header-flex">
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Goal Manager
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Define custom recurring tasks or learning milestones you want to track and build upon.
          </p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)} 
            className="btn btn-primary"
          >
            <Plus size={16} />
            Create Goal
          </button>
        )}
      </div>

      {/* Goal Creator Form */}
      {isAdding && (
        <form 
          onSubmit={handleSubmit}
          className="glass-panel" 
          style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            {editingGoal ? 'Edit Learning Goal' : 'Create New Goal'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Goal Title *</label>
            <input 
              type="text" 
              placeholder="e.g. Learn Python Programming, Teach Kids Chess" 
              className="input-field"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Description / Context</label>
            <textarea 
              placeholder="e.g. I want to build core Python skills focusing on data structures and automation scripts." 
              className="input-field"
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="form-grid-2col">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
              <input 
                type="text" 
                placeholder="e.g. Coding, Teaching, Career" 
                className="input-field"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Frequency</label>
              <select 
                className="input-field" 
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                style={{ appearance: 'none', background: 'var(--bg-input)' }}
              >
                <option value="weekly">Weekly Plan</option>
                <option value="daily">Daily Commitments</option>
                <option value="fortnightly">Every Two Weeks</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingGoal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      )}

      {/* Goals List Grid */}
      <div className="goals-grid">
        {goals.map(goal => {
          const goalTasks = tasks.filter(t => t.goalId === goal.id);
          const completed = goalTasks.filter(t => t.status === 'completed');
          const progress = goalTasks.length > 0 ? Math.round((completed.length / goalTasks.length) * 100) : 0;

          return (
            <div 
              key={goal.id} 
              className="glass-panel" 
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{goal.title}</h3>
                  {goal.category && (
                    <span style={{ 
                      alignSelf: 'flex-start',
                      fontSize: '0.75rem', 
                      backgroundColor: 'var(--accent-glow)', 
                      color: 'var(--accent-color)', 
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      {goal.category}
                    </span>
                  )}
                </div>
                
                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => handleStartEdit(goal)}
                    className="btn btn-secondary" 
                    style={{ padding: '6px', borderRadius: '6px' }}
                    title="Edit Goal"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${goal.title}"? All related tasks will also be deleted permanently.`)) {
                        onDeleteGoal(goal.id);
                      }
                    }}
                    className="btn btn-secondary" 
                    style={{ padding: '6px', borderRadius: '6px', color: 'var(--danger-color)' }}
                    title="Delete Goal"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', minHeight: '40px', lineBreak: 'anywhere' }}>
                {goal.description || 'No description provided.'}
              </p>

              {/* Progress Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Tasks Completion</span>
                  <span>{progress}% ({completed.length}/{goalTasks.length})</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.4s ease' }} />
                </div>
              </div>

              {/* View Action Toggles */}
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                borderTop: '1px solid var(--border-color)', 
                paddingTop: '14px', 
                marginTop: 'auto' 
              }}>
                <button 
                  onClick={() => setView('ai-consultant')} 
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }}
                >
                  <Sparkles size={14} />
                  Consult AI Coach
                </button>
                <button 
                  onClick={() => setView('tasks')} 
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                >
                  View Tasks
                </button>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && !isAdding && (
          <div style={{ 
            gridColumn: '1 / -1',
            padding: '60px 20px', 
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <Target size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No goals defined yet.</p>
            <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>Add a recurring goal to start generating weekly sub-tasks with the AI.</p>
            <button onClick={() => setIsAdding(true)} className="btn btn-primary">
              <Plus size={14} /> Add First Goal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
