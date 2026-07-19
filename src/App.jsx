import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import GoalsView from './components/GoalsView';
import AIConsultantView from './components/AIConsultantView';
import TaskBoardView from './components/TaskBoardView';
import CalendarView from './components/CalendarView';
import SettingsView from './components/SettingsView';
import ThemeManager, { applyTheme } from './components/ThemeManager';
import { mongoSync } from './services/mongoSync';
import { aiService } from './services/aiService';
import { Sparkles, Check, AlertTriangle, Menu } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'ai_task_tracker_state_v1';

export default function App() {
  // Navigation
  const [currentView, setView] = useState('dashboard');
  const [aiNotifyState, setAiNotifyState] = useState(null); // 'spinning' | 'dot' | null

  const handleSetView = (view) => {
    setView(view);
    if (view === 'ai-consultant') {
      setAiNotifyState(null);
    }
  };

  // Core App State
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState({
    provider: 'gemini',
    geminiKey: '',
    openRouterKey: '',
    nvidiaKey: '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',
    corsProxy: '',
    geminiModel: 'gemini-2.5-flash',
    openRouterModel: 'meta-llama/llama-3-8b-instruct:free',
    nvidiaModel: 'openai/gpt-oss-120b',
    filterFreeModels: true,
    mongoApiUrl: 'https://verecel-mongo.vercel.app/api/mongo',
    mongoConnectionString: '',
    mongoDb: '',
    mongoCollection: '',
    mongoDocumentId: 'ai_task_tracker_sync',
    theme: 'dark',
    accentColor: '#8b5cf6',
    borderRadius: 16
  });

  // Async Background AI Task Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiProposedTasks, setAiProposedTasks] = useState([]);
  const [aiChatLog, setAiChatLog] = useState([]);
  const [aiError, setAiError] = useState(null);
  const [aiSelectedGoalId, setAiSelectedGoalId] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [aiMode, setAiMode] = useState('support');

  // MongoDB Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  // 1. Initial State Load from LocalStorage
  useEffect(() => {
    const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed.goals) setGoals(parsed.goals);
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.settings) {
          const loadedSettings = { ...settings, ...parsed.settings };
          setSettings(loadedSettings);
          // Apply theme immediately
          applyTheme(loadedSettings.theme, loadedSettings.accentColor, loadedSettings.borderRadius);
        }
        if (parsed.aiProposedTasks) setAiProposedTasks(parsed.aiProposedTasks);
        if (parsed.aiChatLog) setAiChatLog(parsed.aiChatLog);
        if (parsed.aiSelectedGoalId) setAiSelectedGoalId(parsed.aiSelectedGoalId);
        if (parsed.aiMode) setAiMode(parsed.aiMode);
        if (parsed.aiNotifyState) setAiNotifyState(parsed.aiNotifyState);
      } catch (err) {
        console.error("Failed to parse local storage state:", err);
      }
    } else {
      // First boot default styling
      applyTheme(settings.theme, settings.accentColor, settings.borderRadius);
    }
    setIsLoaded(true);
  }, []);

  // 2. Persist to LocalStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    const stateObj = { goals, tasks, settings, aiProposedTasks, aiChatLog, aiSelectedGoalId, aiMode, aiNotifyState };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateObj));
  }, [goals, tasks, settings, aiProposedTasks, aiChatLog, aiSelectedGoalId, aiMode, aiNotifyState, isLoaded]);

  // Toast Autoclean
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 3. Goals Mutations
  const handleAddGoal = (goalData) => {
    const newGoal = {
      id: `goal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...goalData
    };
    setGoals(prev => [newGoal, ...prev]);
  };

  const handleEditGoal = (goalId, goalData) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return { ...g, ...goalData };
      }
      return g;
    }));
  };

  const handleDeleteGoal = (goalId) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    setTasks(prev => prev.filter(t => t.goalId !== goalId));
    // Clear proposed tasks if they belong to the deleted goal
    setAiProposedTasks(prev => prev.filter(t => t.goalId !== goalId));
  };

  // 4. Tasks Mutations
  const handleAddTasks = (newTasksList) => {
    const formatted = newTasksList.map(t => ({
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      completedAt: null,
      ...t
    }));
    setTasks(prev => [...formatted, ...prev]);
  };

  const handleUpdateTask = (taskId, taskData) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, ...taskData };
      }
      return t;
    }));
  };

  const handleDeleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // 5. Settings Save
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    // Apply styling parameters
    applyTheme(newSettings.theme, newSettings.accentColor, newSettings.borderRadius);
  };

  // 6. Backup Importer / Exporter
  const handleResetData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setAiProposedTasks([]);
    setAiChatLog([]);
    setAiSelectedGoalId('');
    setAiMode('support');
    setSettings({
      provider: 'gemini',
      geminiKey: '',
      openRouterKey: '',
      nvidiaKey: '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',
      corsProxy: '',
      geminiModel: 'gemini-2.5-flash',
      openRouterModel: 'meta-llama/llama-3-8b-instruct:free',
      nvidiaModel: 'openai/gpt-oss-120b',
      filterFreeModels: true,
      mongoApiUrl: 'https://verecel-mongo.vercel.app/api/mongo',
      mongoConnectionString: '',
      mongoDb: '',
      mongoCollection: '',
      mongoDocumentId: 'ai_task_tracker_sync',
      theme: 'dark',
      accentColor: '#8b5cf6',
      borderRadius: 16
    });
    applyTheme('dark', '#8b5cf6', 16);
    alert('All local profile data has been wiped.');
  };

  const handleImportData = (importedState) => {
    if (importedState.goals) setGoals(importedState.goals);
    if (importedState.tasks) setTasks(importedState.tasks);
    if (importedState.settings) {
      setSettings(importedState.settings);
      applyTheme(importedState.settings.theme, importedState.settings.accentColor, importedState.settings.borderRadius);
    }
    if (importedState.aiProposedTasks) setAiProposedTasks(importedState.aiProposedTasks);
    if (importedState.aiChatLog) setAiChatLog(importedState.aiChatLog);
    if (importedState.aiSelectedGoalId) setAiSelectedGoalId(importedState.aiSelectedGoalId);
    if (importedState.aiMode) setAiMode(importedState.aiMode);
  };

  const handleExportData = () => {
    const stateObj = { goals, tasks, settings, aiProposedTasks, aiChatLog, aiSelectedGoalId, aiMode };
    const blob = new Blob([JSON.stringify(stateObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `task-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 7. Background Async Task Generator Trigger
  const triggerAITaskGeneration = async (goalId, feedbackText = '') => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    setIsGenerating(true);
    setAiError(null);
    setAiNotifyState('spinning');

    const promptText = feedbackText || `Generate my tasks for next week.`;
    
    // Append to Chat Log
    const newChatLog = [...aiChatLog, { role: 'user', content: promptText }];
    setAiChatLog(newChatLog);

    try {
      const apiKey = settings.provider === 'gemini' 
        ? settings.geminiKey 
        : (settings.provider === 'nvidia' ? settings.nvidiaKey : settings.openRouterKey);
      const model = settings.provider === 'gemini' 
        ? settings.geminiModel 
        : (settings.provider === 'nvidia' ? settings.nvidiaModel : settings.openRouterModel);
      
      const goalTasks = tasks.filter(t => t.goalId === goal.id);

      const generated = await aiService.generateTasks({
        provider: settings.provider,
        apiKey,
        model,
        goal,
        existingTasks: goalTasks,
        chatHistory: aiChatLog, // Pass entire conversational context
        userFeedback: feedbackText,
        corsProxy: settings.corsProxy
      });

      if (Array.isArray(generated) && generated.length > 0) {
        const tasksWithIds = generated.map((t, idx) => ({
          id: `proposed-${Date.now()}-${idx}`,
          title: t.title || 'Untitled Task',
          description: t.description || '',
          dueDate: t.dueDate || new Date(Date.now() + (idx + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: t.priority || 'medium',
          estimatedHours: t.estimatedHours || 1,
          goalId: goal.id
        }));

        setAiProposedTasks(tasksWithIds);
        setAiChatLog([...newChatLog, {
          role: 'assistant',
          content: `Here are ${tasksWithIds.length} tasks I proposed for your goal "${goal.title}". You can review, delete, or refine them below.`
        }]);

        setAiNotifyState(currentView === 'ai-consultant' ? null : 'dot');

        // Trigger floating toast notification if user is on another view
        if (currentView !== 'ai-consultant') {
          setToastMessage({
            type: 'success',
            text: `AI Coach proposed ${tasksWithIds.length} tasks for "${goal.title}"!`,
            actionView: 'ai-consultant'
          });
        }
      } else {
        throw new Error("AI returned empty task list or invalid format.");
      }
    } catch (err) {
      console.error(err);
      setAiError(err.message);
      setAiChatLog([...newChatLog, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}. Check your API configurations.`
      }]);
      
      setAiNotifyState(currentView === 'ai-consultant' ? null : 'dot');
      
      if (currentView !== 'ai-consultant') {
        setToastMessage({
          type: 'error',
          text: `AI Coach planning failed: ${err.message.substring(0, 45)}...`,
          actionView: 'ai-consultant'
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerAIChatSupport = async (goalId, userMessageText) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    setIsGenerating(true);
    setAiError(null);
    setAiNotifyState('spinning');

    const newChatLog = [...aiChatLog, { role: 'user', content: userMessageText }];
    setAiChatLog(newChatLog);

    try {
      const apiKey = settings.provider === 'gemini' 
        ? settings.geminiKey 
        : (settings.provider === 'nvidia' ? settings.nvidiaKey : settings.openRouterKey);
      const model = settings.provider === 'gemini' 
        ? settings.geminiModel 
        : (settings.provider === 'nvidia' ? settings.nvidiaModel : settings.openRouterModel);

      const aiResponse = await aiService.chatSupport({
        provider: settings.provider,
        apiKey,
        model,
        goal,
        chatHistory: newChatLog,
        corsProxy: settings.corsProxy
      });

      setAiChatLog([...newChatLog, {
        role: 'assistant',
        content: aiResponse
      }]);
      setAiNotifyState(currentView === 'ai-consultant' ? null : 'dot');
    } catch (err) {
      console.error(err);
      setAiError(err.message);
      setAiChatLog([...newChatLog, {
        role: 'assistant',
        content: `Sorry, I encountered a chat error: ${err.message}. Check your API configurations.`
      }]);
      setAiNotifyState(currentView === 'ai-consultant' ? null : 'dot');
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerTaskHelp = async (task) => {
    const goal = goals.find(g => g.id === task.goalId);
    if (!goal) return;

    // Reset proposed tasks pool
    setAiProposedTasks([]);
    
    // Switch navigation and set active AI goal
    setView('ai-consultant');
    setAiSelectedGoalId(task.goalId);
    
    setIsGenerating(true);
    setAiError(null);

    const promptText = `Provide start ideas and guide me to achieve task: "${task.title}" under the goal "${goal.title}"`;
    const newChatLog = [...aiChatLog, { role: 'user', content: promptText }];
    setAiChatLog(newChatLog);

    try {
      const apiKey = settings.provider === 'gemini' 
        ? settings.geminiKey 
        : (settings.provider === 'nvidia' ? settings.nvidiaKey : settings.openRouterKey);
      const model = settings.provider === 'gemini' 
        ? settings.geminiModel 
        : (settings.provider === 'nvidia' ? settings.nvidiaModel : settings.openRouterModel);

      const helpText = await aiService.getTaskHelp({
        provider: settings.provider,
        apiKey,
        model,
        goal,
        task,
        corsProxy: settings.corsProxy
      });

      setAiChatLog([...newChatLog, {
        role: 'assistant',
        content: helpText
      }]);
    } catch (err) {
      console.error(err);
      setAiError(err.message);
      setAiChatLog([...newChatLog, {
        role: 'assistant',
        content: `Sorry, I encountered an error providing advice: ${err.message}.`
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // 8. MongoDB Vercel Cloud Sync Actions (Push & Pull)
  const handleTriggerSync = async () => {
    if (!settings.mongoApiUrl || !settings.mongoConnectionString || !settings.mongoDb || !settings.mongoCollection) {
      alert("MongoDB credentials not configured. Please fill them in under Settings.");
      setView('settings');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Syncing with MongoDB...');

    try {
      // First, try to Pull & Merge or Push? 
      // To keep it safe, we'll Push current state.
      const stateObj = { goals, tasks, settings, aiProposedTasks, aiChatLog, aiSelectedGoalId, aiMode };
      const res = await mongoSync.pushState(
        settings.mongoApiUrl,
        settings.mongoConnectionString,
        settings.mongoDb,
        settings.mongoCollection,
        settings.mongoDocumentId,
        stateObj
      );
      
      const details = res.wasCompressed 
        ? `Compressed: ${(res.compressedSize / 1024).toFixed(2)} KB (Was ${(res.rawSize / 1024).toFixed(2)} KB)`
        : `Raw size: ${(res.rawSize / 1024).toFixed(2)} KB`;

      setSyncStatus(`Sync Successful. ${details}`);
    } catch (err) {
      console.error(err);
      setSyncStatus(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
      // Auto-clear success message after 5s
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const handlePullSync = async () => {
    if (!settings.mongoApiUrl || !settings.mongoConnectionString || !settings.mongoDb || !settings.mongoCollection) {
      alert("MongoDB credentials not configured.");
      setView('settings');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('Retrieving cloud backup...');

    try {
      const data = await mongoSync.pullState(
        settings.mongoApiUrl,
        settings.mongoConnectionString,
        settings.mongoDb,
        settings.mongoCollection,
        settings.mongoDocumentId
      );

      if (data) {
        handleImportData(data);
        setSyncStatus('Cloud data restored successfully.');
      } else {
        throw new Error("Empty state returned from MongoDB.");
      }
    } catch (err) {
      console.error(err);
      setSyncStatus(`Restore failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Theme Manager Injected parameters */}
      <ThemeManager 
        theme={settings.theme} 
        accentColor={settings.accentColor} 
        borderRadius={settings.borderRadius} 
      />

      {/* Mobile Header Top Bar */}
      <header className="mobile-topbar">
        <button
          onClick={() => setMobileMenuOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Menu size={24} />
        </button>
        <span style={{ fontWeight: 800, fontFamily: 'var(--font-headings)', fontSize: '1.15rem' }}>
          Co-Pilot AI
        </span>
        <div style={{ width: '24px' }} /> {/* Right Spacer */}
      </header>

      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView}
        setView={handleSetView}
        goalsCount={goals.length}
        pendingTasksCount={pendingTasksCount}
        mongoConfig={settings}
        onTriggerSync={handleTriggerSync}
        syncStatus={syncStatus}
        isSyncing={isSyncing}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Floating Async notification Toast */}
        {toastMessage && (
          <div 
            onClick={() => handleSetView(toastMessage.actionView)}
            className="glass-panel"
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              padding: '12px 20px',
              zIndex: 999,
              cursor: 'pointer',
              border: `1.5px solid ${toastMessage.type === 'error' ? 'var(--danger-color)' : 'var(--success-color)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
              animation: 'fadeIn 0.3s ease-out'
            }}
          >
            {toastMessage.type === 'error' ? (
              <AlertTriangle size={18} color="var(--danger-color)" />
            ) : (
              <Sparkles size={18} color="var(--accent-color)" className="spinner" />
            )}
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{toastMessage.text}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginLeft: '10px', textDecoration: 'underline' }}>
              View Plan
            </span>
          </div>
        )}

        {/* Dynamic Views routing */}
        {currentView === 'dashboard' && (
          <DashboardView 
            goals={goals}
            tasks={tasks}
            setView={handleSetView}
            onConsultTaskAI={triggerTaskHelp}
          />
        )}

        {currentView === 'goals' && (
          <GoalsView 
            goals={goals}
            tasks={tasks}
            onAddGoal={handleAddGoal}
            onEditGoal={handleEditGoal}
            onDeleteGoal={handleDeleteGoal}
            setView={handleSetView}
          />
        )}

        {currentView === 'ai-consultant' && (
          <AIConsultantView 
            goals={goals}
            tasks={tasks}
            aiSettings={settings}
            setView={handleSetView}
            // Passing async background props
            onAddTasks={handleAddTasks}
            isGenerating={isGenerating}
            proposedTasks={aiProposedTasks}
            setProposedTasks={setAiProposedTasks}
            chatLog={aiChatLog}
            setChatLog={setAiChatLog}
            error={aiError}
            setError={setAiError}
            selectedGoalId={aiSelectedGoalId}
            setSelectedGoalId={setAiSelectedGoalId}
            onTriggerGenerate={triggerAITaskGeneration}
            aiMode={aiMode}
            setAiMode={setAiMode}
            onTriggerChat={triggerAIChatSupport}
          />
        )}

        {currentView === 'tasks' && (
          <TaskBoardView 
            goals={goals}
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onConsultTaskAI={triggerTaskHelp}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView 
            goals={goals}
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onConsultTaskAI={triggerTaskHelp}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView 
            settings={settings}
            goals={goals}
            tasks={tasks}
            onSaveSettings={handleSaveSettings}
            onResetData={handleResetData}
            onImportData={handleImportData}
            onExportData={handleExportData}
            // In case they want to run pull sync from settings directly
            onPullSync={handlePullSync}
            onPushSync={handleTriggerSync}
          />
        )}
      </main>
    </div>
  );
}
