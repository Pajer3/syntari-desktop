// Syntari AI IDE - Template Manager Dialog
// Manage custom file templates for new file creation

import React, { useState, useEffect } from 'react';
import { BaseDialog } from '../../ui/BaseDialog';
import { TemplateManager, FileTemplate, TEMPLATE_CATEGORIES } from '../../../config/fileTemplates';
import { validateFileName } from '../../../utils/fileValidation';

interface TemplateManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TemplateForm {
  name: string;
  extension: string;
  content: string;
  description: string;
  icon: string;
  category: string;
  tags: string;
}

const DEFAULT_FORM: TemplateForm = {
  name: '',
  extension: '.txt',
  content: '',
  description: '',
  icon: '📄',
  category: 'custom',
  tags: '',
};

const PREDEFINED_ICONS = [
  '📄', '🔷', '🟨', '⚛️', '🎨', '📝', '🌐', '📦',
  '⚙️', '🧪', '📋', '🔧', '💾', '🖼️', '🎯', '📊'
];

export const TemplateManagerDialog: React.FC<TemplateManagerDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [userTemplates, setUserTemplates] = useState<FileTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FileTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<TemplateForm>(DEFAULT_FORM);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load user templates when dialog opens
  useEffect(() => {
    if (isOpen) {
      const allTemplates = TemplateManager.getAllTemplates();
      const userOnly = allTemplates.filter(t => t.isUserTemplate);
      setUserTemplates(userOnly);
      setSelectedTemplate(null);
      setIsEditing(false);
      setIsCreating(false);
      setForm(DEFAULT_FORM);
      setValidationErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = 'Template name is required';
    }

    if (!form.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!form.extension.trim()) {
      errors.extension = 'File extension is required';
    } else if (!form.extension.startsWith('.')) {
      errors.extension = 'Extension must start with a dot (.)';
    } else {
      // Validate the extension as a filename
      const validation = validateFileName(`test${form.extension}`);
      if (validation?.severity === 'error') {
        errors.extension = 'Invalid file extension';
      }
    }

    if (!form.category) {
      errors.category = 'Category is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTemplate(null);
    setForm(DEFAULT_FORM);
    setValidationErrors({});
  };

  const handleEdit = (template: FileTemplate) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedTemplate(template);
    setForm({
      name: template.name,
      extension: template.extension,
      content: template.content,
      description: template.description,
      icon: template.icon,
      category: template.category,
      tags: template.tags.join(', '),
    });
    setValidationErrors({});
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const templateData = {
        name: form.name.trim(),
        extension: form.extension.trim(),
        content: form.content,
        description: form.description.trim(),
        icon: form.icon,
        category: form.category,
        tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      if (isEditing && selectedTemplate) {
        // Update existing template (remove and re-add)
        TemplateManager.removeUserTemplate(selectedTemplate.id);
        TemplateManager.addUserTemplate(templateData);
      } else {
        // Create new template
        TemplateManager.addUserTemplate(templateData);
      }

      TemplateManager.saveUserTemplates();

      // Refresh the list
      const allTemplates = TemplateManager.getAllTemplates();
      const userOnly = allTemplates.filter(t => t.isUserTemplate);
      setUserTemplates(userOnly);

      // Reset form
      setIsCreating(false);
      setIsEditing(false);
      setSelectedTemplate(null);
      setForm(DEFAULT_FORM);
      setValidationErrors({});
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (template: FileTemplate) => {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      return;
    }

    setIsLoading(true);
    try {
      TemplateManager.removeUserTemplate(template.id);
      TemplateManager.saveUserTemplates();

      // Refresh the list
      const allTemplates = TemplateManager.getAllTemplates();
      const userOnly = allTemplates.filter(t => t.isUserTemplate);
      setUserTemplates(userOnly);

      // Clear selection if deleted template was selected
      if (selectedTemplate?.id === template.id) {
        setSelectedTemplate(null);
        setIsEditing(false);
        setForm(DEFAULT_FORM);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedTemplate(null);
    setForm(DEFAULT_FORM);
    setValidationErrors({});
  };

  const updateForm = (field: keyof TemplateForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const showingForm = isCreating || isEditing;

  const dialogContent = (
    <div className="flex h-full">
      {/* Template List */}
      <div className="w-1/3 border-r border-vscode-border flex flex-col">
        <div className="p-4 border-b border-vscode-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-vscode-fg">Custom Templates</h3>
            <button
              onClick={handleCreateNew}
              disabled={isLoading}
              className="
                px-3 py-1 text-xs font-medium text-white
                bg-vscode-accent hover:bg-vscode-accent-hover
                border border-vscode-accent rounded
                focus:outline-none focus:ring-2 focus:ring-vscode-accent
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              + New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {userTemplates.length === 0 ? (
            <div className="flex items-center justify-center h-full text-vscode-fg-muted">
              <div className="text-center">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm">No custom templates</p>
                <p className="text-xs mt-1">Create your first template</p>
              </div>
            </div>
          ) : (
            <div className="p-2">
              {userTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`
                    flex items-center space-x-2 p-3 rounded cursor-pointer mb-2
                    transition-all duration-150
                    ${selectedTemplate?.id === template.id 
                      ? 'bg-vscode-list-active text-vscode-list-active-fg' 
                      : 'hover:bg-vscode-list-hover'
                    }
                  `}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <span className="text-lg">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-vscode-fg truncate">
                      {template.name}
                    </div>
                    <div className="text-xs text-vscode-fg-muted truncate">
                      {template.extension} • {template.category}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(template);
                      }}
                      className="
                        p-1 text-xs text-vscode-fg hover:text-vscode-accent
                        hover:bg-vscode-button-hover rounded
                        transition-colors
                      "
                      title="Edit template"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template);
                      }}
                      className="
                        p-1 text-xs text-vscode-fg hover:text-red-400
                        hover:bg-vscode-button-hover rounded
                        transition-colors
                      "
                      title="Delete template"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Details / Editor */}
      <div className="flex-1 flex flex-col">
        {showingForm ? (
          // Template Form
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-vscode-border">
              <h3 className="text-sm font-medium text-vscode-fg">
                {isCreating ? 'Create New Template' : 'Edit Template'}
              </h3>
            </div>

            <form className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-vscode-fg mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  className={`
                    w-full px-3 py-2 bg-vscode-input-bg border rounded
                    text-vscode-fg placeholder-vscode-fg-muted
                    focus:outline-none focus:ring-2 focus:ring-vscode-accent
                    ${validationErrors.name ? 'border-red-500' : 'border-vscode-border'}
                  `}
                  placeholder="e.g., React Hook"
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-400 mt-1">{validationErrors.name}</p>
                )}
              </div>

              {/* File Extension */}
              <div>
                <label className="block text-sm font-medium text-vscode-fg mb-2">
                  File Extension *
                </label>
                <input
                  type="text"
                  value={form.extension}
                  onChange={(e) => updateForm('extension', e.target.value)}
                  className={`
                    w-full px-3 py-2 bg-vscode-input-bg border rounded
                    text-vscode-fg placeholder-vscode-fg-muted
                    focus:outline-none focus:ring-2 focus:ring-vscode-accent
                    ${validationErrors.extension ? 'border-red-500' : 'border-vscode-border'}
                  `}
                  placeholder="e.g., .tsx"
                />
                {validationErrors.extension && (
                  <p className="text-sm text-red-400 mt-1">{validationErrors.extension}</p>
                )}
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-vscode-fg mb-2">
                  Icon
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => updateForm('icon', e.target.value)}
                    className="
                      flex-1 px-3 py-2 bg-vscode-input-bg border border-vscode-border rounded
                      text-vscode-fg placeholder-vscode-fg-muted
                      focus:outline-none focus:ring-2 focus:ring-vscode-accent
                    "
                    placeholder="e.g., ⚛️"
                  />
                  <div className="flex space-x-1">
                    {PREDEFINED_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => updateForm('icon', icon)}
                        className="
                          p-2 hover:bg-vscode-button-hover rounded
                          transition-colors
                        "
                        title={`Use ${icon}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-vscode-fg mb-2">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => updateForm('category', e.target.value)}
                  className={`
                    w-full px-3 py-2 bg-vscode-input-bg border rounded
                    text-vscode-fg
                    focus:outline-none focus:ring-2 focus:ring-vscode-accent
                    ${validationErrors.category ? 'border-red-500' : 'border-vscode-border'}
                  `}
                >
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
                {validationErrors.category && (
                  <p className="text-sm text-red-400 mt-1">{validationErrors.category}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-vscode-fg mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  className={`
                    w-full px-3 py-2 bg-vscode-input-bg border rounded
                    text-vscode-fg placeholder-vscode-fg-muted
                    focus:outline-none focus:ring-2 focus:ring-vscode-accent
                    ${validationErrors.description ? 'border-red-500' : 'border-vscode-border'}
                  `}
                  placeholder="Brief description of the template"
                />
                {validationErrors.description && (
                  <p className="text-sm text-red-400 mt-1">{validationErrors.description}</p>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-vscode-fg mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => updateForm('tags', e.target.value)}
                  className="
                    w-full px-3 py-2 bg-vscode-input-bg border border-vscode-border rounded
                    text-vscode-fg placeholder-vscode-fg-muted
                    focus:outline-none focus:ring-2 focus:ring-vscode-accent
                  "
                  placeholder="comma, separated, tags"
                />
                <p className="text-xs text-vscode-fg-muted mt-1">
                  Used for searching templates
                </p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-vscode-fg mb-2">
                  Template Content
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => updateForm('content', e.target.value)}
                  rows={8}
                  className="
                    w-full px-3 py-2 bg-vscode-input-bg border border-vscode-border rounded
                    text-vscode-fg placeholder-vscode-fg-muted font-mono text-sm
                    focus:outline-none focus:ring-2 focus:ring-vscode-accent
                    resize-vertical
                  "
                  placeholder="Template content with placeholders..."
                />
                <p className="text-xs text-vscode-fg-muted mt-1">
                  This content will be inserted when the template is used
                </p>
              </div>
            </form>

            {/* Form Actions */}
            <div className="p-4 border-t border-vscode-border flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="
                  px-4 py-2 text-sm font-medium text-vscode-fg
                  border border-vscode-border rounded hover:bg-vscode-button-hover
                  focus:outline-none focus:ring-2 focus:ring-vscode-accent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="
                  px-4 py-2 text-sm font-medium text-white
                  bg-vscode-accent hover:bg-vscode-accent-hover
                  border border-vscode-accent rounded
                  focus:outline-none focus:ring-2 focus:ring-vscode-accent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors flex items-center
                "
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Template'
                )}
              </button>
            </div>
          </div>
        ) : selectedTemplate ? (
          // Template Preview
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-vscode-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{selectedTemplate.icon}</span>
                  <h3 className="text-sm font-medium text-vscode-fg">
                    {selectedTemplate.name}
                  </h3>
                </div>
                <button
                  onClick={() => handleEdit(selectedTemplate)}
                  className="
                    px-3 py-1 text-xs font-medium text-vscode-fg
                    border border-vscode-border rounded hover:bg-vscode-button-hover
                    focus:outline-none focus:ring-2 focus:ring-vscode-accent
                    transition-colors
                  "
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-vscode-fg mb-2">Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-vscode-fg-muted">Extension:</span>{' '}
                    <span className="font-mono">{selectedTemplate.extension}</span>
                  </div>
                  <div>
                    <span className="text-vscode-fg-muted">Category:</span>{' '}
                    <span>{selectedTemplate.category}</span>
                  </div>
                  <div>
                    <span className="text-vscode-fg-muted">Description:</span>{' '}
                    <span>{selectedTemplate.description}</span>
                  </div>
                  {selectedTemplate.tags.length > 0 && (
                    <div>
                      <span className="text-vscode-fg-muted">Tags:</span>{' '}
                      <span>{selectedTemplate.tags.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-vscode-fg mb-2">Content Preview</h4>
                <pre className="
                  p-3 bg-vscode-sidebar border border-vscode-border rounded
                  text-sm font-mono text-vscode-fg whitespace-pre-wrap
                  overflow-auto max-h-64
                ">
                  {selectedTemplate.content || '(Empty template)'}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          // No Selection
          <div className="flex items-center justify-center h-full text-vscode-fg-muted">
            <div className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <p>Select a template to view details</p>
              <p className="text-xs mt-1">or create a new custom template</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const dialogFooter = (
    <div className="flex justify-between items-center">
      <div className="text-xs text-vscode-fg-muted">
        Manage your custom file templates for quick file creation
      </div>
      <button
        onClick={onClose}
        className="
          px-4 py-2 text-sm font-medium text-vscode-fg
          border border-vscode-border rounded hover:bg-vscode-button-hover
          focus:outline-none focus:ring-2 focus:ring-vscode-accent
          transition-colors
        "
      >
        Close
      </button>
    </div>
  );

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Template Manager"
      subtitle="Create and manage custom file templates"
      width="800px"
      height="600px"
      maxHeight="90vh"
      footer={dialogFooter}
    >
      {dialogContent}
    </BaseDialog>
  );
}; 