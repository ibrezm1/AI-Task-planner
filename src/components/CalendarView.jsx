import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Square,
  Clock,
  Sparkles,
  ExternalLink
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
      { name: 'Meta AI (Copy Prompt)', url: `https://www.meta.ai/` }
    ]
  };
};

export default function CalendarView({ 
  goals = [], 
  tasks = [], 
  onUpdateTask,
  onConsultTaskAI
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateTasks, setSelectedDateTasks] = useState(null);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [activeExternalMenuTaskId, setActiveExternalMenuTaskId] = useState(null);

  React.useEffect(() => {
    if (activeExternalMenuTaskId === null) return;
    const handleOutsideClick = () => setActiveExternalMenuTaskId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [activeExternalMenuTaskId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper values for generating month grid
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateTasks(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateTasks(null);
  };

  const handleToggleStatusInCalendar = (task) => {
    const isCompleted = task.status === 'completed';
    const nextStatus = isCompleted ? 'pending' : 'completed';
    
    if (nextStatus === 'completed') {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }

    onUpdateTask(task.id, { 
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : null
    });

    // Update list dynamically in current view
    if (selectedDateTasks) {
      setSelectedDateTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          return { ...t, status: nextStatus };
        }
        return t;
      }));
    }
  };

  // Generate date array
  const dayCells = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    dayCells.push({ dayNum: d, month: m, year: y, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    dayCells.push({ dayNum: i, month: month, year: year, isCurrentMonth: true });
  }

  // Next month padding days (up to 42 cells total)
  const remaining = 42 - dayCells.length;
  for (let i = 1; i <= remaining; i++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    dayCells.push({ dayNum: i, month: m, year: y, isCurrentMonth: false });
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleDayClick = (cell) => {
    const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.dayNum).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.dueDate === dateStr);
    setSelectedDateTasks(dayTasks);
    setSelectedDateStr(dateStr);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="view-header-flex">
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Consolidated Schedule
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track deadlines across the monthly calendar grid view.
          </p>
        </div>
        
        {/* Month Selector Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handlePrevMonth} className="btn btn-secondary" style={{ padding: '8px' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: '150px', textAlign: 'center' }}>
            {monthNames[month]} {year}
          </span>
          <button onClick={handleNextMonth} className="btn btn-secondary" style={{ padding: '8px' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="calendar-layout" style={{ display: 'grid', gridTemplateColumns: selectedDateTasks ? '2.5fr 1fr' : '1fr', gap: '24px' }}>
        
        {/* Calendar Grid Box */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          {/* Weekday Titles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '12px' }}>
            {weekdays.map(d => (
              <span key={d} style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {dayCells.map((cell, idx) => {
              const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.dayNum).padStart(2, '0')}`;
              const dayTasks = tasks.filter(t => t.dueDate === dateStr);
              const pendingCount = dayTasks.filter(t => t.status !== 'completed').length;
              const completedCount = dayTasks.filter(t => t.status === 'completed').length;
              const hasTasks = dayTasks.length > 0;
              const isSelected = selectedDateStr === dateStr;

              // Check if cell represents today
              const localToday = new Date();
              const isToday = cell.dayNum === localToday.getDate() && 
                              cell.month === localToday.getMonth() && 
                              cell.year === localToday.getFullYear();

              return (
                <div 
                  key={idx}
                  onClick={() => handleDayClick(cell)}
                  style={{
                    minHeight: '80px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: isSelected 
                      ? 'var(--accent-glow)' 
                      : cell.isCurrentMonth 
                        ? 'rgba(255,255,255,0.01)' 
                        : 'rgba(255,255,255,0.002)',
                    border: isSelected 
                      ? '1.5px solid var(--accent-color)' 
                      : isToday 
                        ? '1.5px solid var(--text-muted)' 
                        : '1px solid var(--border-color)',
                    opacity: cell.isCurrentMonth ? 1 : 0.4,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 12px var(--accent-glow)' : 'none'
                  }}
                  className="calendar-cell"
                >
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: isToday || isSelected ? 800 : 500,
                    color: isToday ? 'var(--accent-color)' : 'var(--text-primary)',
                    alignSelf: 'flex-start'
                  }}>
                    {cell.dayNum}
                  </span>

                  {hasTasks && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      {/* Task Pills */}
                      {dayTasks.slice(0, 2).map(task => {
                        const isDone = task.status === 'completed';
                        return (
                          <div 
                            key={task.id} 
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 4px',
                              borderRadius: '3px',
                              backgroundColor: isDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                              color: isDone ? 'var(--success-color)' : 'var(--accent-color)',
                              border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              fontWeight: 500
                            }}
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        );
                      })}
                      {dayTasks.length > 2 && (
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: '2px' }}>
                          +{dayTasks.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Drawer Details */}
        {selectedDateTasks && (
          <div className="glass-panel fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Details for
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2px 0 0 0' }}>
                {selectedDateStr}
              </h3>
            </div>

            {selectedDateTasks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                No tasks scheduled on this day.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedDateTasks.map(task => {
                  const goal = goals.find(g => g.id === task.goalId);
                  const isDone = task.status === 'completed';
                  return (
                    <div 
                      key={task.id} 
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'rgba(255, 255, 255, 0.01)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyItems: 'space-between', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleStatusInCalendar(task)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isDone ? 'var(--success-color)' : 'var(--text-muted)',
                            padding: 0,
                            marginTop: '2px'
                          }}
                        >
                          {isDone ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ 
                            fontSize: '0.88rem', 
                            fontWeight: 600,
                            textDecoration: isDone ? 'line-through' : 'none',
                            color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                            lineBreak: 'anywhere'
                          }}>
                            {task.title}
                          </span>
                          {goal && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Goal: {goal.title}
                            </span>
                          )}
                        </div>

                         {onConsultTaskAI && (
                           <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                             <button
                               onClick={() => onConsultTaskAI(task)}
                               style={{
                                 background: 'none',
                                 border: 'none',
                                 cursor: 'pointer',
                                 color: 'var(--accent-color)',
                                 padding: '2px',
                                 display: 'flex',
                                 alignItems: 'center'
                               }}
                               title="Ask AI for study tips and start ideas"
                             >
                               <Sparkles size={14} />
                             </button>
                             
                             <div style={{ position: 'relative', display: 'inline-block' }}>
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setActiveExternalMenuTaskId(activeExternalMenuTaskId === task.id ? null : task.id);
                                 }}
                                 style={{
                                   background: 'none',
                                   border: 'none',
                                   cursor: 'pointer',
                                   color: 'var(--text-secondary)',
                                   padding: '2px',
                                   display: 'flex',
                                   alignItems: 'center'
                                 }}
                                 title="Search with external AI tools"
                               >
                                 <ExternalLink size={14} />
                               </button>
                               {activeExternalMenuTaskId === task.id && (() => {
                                 const { queryText, links } = getAIExternalLinks(task, goals);
                                 return (
                                   <div className="ai-dropdown-menu" style={{ transform: 'translateX(30%)' }}>
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
                           </div>
                         )}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineBreak: 'anywhere' }}>
                        {task.description}
                      </p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>Priority: <strong>{task.priority || 'medium'}</strong></span>
                        <span>Estimate: <strong>{task.estimatedHours || 1} hrs</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
