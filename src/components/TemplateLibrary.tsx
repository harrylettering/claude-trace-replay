import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  Star,
  Search,
  FileText,
  Download,
  Upload,
  X,
  Bookmark,
} from 'lucide-react';
import type { PromptTemplate } from '../types/prompt';
import { templateManager } from '../utils/templateManager';

interface TemplateLibraryProps {
  onSelectTemplate?: (template: PromptTemplate) => void;
}

const CATEGORIES: { value: PromptTemplate['category']; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'coding', label: 'Coding' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'writing', label: 'Writing' },
  { value: 'planning', label: 'Planning' },
  { value: 'other', label: 'Other' },
];

export function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PromptTemplate['category'] | 'all'>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
    const unsubscribe = templateManager.subscribe(loadTemplates);
    return unsubscribe;
  }, []);

  const loadTemplates = useCallback(() => {
    setTemplates(templateManager.getAllTemplates());
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'all' || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  const handleCreate = useCallback(() => {
    setEditingTemplate(null);
    setShowEditor(true);
  }, []);

  const handleEdit = useCallback((template: PromptTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      templateManager.deleteTemplate(id);
    }
  }, []);

  const handleDuplicate = useCallback((id: string) => {
    templateManager.duplicateTemplate(id);
  }, []);

  const handleCopy = useCallback(async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleExport = useCallback(() => {
    const data = templateManager.exportLibrary();
    templateManager.downloadJSON(data, `prompt-templates-${Date.now()}.json`);
  }, []);

  const handleImport = useCallback(async (file: File) => {
    try {
      const data = await templateManager.readJSONFile(file);
      const imported = templateManager.importLibrary(data);
      alert(`Imported ${imported} templates successfully.`);
      setShowImport(false);
    } catch (err) {
      alert('Import failed: invalid file format.');
      console.error('Import failed:', err);
    }
  }, []);

  const handleUse = useCallback((template: PromptTemplate) => {
    templateManager.incrementUsage(template.id);
    onSelectTemplate?.(template);
  }, [onSelectTemplate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Prompt Template Library</h3>
          <p className="text-muted text-sm">Save and reuse high-quality prompts</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-surface text-content-secondary hover:bg-surface-hover'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface text-content-secondary hover:bg-surface-hover'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-background rounded-xl border border-border p-5 hover:border-border transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{template.name}</h4>
                  {template.isBuiltIn && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                      Built-in
                    </span>
                  )}
                </div>
                <p className="text-muted text-sm line-clamp-2">{template.description}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {!template.isBuiltIn && (
                  <>
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-1 hover:bg-surface rounded text-muted hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1 hover:bg-red-600/20 rounded text-muted hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDuplicate(template.id)}
                  className="p-1 hover:bg-surface rounded text-muted hover:text-white transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {template.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-surface rounded-full text-xs text-content-secondary"
                >
                  {tag}
                </span>
              ))}
              {template.tags.length > 3 && (
                <span className="px-2 py-0.5 bg-surface rounded-full text-xs text-muted">
                  +{template.tags.length - 3}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {template.variables.length} variables
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {template.usageCount} uses
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleCopy(template.content, template.id)}
                  className="p-1.5 hover:bg-surface rounded text-muted hover:text-white transition-colors"
                  title="Copy content"
                >
                  {copiedId === template.id ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                {onSelectTemplate && (
                  <button
                    onClick={() => handleUse(template)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
                  >
                    Use
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Bookmark className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted">No templates found</p>
            <p className="text-muted text-sm mt-1">Try changing the search criteria or create a new template</p>
          </div>
        )}
      </div>

      {/* Editor modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => setShowEditor(false)}
          onSave={(templateData) => {
            if (editingTemplate) {
              templateManager.updateTemplate(editingTemplate.id, templateData);
            } else {
              templateManager.createTemplate(templateData);
            }
            setShowEditor(false);
          }}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowImport(false)}
          />
          <div className="relative bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Import Template Library</h3>
              <button
                onClick={() => setShowImport(false)}
                className="p-2 hover:bg-surface rounded-lg"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <Upload className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-content-secondary mb-4">Choose a JSON file to import</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(file);
                  }}
                  className="hidden"
                  id="template-import"
                />
                <label
                  htmlFor="template-import"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Choose File
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Template editor
function TemplateEditor({
  template,
  onClose,
  onSave,
}: {
  template: PromptTemplate | null;
  onClose: () => void;
  onSave: (data: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'isBuiltIn'>) => void;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || 'general',
    tags: template?.tags.join(', ') || '',
    content: template?.content || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      variables: templateManager.extractVariables(formData.content),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-background rounded-2xl border border-border shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="text-lg font-semibold">{template ? 'Edit Template' : 'New Template'}</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-surface rounded-lg"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500"
                placeholder="Template name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Description</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500"
                placeholder="Short description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500"
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">
                Prompt Content <span className="text-muted">(use {'{{variable_name}}'} to define variables)</span>
              </label>
              <textarea
                required
                rows={10}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-content focus:outline-none focus:border-blue-500 font-mono text-sm"
                placeholder="Enter the prompt content here. Use {{variable_name}} to define replaceable variables..."
              />
            </div>
            {templateManager.extractVariables(formData.content).length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-300 mb-2">Detected variables:</p>
                <div className="flex flex-wrap gap-2">
                  {templateManager.extractVariables(formData.content).map((v) => {
                    const varStr = `{{${v}}}`;
                    return (
                      <span key={v} className="px-2 py-1 bg-surface rounded text-sm font-mono">
                        {varStr}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 p-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-surface hover:bg-surface-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
