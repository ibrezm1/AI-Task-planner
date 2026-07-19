import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Check, 
  MessageSquare,
  Send,
  AlertCircle,
  Settings as SettingsIcon,
  RefreshCw,
  User,
  Bot
} from 'lucide-react';

// Math + Bold Text Parser
const parseBold = (text) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ fontWeight: 700 }}>{part}</strong> : part);
};

const renderLatex = (text) => {
  if (!text) return '';
  if (!window.katex) {
    return parseBold(text); // Fallback to bold parsing if KaTeX hasn't loaded yet
  }

  // Split by $$ (block math) first
  const blockParts = text.split(/\$\$(.*?)\$\$/gs);
  return blockParts.map((blockPart, blockIdx) => {
    // Odd indices are block math
    if (blockIdx % 2 === 1) {
      try {
        const html = window.katex.renderToString(blockPart, { displayMode: true, throwOnError: false });
        return <div key={`block-${blockIdx}`} className="katex-block" dangerouslySetInnerHTML={{ __html: html }} style={{ margin: '14px 0', overflowX: 'auto' }} />;
      } catch (err) {
        return <div key={`block-${blockIdx}`} className="katex-error" style={{ color: 'var(--danger-color)', margin: '8px 0' }}>$${blockPart}$$</div>;
      }
    }

    // Even indices are text which might contain inline math ($...$)
    const inlineParts = blockPart.split(/\$(.*?)\$/g);
    return inlineParts.map((inlinePart, inlineIdx) => {
      // Odd indices are inline math
      if (inlineIdx % 2 === 1) {
        try {
          const html = window.katex.renderToString(inlinePart, { displayMode: false, throwOnError: false });
          return <span key={`inline-${blockIdx}-${inlineIdx}`} className="katex-inline" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch (err) {
          return <span key={`inline-${blockIdx}-${inlineIdx}`} className="katex-error" style={{ color: 'var(--danger-color)' }}>${inlinePart}$</span>;
        }
      }

      // Even indices are standard plain text which might contain bold formatting (**)
      return parseBold(inlinePart);
    });
  });
};

const renderMarkdown = (text) => {
  if (!text) return '';
  return text.split('\n').map((line, index) => {
    if (line.startsWith('### ')) {
      return <h4 key={index} style={{ margin: '12px 0 6px 0', color: 'var(--accent-color)', fontWeight: 700 }}>{renderLatex(line.replace('### ', ''))}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={index} style={{ margin: '14px 0 8px 0', color: 'var(--accent-color)', fontWeight: 700 }}>{renderLatex(line.replace('## ', ''))}</h3>;
    }
    if (line.startsWith('# ')) {
      return <h2 key={index} style={{ margin: '18px 0 10px 0', color: 'var(--accent-color)', fontWeight: 800 }}>{renderLatex(line.replace('# ', ''))}</h2>;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={index} style={{ marginLeft: '20px', listStyleType: 'disc', margin: '6px 0' }}>
          {renderLatex(line.substring(2))}
        </li>
      );
    }
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      return (
        <li key={index} style={{ marginLeft: '20px', listStyleType: 'decimal', margin: '6px 0' }}>
          {renderLatex(numMatch[2])}
        </li>
      );
    }
    return <p key={index} style={{ margin: '8px 0', lineHeight: 1.5 }}>{renderLatex(line)}</p>;
  });
};

