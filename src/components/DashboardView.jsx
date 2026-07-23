import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  CalendarDays, 
  Target, 
  Sparkles,
  AlertCircle,
  Plus,
  ExternalLink
} from 'lucide-react';

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

export default function DashboardView({ 
  goals = [], 
  tasks = [], 
  setView,
  onConsultTaskAI
}) {
  const [activeExternalMenuTaskId, setActiveExternalMenuTaskId] = React.useState(null);

  React.useEffect(() => {
    if (activeExternalMenuTaskId === null) return;
    const handleOutsideClick = () => setActiveExternalMenuTaskId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [activeExternalMenuTaskId]);

  const activeGoalsCount = goals.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  
  const completionRate = totalTasks > 0 
    ? Math.round((completedTasks.length / totalTasks) * 100) 
    : 0;

  // Check for overdue tasks (due date is in the past, status is not completed)
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.dueDate < todayStr);

  // Group upcoming tasks (due today or in the next 7 days, excluding overdue)
  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed' && t.dueDate >= todayStr)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5); // display top 5

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="view-header-flex">
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Aesthetic Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Welcome! Manage your skills, consult with AI, and crush your deadlines.
          </p>
        </div>
        {activeGoalsCount > 0 && (
          <button 
            onClick={() => setView('ai-consultant')} 
            className="btn btn-primary"
          >
            <Sparkles size={16} />
            Consult AI Coach
          </button>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-color)' }}>
            <Target size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Goals</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '2px 0 0 0' }}>{activeGoalsCount}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
            <CheckCircle size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Completion Rate</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>{completionRate}%</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ({completedTasks.length}/{totalTasks})
              </span>
            </div>
            {/* Custom progress bar */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${completionRate}%`, height: '100%', background: 'var(--success-color)', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-color)' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Pending Tasks</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '2px 0 0 0' }}>{pendingTasks.length}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ 
          padding: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          border: overdueTasks.length > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--border-color)',
        }}>
          <div style={{ 
            padding: '12px', 
            borderRadius: '12px', 
            background: overdueTasks.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)', 
            color: overdueTasks.length > 0 ? 'var(--danger-color)' : 'var(--text-muted)' 
          }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Overdue Deadlines</span>
            <h3 style={{ 
              fontSize: '1.6rem', 
              fontWeight: 700, 
              margin: '2px 0 0 0',
              color: overdueTasks.length > 0 ? 'var(--danger-color)' : 'var(--text-primary)'
            }}>
              {overdueTasks.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      {activeGoalsCount === 0 ? (
        /* Empty State */
        <div className="glass-panel" style={{
          padding: '60px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          maxWidth: '600px',
          margin: '40px auto'
        }}>
          <div style={{
            background: 'var(--accent-glow)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-color)'
          }}>
            <Target size={40} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Create Your First Goal</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', fontSize: '0.95rem' }}>
              Define what you want to improve, such as learning Python or teaching kids, and the AI coach will break it down for you.
            </p>
          </div>
          <button onClick={() => setView('goals')} className="btn btn-primary">
            <Plus size={16} />
            Add Custom Goal
          </button>
        </div>
      ) : (
        <div className="dashboard-sections">
          
          {/* Left panel: Upcoming Tasks */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={18} color="var(--accent-color)" />
              Upcoming Deadlines
            </h3>

            {upcomingTasks.length === 0 ? (
              <div style={{ 
                padding: '40px 0', 
                textAlign: 'center', 
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <CheckCircle size={32} style={{ opacity: 0.5 }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>All caught up!</p>
                  <p style={{ fontSize: '0.85rem' }}>No upcoming deadlines scheduled. Generate some new ones!</p>
                </div>
                <button onClick={() => setView('ai-consultant')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  <Sparkles size={12} />
                  Consult AI Coach
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingTasks.map(task => {
                  const goal = goals.find(g => g.id === task.goalId);
                  const isHigh = task.priority === 'high';
                  const isLow = task.priority === 'low';
                  
                  return (
                    <div 
                      key={task.id} 
                      style={{
                        padding: '16px',
                        borderRadius: 'calc(var(--border-radius) * 0.75)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{task.title}</span>
                          {goal && (
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)'
                            }}>
                              {goal.title}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{task.description}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                         {onConsultTaskAI && (
                           <>
                             <button
                               onClick={() => onConsultTaskAI(task)}
                               className="btn btn-secondary"
                               style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--accent-glow)' }}
                               title="Ask AI for study tips and start ideas"
                             >
                               <Sparkles size={12} color="var(--accent-color)" />
                               <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>AI Help</span>
                             </button>
                             
                             <div style={{ position: 'relative', display: 'inline-block' }}>
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setActiveExternalMenuTaskId(activeExternalMenuTaskId === task.id ? null : task.id);
                                 }}
                                 className="btn btn-secondary"
                                 style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                                 title="Search with external AI tools"
                               >
                                 <ExternalLink size={12} />
                               </button>
                               {activeExternalMenuTaskId === task.id && (() => {
                                 const { queryText, links } = getAIExternalLinks(task, goals);
                                 return (
                                   <div className="ai-dropdown-menu" style={{ bottom: 'auto', top: '100%', marginTop: '6px' }}>
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
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          color: isHigh ? 'var(--danger-color)' : isLow ? 'var(--text-muted)' : 'var(--warning-color)',
                          backgroundColor: isHigh ? 'rgba(239, 68, 68, 0.1)' : isLow ? 'rgba(255, 255, 255, 0.05)' : 'rgba(245, 158, 11, 0.1)',
                          textTransform: 'uppercase'
                        }}>
                          {task.priority}
                        </span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{task.dueDate}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due Date</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Active Goals Tracker */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '18px' }}>
              My Active Goals
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {goals.map(goal => {
                const goalTasks = tasks.filter(t => t.goalId === goal.id);
                const comp = goalTasks.filter(t => t.status === 'completed');
                const rate = goalTasks.length > 0 ? Math.round((comp.length / goalTasks.length) * 100) : 0;
                
                return (
                  <div 
                    key={goal.id} 
                    style={{
                      padding: '14px',
                      borderRadius: 'calc(var(--border-radius) * 0.75)',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{goal.title}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-color)' }}>{rate}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${rate}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <span>{goal.frequency} track</span>
                      <span>{comp.length} of {goalTasks.length} tasks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
