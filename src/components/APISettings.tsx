import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Check, Trash2, Server, Key, Cpu, Save, Loader2, TestTube } from 'lucide-react';
import type { LLMConfig } from '../types/prompt';
import { llmConfigManager } from '../utils/templateManager';
import { createLLMClient, validateConfig } from '../utils/llmClient';

interface APISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function APISettings({ isOpen, onClose }: APISettingsProps) {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<LLMConfig>>({});
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
    }
  }, [isOpen]);

  const loadConfigs = useCallback(() => {
    setConfigs(llmConfigManager.getAllConfigs());
  }, []);

  const handleAdd = useCallback(() => {
    const newConfig: Partial<LLMConfig> = {
      name: '',
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4-turbo-preview',
      isDefault: configs.length === 0,
    };
    setEditingConfig(newConfig);
    setEditingId('new');
    setErrors([]);
  }, [configs.length]);

  const handleEdit = useCallback((config: LLMConfig) => {
    setEditingConfig({ ...config });
    setEditingId(config.id);
    setErrors([]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      llmConfigManager.deleteConfig(id);
      loadConfigs();
    }
  }, [loadConfigs]);

  const handleSave = useCallback(() => {
    const validation = validateConfig(editingConfig as LLMConfig);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (editingId === 'new') {
      llmConfigManager.addConfig(editingConfig as Omit<LLMConfig, 'id'>);
    } else if (editingId) {
      llmConfigManager.updateConfig(editingId, editingConfig);
    }

    setEditingId(null);
    setEditingConfig({});
    setErrors([]);
    loadConfigs();
  }, [editingId, editingConfig, loadConfigs]);

  const handleTest = useCallback(async (config: LLMConfig) => {
    setIsTesting(config.id);
    setTestResult(null);

    try {
      const client = createLLMClient(config);
      const success = await client.testConnection();
      setTestResult({
        id: config.id,
        success,
        message: success ? 'Connection successful' : 'Connection failed',
      });
    } catch (err) {
      setTestResult({
        id: config.id,
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      });
    } finally {
      setIsTesting(null);
    }
  }, []);

  const handleSetDefault = useCallback((id: string) => {
    llmConfigManager.setDefault(id);
    loadConfigs();
  }, [loadConfigs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Server className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">API Settings</h2>
              <p className="text-sm text-content-secondary">Configure an LLM API for deeper analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-content-secondary" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* 配置列表 */}
          <div className="space-y-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`bg-surface-hover/50 rounded-lg border p-4 ${
                  editingId === config.id ? 'border-blue-500' : 'border-border'
                }`}
              >
                {editingId === config.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-content mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editingConfig.name || ''}
                          onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-content mb-1">
                          Model
                        </label>
                        <input
                          type="text"
                          value={editingConfig.model || ''}
                          onChange={(e) => setEditingConfig({ ...editingConfig, model: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content mb-1">
                        API URL
                      </label>
                      <input
                        type="text"
                        value={editingConfig.baseURL || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, baseURL: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500 font-mono text-sm"
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content mb-1">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={editingConfig.apiKey || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500 font-mono text-sm"
                      />
                    </div>
                    {errors.length > 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <ul className="list-disc list-inside text-sm text-red-400 space-y-1">
                          {errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingConfig({});
                        }}
                        className="px-3 py-2 bg-surface-hover hover:bg-surface rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{config.name}</span>
                          {config.isDefault && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-content-secondary space-y-1">
                          <div className="flex items-center gap-2">
                            <Server className="w-3 h-3" />
                            <span className="font-mono">{config.baseURL}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Cpu className="w-3 h-3" />
                            <span>{config.model}</span>
                          </div>
                          {config.apiKey && (
                            <div className="flex items-center gap-2">
                              <Key className="w-3 h-3" />
                              <span className="font-mono">••••••••</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {testResult?.id === config.id && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            testResult.success
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {testResult.message}
                          </span>
                        )}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleTest(config)}
                            disabled={isTesting === config.id}
                            className="p-1.5 hover:bg-surface-hover rounded text-content-secondary hover:text-white transition-colors"
                            title="Test connection"
                          >
                            {isTesting === config.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <TestTube className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(config)}
                            className="p-1.5 hover:bg-surface-hover rounded text-content-secondary hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          {!config.isDefault && (
                            <button
                              onClick={() => handleSetDefault(config.id)}
                              className="p-1.5 hover:bg-surface-hover rounded text-content-secondary hover:text-white transition-colors"
                              title="Set as default"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="p-1.5 hover:bg-red-600/20 rounded text-content-secondary hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 新增配置 */}
            {editingId === 'new' && (
              <div className="bg-surface-hover/50 rounded-lg border border-blue-500 p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-content mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editingConfig.name || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500"
                        placeholder="My API"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-content mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        value={editingConfig.model || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, model: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500"
                        placeholder="gpt-4-turbo-preview"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-content mb-1">
                      API URL
                    </label>
                    <input
                      type="text"
                      value={editingConfig.baseURL || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, baseURL: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500 font-mono text-sm"
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-content mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={editingConfig.apiKey || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                  {errors.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <ul className="list-disc list-inside text-sm text-red-400 space-y-1">
                        {errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditingConfig({});
                      }}
                      className="px-3 py-2 bg-surface-hover hover:bg-surface rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 添加按钮 */}
            {editingId === null && (
              <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border hover:border-content-secondary rounded-lg text-content-secondary hover:text-content transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add API Configuration
              </button>
            )}
          </div>

          {/* 说明 */}
          <div className="mt-6 p-4 bg-surface-hover/30 rounded-lg">
            <h3 className="text-sm font-medium text-content mb-2">Supported APIs</h3>
            <p className="text-sm text-content-secondary">
              Any service compatible with the OpenAI Chat Completions API format can be used, including:
            </p>
            <ul className="text-sm text-content-secondary mt-2 space-y-1 list-disc list-inside">
              <li>OpenAI (GPT-4, GPT-3.5)</li>
              <li>Anthropic Claude (through a compatibility layer)</li>
              <li>Azure OpenAI Service</li>
              <li>Locally hosted models (Ollama, vLLM, and others)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