export default function AIConsultantView({ 
  goals = [], 
  tasks = [], 
  onAddTasks, 
  aiSettings = {}, 
  setView,
  
  // Async Background AI State passed from App.jsx
  isGenerating,
  proposedTasks = [],
  setProposedTasks,
  chatLog = [],
  setChatLog,
  error,
  setError,
  selectedGoalId,
  setSelectedGoalId,
  onTriggerGenerate,
  aiMode,
  setAiMode,
  onTriggerChat
}) {
  const [userPrompt, setUserPrompt] = useState('');
  const chatEndRef = useRef(null);

  // Initialize selected goal if not set or if it is stale (deleted/missing)
  useEffect(() => {
    if (goals.length > 0) {
      const goalExists = goals.some(g => g.id === selectedGoalId);
      if (!selectedGoalId || !goalExists) {
        setSelectedGoalId(goals[0].id);
      }
    }
  }, [goals, selectedGoalId, setSelectedGoalId]);

  // Scroll to bottom of chat when new logs arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog, isGenerating]);

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  // Handle Send action based on Active Mode
  const handleSendAction = () => {
    if (!userPrompt.trim()) return;
    if (!selectedGoal) return;

    if (aiMode === 'support') {
      onTriggerChat(selectedGoal.id, userPrompt);
    } else {
      onTriggerGenerate(selectedGoal.id, userPrompt);
    }
    setUserPrompt('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAction();
    }
  };

  const handleUpdateTaskField = (taskId, field, value) => {
    setProposedTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleDeleteProposedTask = (taskId) => {
    setProposedTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleAcceptTasks = () => {
    if (proposedTasks.length === 0) return;
    onAddTasks(proposedTasks);
    
    // Clear proposed task pool
    setProposedTasks([]);
    setChatLog([]);
    alert(`Successfully added ${proposedTasks.length} tasks to your active schedule!`);
    setView('tasks');
  };

  const handleClearChat = () => {
    if (window.confirm("Clear conversation history for this goal?")) {
      setChatLog([]);
      setProposedTasks([]);
      setError(null);
    }
  };

  const hasApiKey = aiSettings.provider === 'gemini' 
    ? !!aiSettings.geminiKey 
    : (aiSettings.provider === 'nvidia' ? !!aiSettings.nvidiaKey : !!aiSettings.openRouterKey);

  const currentModelName = aiSettings.provider === 'gemini'
    ? (aiSettings.geminiModel || 'gemini-2.5-flash')
    : (aiSettings.provider === 'nvidia' 
        ? (aiSettings.nvidiaModel || 'meta/llama-3.1-70b-instruct')
        : (aiSettings.openRouterModel || 'meta-llama/llama-3-8b-instruct:free'));

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          AI Coach Consultation
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Discuss learning strategies in Support Chat, then toggle to Plan mode to generate a weekly task schedule.
        </p>
      </div>

      {goals.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={40} color="var(--warning-color)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No Goals Available</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            You need at least one active learning goal to consult the AI. Create one first!
          </p>
          <button onClick={() => setView('goals')} className="btn btn-primary">
            Create Goal
          </button>
        </div>
      ) : (
        <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: proposedTasks.length > 0 ? '1.1fr 1fr' : '3fr 2fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left panel: Chat Console */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top Row: Dropdowns & Mode Toggles */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '16px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              {/* Goal Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Goal:</span>
                <select 
                  className="input-field" 
                  value={selectedGoalId}
                  onChange={e => {
                    setSelectedGoalId(e.target.value);
                    setChatLog([]);
                    setProposedTasks([]);
                  }}
                  style={{ width: '180px', padding: '6px 12px', fontSize: '0.85rem' }}
                  disabled={isGenerating}
                >
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              {/* Mode Slider Selector */}
              <div style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '3px',
                gap: '2px'
              }}>
                <button
                  type="button"
                  onClick={() => setAiMode('support')}
                  className="btn"
                  style={{
                    borderRadius: '16px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    background: aiMode === 'support' ? 'var(--accent-color)' : 'transparent',
                    color: aiMode === 'support' ? '#ffffff' : 'var(--text-secondary)',
                    boxShadow: aiMode === 'support' ? '0 2px 8px var(--accent-glow)' : 'none',
                    border: 'none',
                    fontWeight: 600
                  }}
                  disabled={isGenerating}
                >
                  Support Chat
                </button>
                <button
                  type="button"
                  onClick={() => setAiMode('task')}
                  className="btn"
                  style={{
                    borderRadius: '16px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    background: aiMode === 'task' ? 'var(--accent-color)' : 'transparent',
                    color: aiMode === 'task' ? '#ffffff' : 'var(--text-secondary)',
                    boxShadow: aiMode === 'task' ? '0 2px 8px var(--accent-glow)' : 'none',
                    border: 'none',
                    fontWeight: 600
                  }}
                  disabled={isGenerating}
                >
                  Plan Builder
                </button>
              </div>
            </div>

            {/* API Config details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>Engine: <strong style={{ color: 'var(--text-secondary)' }}>{aiSettings.provider === 'gemini' ? 'Gemini' : 'OpenRouter'}</strong></span>
                <span>•</span>
                <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentModelName}>Model: <strong style={{ color: 'var(--text-secondary)' }}>{currentModelName.split('/').pop()}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleClearChat}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  disabled={isGenerating || chatLog.length === 0}
                  title="Clear Chat Logs"
                >
                  <Trash2 size={12} />
                  Clear Conversation
                </button>
                <button 
                  onClick={() => setView('settings')}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Configure AI API Settings"
                  disabled={isGenerating}
                >
                  <SettingsIcon size={12} />
                  Settings
                </button>
              </div>
            </div>

            {/* API Key missing notification */}
            {!hasApiKey && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--danger-color)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>API Key is missing. Configure keys in <strong>Settings</strong> view first.</span>
              </div>
            )}

            {/* Conversation Log area */}
            <div style={{
              height: '380px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0,0,0,0.15)',
              border: '1px solid var(--border-color)'
            }}>
              {chatLog.length === 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  gap: '12px',
                  padding: '24px'
                }}>
                  <MessageSquare size={32} style={{ opacity: 0.4 }} />
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {aiMode === 'support' ? 'Coach Support Chat' : 'Task List Planner'}
                    </h4>
                    <p style={{ fontSize: '0.8rem', maxWidth: '300px', margin: '0 auto' }}>
                      {aiMode === 'support' 
                        ? 'Ask questions, discuss topics, or clarify study concepts. Math equations ($...$) are rendered instantly.'
                        : 'Review the conversation history and design your actionable task checklist for next week.'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                chatLog.map((msg, i) => (
                  <div 
                    key={i} 
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%'
                    }}
                  >
                    <div style={{
                      padding: '8px',
                      borderRadius: '50%',
                      backgroundColor: msg.role === 'user' ? 'var(--accent-glow)' : 'rgba(255,255,255,0.05)',
                      color: msg.role === 'user' ? 'var(--accent-color)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px'
                    }}>
                      {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className="glass-panel" style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: msg.role === 'user' ? 'var(--accent-color)' : 'rgba(255,255,255,0.02)',
                      color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                      fontSize: '0.9rem',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      lineBreak: 'anywhere'
                    }}>
                      {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                    </div>
                  </div>
                ))
              )}

              {/* Generating spinner inside Chat feed */}
              {isGenerating && (
                <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
                  <div style={{
                    padding: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bot size={14} />
                  </div>
                  <div className="glass-panel" style={{ padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)' }}>
                    <RefreshCw size={14} className="spinner" color="var(--accent-color)" />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {aiMode === 'support' ? 'AI Coach is typing...' : 'AI Coach is designing tasks...'}
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar docked at the bottom */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder={
                  aiMode === 'support' 
                    ? "Ask a question (e.g. 'explain neural network math')..." 
                    : "Add planner instructions (e.g. 'spread them over 4 days')..."
                }
                className="input-field"
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isGenerating || !hasApiKey}
              />
              <button 
                onClick={handleSendAction}
                disabled={isGenerating || !hasApiKey || !userPrompt.trim()}
                className="btn btn-primary"
                style={{ 
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px'
                }}
              >
                {aiMode === 'support' ? (
                  <>
                    <Send size={14} />
                    Chat
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate Plan
                  </>
                )}
              </button>
            </div>

            {error && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.8rem', margin: 0 }}>
                {error}
              </p>
            )}
          </div>

          {/* Right panel: Information Summary OR Proposed Tasks Refinement Grid */}
          <div>
            {proposedTasks.length > 0 ? (
              <div className="glass-panel fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-color)' }}>
                    Proposed Weekly Plan
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {proposedTasks.length} tasks generated
                  </span>
                </div>

                {/* Proposed Tasks Editable cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {proposedTasks.map(task => (
                    <div 
                      key={task.id}
                      className="glass-panel"
                      style={{
                        padding: '14px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text" 
                          className="input-field" 
                          value={task.title}
                          onChange={e => handleUpdateTaskField(task.id, 'title', e.target.value)}
                          style={{ padding: '6px 10px', fontSize: '0.85rem', flex: 1 }}
                        />
                        <button
                          onClick={() => handleDeleteProposedTask(task.id)}
                          className="btn btn-secondary"
                          style={{ padding: '6px', color: 'var(--danger-color)', borderColor: 'rgba(239,68,68,0.2)' }}
                          title="Delete task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <textarea 
                        className="input-field" 
                        rows={2}
                        value={task.description}
                        onChange={e => handleUpdateTaskField(task.id, 'description', e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.8rem', resize: 'none', fontFamily: 'inherit' }}
                        placeholder="Task description..."
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                        <input 
                          type="date" 
                          className="input-field" 
                          value={task.dueDate}
                          onChange={e => handleUpdateTaskField(task.id, 'dueDate', e.target.value)}
                          style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                        />
                        <select 
                          className="input-field" 
                          value={task.priority}
                          onChange={e => handleUpdateTaskField(task.id, 'priority', e.target.value)}
                          style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input 
                            type="number" 
                            step="0.5"
                            className="input-field" 
                            value={task.estimatedHours}
                            onChange={e => handleUpdateTaskField(task.id, 'estimatedHours', parseFloat(e.target.value) || 0)}
                            style={{ padding: '4px 6px', fontSize: '0.75rem', width: '100%' }}
                            placeholder="Hours"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Accept Proposed Tasks button */}
                <button
                  onClick={handleAcceptTasks}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px var(--accent-glow)'
                  }}
                >
                  <Check size={16} />
                  Accept Tasks to Schedule
                </button>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-color)' }}>
                  How it works
                </h3>
                
                <ul style={{ 
                  listStyle: 'none', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px', 
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ color: 'var(--accent-color)', fontWeight: 700 }}>1.</div>
                    <div>Select a recurring goal dropdown and use <strong>Support Chat</strong> to outline ideas or tutor topic materials (LaTeX formula equations and bold Markdown are formatted natively).</div>
                  </li>
                  <li style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ color: 'var(--accent-color)', fontWeight: 700 }}>2.</div>
                    <div>Switch the sliding toggle to <strong>Plan Builder</strong> mode. Enter instructions if needed, or leave it blank.</div>
                  </li>
                  <li style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ color: 'var(--accent-color)', fontWeight: 700 }}>3.</div>
                    <div>Click <strong>Generate Plan</strong>. The AI reviews the conversation history on the left to design custom week tasks.</div>
                  </li>
                  <li style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ color: 'var(--accent-color)', fontWeight: 700 }}>4.</div>
                    <div>The proposed checklist will populate right here. Edit parameters, remove unwanted tasks, and click <strong>Accept Tasks</strong> to append to your Kanban schedule.</div>
                  </li>
                </ul>

                {selectedGoal && (
                  <div style={{ 
                    marginTop: '16px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid var(--border-color)' 
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                      Goal Context
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                      {selectedGoal.title}
                    </strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineBreak: 'anywhere' }}>
                      {selectedGoal.description || 'No description added yet.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
