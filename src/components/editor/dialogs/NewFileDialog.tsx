// Syntari AI IDE - New File Dialog Component
// VS Code-style new file creation with configurable templates

import React, { useState, useEffect, useRef } from 'react';
import { validateFileName, suggestFileName } from '../../../utils/fileValidation';
import { BaseDialog } from '../../ui/BaseDialog';
import { TemplateManager, FileTemplate, TEMPLATE_CATEGORIES, TemplateCategory } from '../../../config/fileTemplates';

interface NewFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (fileName: string, content?: string) => Promise<void>;
  currentPath?: string;
  presetFileName?: string;
  presetContent?: string;
  projectType?: string; // For filtering templates
}

// Helper function to shorten paths for display (browser-compatible)
const shortenPath = (path: string): string => {
  if (!path) return '';
  
  // Simple path shortening for display - remove long prefixes
  if (path.length > 50) {
    const parts = path.split('/');
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join('/')}`;
    }
  }
  
  return path;
};

export const NewFileDialog: React.FC<NewFileDialogProps> = ({
  isOpen,
  onClose,
  onCreateFile,
  currentPath = '',
  presetFileName = '',
  presetContent = '',
  projectType,
}) => {
  const [fileName, setFileName] = useState(presetFileName);
  const [fileContent, setFileContent] = useState(presetContent);
  const [selectedTemplate, setSelectedTemplate] = useState<FileTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templates, setTemplates] = useState<FileTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load templates when dialog opens or project type changes
  useEffect(() => {
    if (isOpen) {
      const allTemplates = TemplateManager.getAllTemplates(projectType);
      setTemplates(allTemplates);
      
      // Get categories that have templates
      const usedCategories = TEMPLATE_CATEGORIES.filter(category =>
        allTemplates.some(template => template.category === category.id)
      ).sort((a, b) => a.order - b.order);
      
      setCategories([
        { id: 'all', name: 'All Templates', icon: '📋', order: 0 },
        { id: 'recent', name: 'Recent', icon: '🕒', order: 0.5 },
        ...usedCategories
      ]);
    }
  }, [isOpen, projectType]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFileName(presetFileName || 'newfile.ts');
      setFileContent(presetContent);
      setSelectedTemplate(null);
      setValidationError(null);
      setIsLoading(false);
      setShowAdvanced(false);
      setSearchQuery('');
      setSelectedCategory('all');
      
      // Focus input with a small delay
      setTimeout(() => {
        inputRef.current?.focus();
        // Select filename without extension for easier editing
        const name = presetFileName || 'newfile';
        const lastDotIndex = name.lastIndexOf('.');
        if (lastDotIndex > 0) {
          inputRef.current?.setSelectionRange(0, lastDotIndex);
        } else {
          inputRef.current?.select();
        }
      }, 100);
    }
  }, [isOpen, presetFileName, presetContent]);

  // Real-time validation with file existence checking
  useEffect(() => {
    const checkFileAndValidate = async () => {
      if (fileName.trim()) {
        const validation = validateFileName(fileName.trim());
        
        // Check if file already exists
        if (!validation || validation.severity !== 'error') {
          try {
            const { fileSystemService } = await import('../../../services/fileSystemService');
            const files = await fileSystemService.loadFolderContents(currentPath || '', false);
            const fileExists = files.some(file => 
              !file.isDirectory && 
              file.name.toLowerCase() === fileName.trim().toLowerCase()
            );
            
            if (fileExists) {
              setValidationError(`File '${fileName}' already exists`);
            } else {
              setValidationError(validation?.message || null);
            }
          } catch (error) {
            // If we can't check, just use the filename validation
            setValidationError(validation?.message || null);
          }
        } else {
          setValidationError(validation.message);
        }
      } else {
        setValidationError('File name cannot be empty');
      }
    };

    checkFileAndValidate();
  }, [fileName, currentPath]);

  // Filter templates based on search and category
  const filteredTemplates = React.useMemo(() => {
    let filtered = templates;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = TemplateManager.searchTemplates(searchQuery, projectType);
    }

    // Apply category filter
    if (selectedCategory === 'recent') {
      filtered = TemplateManager.getRecentTemplates();
    } else if (selectedCategory !== 'all') {
      filtered = TemplateManager.getTemplatesByCategory(selectedCategory, projectType);
    }

    return filtered;
  }, [templates, searchQuery, selectedCategory, projectType]);

  const handleTemplateSelect = (template: FileTemplate) => {
    setSelectedTemplate(template);
    
    if (template.extension) {
      // Update filename with template extension
      const nameWithoutExt = fileName.split('.')[0] || 'newfile';
      setFileName(nameWithoutExt + template.extension);
    }
    
    setFileContent(template.content);
  };

  const handleSubmit = async () => {
    const trimmedFileName = fileName.trim();
    if (!trimmedFileName) {
      setValidationError('File name cannot be empty');
      return;
    }

    const validation = validateFileName(trimmedFileName);
    if (validation?.severity === 'error') {
      setValidationError(validation.message);
      return;
    }

    setIsLoading(true);
    try {
      await onCreateFile(trimmedFileName, fileContent);
      onClose();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to create file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileNameSuggestion = () => {
    const suggested = suggestFileName(fileName);
    setFileName(suggested);
  };

  const dialogContent = (
    <div className="flex flex-col h-full">
      {/* Current Directory Indicator */}
      {currentPath && (
        <div className="px-4 py-3 bg-vscode-sidebar border-b border-vscode-border">
          <span className="text-xs text-vscode-fg-muted">Creating in: </span>
          <span className="text-xs font-mono text-vscode-accent">{shortenPath(currentPath)}</span>
        </div>
      )}

      {/* Search and Category Filter */}
      <div className="p-4 border-b border-vscode-border space-y-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="
            w-full px-3 py-2 bg-vscode-input-bg border border-vscode-border rounded
            text-vscode-fg placeholder-vscode-fg-muted text-sm
            focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:border-vscode-accent
          "
        />
        
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                px-3 py-1 text-xs font-medium rounded-full
                flex items-center space-x-1
                transition-all duration-200
                ${selectedCategory === category.id
                  ? 'bg-vscode-accent text-white'
                  : 'bg-vscode-sidebar text-vscode-fg border border-vscode-border hover:bg-vscode-list-hover'
                }
              `}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* File Templates */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-vscode-fg mb-3">
            Templates
            {filteredTemplates.length > 0 && (
              <span className="text-xs text-vscode-fg-muted ml-2">
                ({filteredTemplates.length} available)
              </span>
            )}
          </h3>
          
          {filteredTemplates.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-vscode-fg-muted">
              <div className="text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p>No templates found</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-sm text-vscode-accent hover:text-vscode-accent-hover"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`
                    flex items-center space-x-2 p-3 rounded border text-left
                    hover:bg-vscode-button-hover transition-colors
                    focus:outline-none focus:ring-2 focus:ring-vscode-accent
                    ${selectedTemplate?.id === template.id 
                      ? 'border-vscode-accent bg-vscode-accent bg-opacity-10' 
                      : 'border-vscode-border'
                    }
                  `}
                >
                  <span className="text-lg">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-vscode-fg">{template.name}</div>
                    <div className="text-xs text-vscode-fg-muted truncate">{template.description}</div>
                    {template.isUserTemplate && (
                      <div className="text-xs text-vscode-accent mt-1">Custom</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-4 border-t border-vscode-border space-y-4">
        {/* File Name Input */}
        <div>
          <label htmlFor="fileName" className="block text-sm font-medium text-vscode-fg mb-2">
            File Name
          </label>
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              disabled={isLoading}
              className={`
                flex-1 px-3 py-2 bg-vscode-input-bg border rounded
                text-vscode-fg placeholder-vscode-fg-muted
                focus:outline-none focus:ring-2 focus:ring-vscode-accent
                disabled:opacity-50 disabled:cursor-not-allowed
                ${validationError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-vscode-border focus:border-vscode-accent'
                }
              `}
              placeholder="Enter file name..."
              autoComplete="off"
              spellCheck={false}
            />
            {validationError && validationError.includes('invalid') && (
              <button
                type="button"
                onClick={handleFileNameSuggestion}
                className="
                  px-3 py-2 text-sm font-medium text-vscode-fg
                  border border-vscode-border rounded hover:bg-vscode-button-hover
                  focus:outline-none focus:ring-2 focus:ring-vscode-accent
                  transition-colors
                "
                title="Fix file name"
              >
                Fix
              </button>
            )}
          </div>
          
          {/* Validation Messages */}
          {validationError && (
            <p className="text-sm text-red-400 mt-1 flex items-center">
              <span className="mr-1">⚠️</span>
              {validationError}
            </p>
          )}
        </div>

        {/* Advanced Options */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-vscode-accent hover:text-vscode-accent-hover flex items-center space-x-1"
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            <span>Advanced Options</span>
          </button>
          
          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="fileContent" className="block text-sm font-medium text-vscode-fg mb-2">
                  Initial Content
                </label>
                <textarea
                  id="fileContent"
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  disabled={isLoading}
                  rows={6}
                  className="
                    w-full px-3 py-2 bg-vscode-input-bg border border-vscode-border rounded
                    text-vscode-fg placeholder-vscode-fg-muted font-mono text-sm
                    focus:outline-none focus:ring-2 focus:ring-vscode-accent focus:border-vscode-accent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    resize-vertical
                  "
                  placeholder="Enter initial file content (optional)..."
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );

  const dialogFooter = (
    <div className="flex justify-between items-center">
      <div className="text-xs text-vscode-fg-muted">
        <div className="flex items-center space-x-4">
          <span>Press <kbd className="px-1 bg-vscode-keybinding-bg rounded">Enter</kbd> to create</span>
          <span>Press <kbd className="px-1 bg-vscode-keybinding-bg rounded">Esc</kbd> to cancel</span>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onClose}
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
          onClick={handleSubmit}
          disabled={isLoading || !!validationError || !fileName.trim()}
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
              Creating...
            </>
          ) : (
            'Create File'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="New File"
      subtitle="Create a new file from template or start blank"
      width="700px"
      height="600px"
      maxHeight="90vh"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      footer={dialogFooter}
    >
      {dialogContent}
    </BaseDialog>
  );
}; 