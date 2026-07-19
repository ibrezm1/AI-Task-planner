import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  Database, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Download,
  Upload,
  Trash2,
  Moon,
  Info,
  RefreshCw
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { mongoSync } from '../services/mongoSync';
import { THEME_PRESETS, ACCENT_COLORS } from './ThemeManager';

export default function SettingsView({ 
  settings, 
  onSaveSettings,
  onResetData,
  onImportData,
  onExportData,
  goals,
  tasks
}) {
  // Provider Selection
  const [provider, setProvider] = useState(settings.provider || 'gemini');

  // API Keys
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '');
  const [openRouterKey, setOpenRouterKey] = useState(settings.openRouterKey || '');
  const [nvidiaKey, setNvidiaKey] = useState(settings.nvidiaKey || '');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showNvidiaKey, setShowNvidiaKey] = useState(false);

  // Models
  const [geminiModel, setGeminiModel] = useState(settings.geminiModel || 'gemini-1.5-flash');
  const [openRouterModel, setOpenRouterModel] = useState(settings.openRouterModel || 'meta-llama/llama-3-8b-instruct:free');
  const [nvidiaModel, setNvidiaModel] = useState(settings.nvidiaModel || 'meta/llama-3.1-70b-instruct');
  const [openRouterModelsList, setOpenRouterModelsList] = useState([]);
  const [filterFreeModels, setFilterFreeModels] = useState(settings.filterFreeModels ?? true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [corsProxy, setCorsProxy] = useState(settings.corsProxy || '');

  // MongoDB Settings
  const [mongoApiUrl, setMongoApiUrl] = useState(settings.mongoApiUrl || 'https://verecel-mongo.vercel.app/api/mongo');
  const [mongoConnectionString, setMongoConnectionString] = useState(settings.mongoConnectionString || '');
  const [mongoDb, setMongoDb] = useState(settings.mongoDb || '');
  const [mongoCollection, setMongoCollection] = useState(settings.mongoCollection || '');
  const [mongoDocumentId, setMongoDocumentId] = useState(settings.mongoDocumentId || 'ai_task_tracker_sync');
  const [showConnectionString, setShowConnectionString] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // AI Connection Test States
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState(null);
  const [testingNvidia, setTestingNvidia] = useState(false);
  const [nvidiaTestResult, setNvidiaTestResult] = useState(null);
  const [testingOpenRouter, setTestingOpenRouter] = useState(false);
  const [openRouterTestResult, setOpenRouterTestResult] = useState(null);

  // Theme Settings
  const [theme, setTheme] = useState(settings.theme || 'dark');
  const [accentColor, setAccentColor] = useState(settings.accentColor || '#8b5cf6');
  const [borderRadius, setBorderRadius] = useState(settings.borderRadius ?? 16);

  // Sync local inputs if settings prop updates (e.g. loaded asynchronously from localStorage)
  useEffect(() => {
    if (settings) {
      setProvider(settings.provider || 'gemini');
      setGeminiKey(settings.geminiKey || '');
      setOpenRouterKey(settings.openRouterKey || '');
      setNvidiaKey(settings.nvidiaKey || '');
      setCorsProxy(settings.corsProxy || '');
      setGeminiModel(settings.geminiModel || 'gemini-1.5-flash');
      setOpenRouterModel(settings.openRouterModel || 'meta-llama/llama-3-8b-instruct:free');
      setNvidiaModel(settings.nvidiaModel || 'meta/llama-3.1-70b-instruct');
      setFilterFreeModels(settings.filterFreeModels ?? true);
      setMongoApiUrl(settings.mongoApiUrl || 'https://verecel-mongo.vercel.app/api/mongo');
      setMongoConnectionString(settings.mongoConnectionString || '');
      setMongoDb(settings.mongoDb || '');
      setMongoCollection(settings.mongoCollection || '');
      setMongoDocumentId(settings.mongoDocumentId || 'ai_task_tracker_sync');
      setTheme(settings.theme || 'dark');
      setAccentColor(settings.accentColor || '#8b5cf6');
      setBorderRadius(settings.borderRadius ?? 16);
    }
  }, [settings]);

  // Trigger loading OpenRouter models list on mount or when provider swaps
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const fetched = await aiService.fetchOpenRouterModels();
        setOpenRouterModelsList(fetched);
      } catch (err) {
        console.warn("Could not retrieve OpenRouter models list dynamically:", err);
      } finally {
        setIsLoadingModels(false);
      }
    };
    
    if (provider === 'openrouter' && openRouterModelsList.length === 0) {
      loadModels();
    }
  }, [provider]);

  // Handle Save
  const handleSave = () => {
    onSaveSettings({
      provider,
      geminiKey,
      openRouterKey,
      nvidiaKey,
      corsProxy,
      geminiModel,
      openRouterModel,
      nvidiaModel,
      filterFreeModels,
      mongoApiUrl,
      mongoConnectionString,
      mongoDb,
      mongoCollection,
      mongoDocumentId,
      theme,
      accentColor,
      borderRadius
    });
    alert('Settings saved successfully!');
  };

  // Test MongoDB Connection
  const handleTestConnection = async () => {
    if (!mongoApiUrl || !mongoConnectionString || !mongoDb || !mongoCollection) {
      setTestResult({ success: false, message: 'Please fill in all MongoDB fields before testing.' });
      return;
    }
    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await mongoSync.testConnection(mongoApiUrl, mongoConnectionString, mongoDb, mongoCollection);
      setTestResult({ success: true, message: `Successfully connected! Active collection size: ${res.data?.count ?? 0} documents.` });
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestGemini = async () => {
    if (!geminiKey) {
      setGeminiTestResult({ success: false, message: 'Please enter Gemini API Key first.' });
      return;
    }
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await aiService.testConnection({ provider: 'gemini', apiKey: geminiKey, model: geminiModel, corsProxy });
      setGeminiTestResult(res);
    } catch (err) {
      setGeminiTestResult({ success: false, message: err.message });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestNvidia = async () => {
    if (!nvidiaKey) {
      setNvidiaTestResult({ success: false, message: 'Please enter Nvidia API Key first.' });
      return;
    }
    setTestingNvidia(true);
    setNvidiaTestResult(null);
    try {
      const res = await aiService.testConnection({ provider: 'nvidia', apiKey: nvidiaKey, model: nvidiaModel, corsProxy });
      setNvidiaTestResult(res);
    } catch (err) {
      setNvidiaTestResult({ success: false, message: err.message });
    } finally {
      setTestingNvidia(false);
    }
  };

  const handleTestOpenRouter = async () => {
    if (!openRouterKey) {
      setOpenRouterTestResult({ success: false, message: 'Please enter OpenRouter API Key first.' });
      return;
    }
    setTestingOpenRouter(true);
    setOpenRouterTestResult(null);
    try {
      const res = await aiService.testConnection({ provider: 'openrouter', apiKey: openRouterKey, model: openRouterModel, corsProxy });
      setOpenRouterTestResult(res);
    } catch (err) {
      setOpenRouterTestResult({ success: false, message: err.message });
    } finally {
      setTestingOpenRouter(false);
    }
  };

  // Filter OpenRouter list based on toggle
  const displayedModels = openRouterModelsList.filter(m => !filterFreeModels || m.isFree);

  // File import helper
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        onImportData(parsed);
        alert('Data backup imported successfully!');
      } catch (err) {
        alert('Failed to parse backup file. Make sure it is valid JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Configuration & Style
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your AI assistant credentials, MongoDB cloud backup synchronizations, and personalize visual theme parameters.
        </p>
      </div>

      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Settings Form Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* AI Credentials */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Key size={18} color="var(--accent-color)" />
              AI Service Configuration
            </h3>

            {/* Provider Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AI Engine Provider</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setProvider('gemini')}
                  className={`btn ${provider === 'gemini' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  Direct Google Gemini API
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('nvidia')}
                  className={`btn ${provider === 'nvidia' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  Nvidia NIM API
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('openrouter')}
                  className={`btn ${provider === 'openrouter' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  OpenRouter API Hub
                </button>
              </div>
            </div>

            {/* Google Gemini Configuration Card */}
            <div 
              className="fade-in"
              style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                border: provider === 'gemini' ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                backgroundColor: provider === 'gemini' ? 'rgba(var(--accent-color-rgb), 0.04)' : 'transparent',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: provider === 'gemini' ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                  Google Gemini Engine
                </h4>
                {provider === 'gemini' ? (
                  <span style={{ fontSize: '0.72rem', color: 'var(--success-color)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Active
                  </span>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setProvider('gemini')}
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '0.72rem', height: 'auto' }}
                  >
                    Activate
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Gemini API Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    className="input-field"
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    style={{ paddingRight: '45px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Gemini Model</label>
                <select
                  className="input-field"
                  value={geminiModel}
                  onChange={e => setGeminiModel(e.target.value)}
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>

              {/* Test Button & Result */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleTestGemini}
                  disabled={testingGemini}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', minWidth: '110px', height: 'auto' }}
                >
                  {testingGemini ? <RefreshCw size={12} className="spinner" /> : null}
                  {testingGemini ? 'Testing...' : 'Test Key'}
                </button>
                {geminiTestResult && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '0.78rem',
                    color: geminiTestResult.success ? 'var(--success-color)' : 'var(--danger-color)'
                  }}>
                    {geminiTestResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                    <span>{geminiTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Nvidia NIM Configuration Card */}
            <div 
              className="fade-in"
              style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                border: provider === 'nvidia' ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                backgroundColor: provider === 'nvidia' ? 'rgba(var(--accent-color-rgb), 0.04)' : 'transparent',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: provider === 'nvidia' ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                  Nvidia NIM Engine
                </h4>
                {provider === 'nvidia' ? (
                  <span style={{ fontSize: '0.72rem', color: 'var(--success-color)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Active
                  </span>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setProvider('nvidia')}
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '0.72rem', height: 'auto' }}
                  >
                    Activate
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nvidia API Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNvidiaKey ? 'text' : 'password'}
                    placeholder="nvapi-..."
                    className="input-field"
                    value={nvidiaKey}
                    onChange={e => setNvidiaKey(e.target.value)}
                    style={{ paddingRight: '45px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNvidiaKey(!showNvidiaKey)}
                    style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showNvidiaKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nvidia NIM Model</label>
                <input
                  type="text"
                  placeholder="meta/llama-3.1-70b-instruct"
                  className="input-field"
                  value={nvidiaModel}
                  onChange={e => setNvidiaModel(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  E.g., <code>meta/llama-3.1-70b-instruct</code>, <code>openai/gpt-oss-120b</code>, or <code>deepseek-ai/deepseek-r1</code>.
                </span>
              </div>

              {/* Test Button & Result */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleTestNvidia}
                  disabled={testingNvidia}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', minWidth: '110px', height: 'auto' }}
                >
                  {testingNvidia ? <RefreshCw size={12} className="spinner" /> : null}
                  {testingNvidia ? 'Testing...' : 'Test Key'}
                </button>
                {nvidiaTestResult && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '0.78rem',
                    color: nvidiaTestResult.success ? 'var(--success-color)' : 'var(--danger-color)'
                  }}>
                    {nvidiaTestResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                    <span>{nvidiaTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* OpenRouter Configuration Card */}
            <div 
              className="fade-in"
              style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                border: provider === 'openrouter' ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                backgroundColor: provider === 'openrouter' ? 'rgba(var(--accent-color-rgb), 0.04)' : 'transparent',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: provider === 'openrouter' ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                  OpenRouter Engine Hub
                </h4>
                {provider === 'openrouter' ? (
                  <span style={{ fontSize: '0.72rem', color: 'var(--success-color)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Active
                  </span>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setProvider('openrouter')}
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '0.72rem', height: 'auto' }}
                  >
                    Activate
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>OpenRouter API Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showOpenRouterKey ? 'text' : 'password'}
                    placeholder="sk-or-v1-..."
                    className="input-field"
                    value={openRouterKey}
                    onChange={e => setOpenRouterKey(e.target.value)}
                    style={{ paddingRight: '45px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                    style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showOpenRouterKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Free models toggle filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="filterFree"
                  checked={filterFreeModels}
                  onChange={e => setFilterFreeModels(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                />
                <label htmlFor="filterFree" style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Filter Free Models Only
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>OpenRouter Model</label>
                <select
                  className="input-field"
                  value={openRouterModel}
                  onChange={e => setOpenRouterModel(e.target.value)}
                  disabled={isLoadingModels}
                >
                  {isLoadingModels ? (
                    <option>Loading models list...</option>
                  ) : displayedModels.length > 0 ? (
                    displayedModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.isFree ? '(Free)' : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B Instruct (Free)</option>
                      <option value="google/gemini-2.5-flash:free">Gemini 2.5 Flash (Free)</option>
                      <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B Instruct (Free)</option>
                      <option value="microsoft/phi-3-mini-128k-instruct:free">Phi 3 Mini (Free)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Test Button & Result */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleTestOpenRouter}
                  disabled={testingOpenRouter}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', minWidth: '110px', height: 'auto' }}
                >
                  {testingOpenRouter ? <RefreshCw size={12} className="spinner" /> : null}
                  {testingOpenRouter ? 'Testing...' : 'Test Key'}
                </button>
                {openRouterTestResult && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '0.78rem',
                    color: openRouterTestResult.success ? 'var(--success-color)' : 'var(--danger-color)'
                  }}>
                    {openRouterTestResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                    <span>{openRouterTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* CORS Proxy URL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                CORS Bypass Proxy URL (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., https://corsproxy.io/?"
                className="input-field"
                value={corsProxy}
                onChange={e => setCorsProxy(e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                If your engine provider blocks browser requests (e.g., Nvidia NIM CORS error), route them through a proxy like <code>https://corsproxy.io/?</code> or your own self-hosted proxy. Leave blank for direct connections.
              </span>
            </div>
          </div>

          {/* MongoDB Cloud Synchronization settings */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={18} color="var(--accent-color)" />
              MongoDB Sync Engine (Vercel Backend)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Vercel API endpoint URL</label>
              <input
                type="text"
                placeholder="https://verecel-mongo.vercel.app/api/mongo"
                className="input-field"
                value={mongoApiUrl}
                onChange={e => setMongoApiUrl(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>MongoDB Connection URI</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConnectionString ? 'text' : 'password'}
                  placeholder="mongodb+srv://user:pass@cluster.mongodb.net/?..."
                  className="input-field"
                  value={mongoConnectionString}
                  onChange={e => setMongoConnectionString(e.target.value)}
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConnectionString(!showConnectionString)}
                  style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showConnectionString ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Database Name</label>
                <input
                  type="text"
                  placeholder="test"
                  className="input-field"
                  value={mongoDb}
                  onChange={e => setMongoDb(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Collection Name</label>
                <input
                  type="text"
                  placeholder="tasks"
                  className="input-field"
                  value={mongoCollection}
                  onChange={e => setMongoCollection(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sync Document ID (Unique Key)</label>
              <input
                type="text"
                placeholder="ai_task_tracker_sync"
                className="input-field"
                value={mongoDocumentId}
                onChange={e => setMongoDocumentId(e.target.value)}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Allows backing up and loading multiple profiles onto the same collection.
              </span>
            </div>

            {/* Test Connection Button */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start', minWidth: '150px' }}
              >
                {testingConnection ? <RefreshCw size={14} className="spinner" /> : null}
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </button>

              {testResult && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.8rem',
                  color: testResult.success ? 'var(--success-color)' : 'var(--danger-color)'
                }}>
                  {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Styling, Backup, Reset Sidebar Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Aesthetic Personalization */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Moon size={18} color="var(--accent-color)" />
              Aesthetic Theme
            </h3>

            {/* Presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Visual Theme Preset</label>
              <select
                value={theme}
                onChange={e => setTheme(e.target.value)}
                className="input-field"
              >
                {THEME_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Accent color selectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Highlight Color</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {ACCENT_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setAccentColor(color.value)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: color.value,
                      border: accentColor === color.value ? '2.5px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      transition: 'transform 0.2s ease',
                      transform: accentColor === color.value ? 'scale(1.15)' : 'none'
                    }}
                    title={color.name}
                  />
                ))}
                
                {/* Custom Color Input Pick */}
                <input 
                  type="color" 
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    padding: 0,
                    border: '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer'
                  }}
                  title="Choose Custom Color"
                />
              </div>
            </div>

            {/* Border Radius */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <label>Border Roundness</label>
                <span>{borderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="2"
                value={borderRadius}
                onChange={e => setBorderRadius(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
              />
            </div>
          </div>

          {/* Backup & System operations */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>System Actions</h3>
            
            {/* Backup Exporter */}
            <button
              type="button"
              onClick={onExportData}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Download size={14} />
              Export Backup (JSON)
            </button>

            {/* Backup Importer */}
            <label
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', textAlign: 'center' }}
            >
              <Upload size={14} />
              Import Backup (JSON)
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                style={{ display: 'none' }}
              />
            </label>

            <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '8px 0' }} />

            {/* Factory Reset */}
            <button
              type="button"
              onClick={() => {
                if (window.confirm("WARNING: This will delete ALL goals, tasks, and settings stored in this browser. This cannot be undone! Proceed?")) {
                  onResetData();
                }
              }}
              className="btn btn-danger"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Trash2 size={14} />
              Wipe Local Storage
            </button>
          </div>
        </div>
      </div>

      {/* Save Settings Bar (Footer float wrapper) */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid var(--accent-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <Info size={16} color="var(--accent-color)" />
          <span>Confirm edits to save changes globally in this session.</span>
        </div>
        <button onClick={handleSave} className="btn btn-primary" style={{ padding: '12px 24px' }}>
          Save Configuration
        </button>
      </div>
    </div>
  );
}
