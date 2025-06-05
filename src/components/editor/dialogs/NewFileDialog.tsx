// Syntari AI IDE - New File Dialog Component
// VS Code-style new file creation with validation and templates

import React, { useState, useEffect, useRef } from 'react';
import { validateFileName, suggestFileName } from '../../../utils/fileValidation';

interface FileTemplate {
  name: string;
  extension: string;
  content: string;
  description: string;
  icon: string;
}

interface NewFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (fileName: string, content?: string) => Promise<void>;
  currentPath?: string;
  presetFileName?: string;
  presetContent?: string;
}

const FILE_TEMPLATES: FileTemplate[] = [
  {
    name: 'TypeScript File',
    extension: '.ts',
    content: `// New TypeScript file\n\nexport default function() {\n  // Your code here\n}\n`,
    description: 'TypeScript source file',
    icon: '🔷'
  },
  {
    name: 'React Component',
    extension: '.tsx',
    content: `import React from 'react';\n\ninterface Props {\n  // Define component props here\n}\n\nexport const MyComponent: React.FC<Props> = (props) => {\n  return (\n    <div>\n      {/* Component content */}\n    </div>\n  );\n};\n\nexport default MyComponent;\n`,
    description: 'React TypeScript component',
    icon: '⚛️'
  },
  {
    name: 'JavaScript File',
    extension: '.js',
    content: `// New JavaScript file\n\nfunction main() {\n  // Your code here\n}\n\nexport default main;\n`,
    description: 'JavaScript source file',
    icon: '🟨'
  },
  {
    name: 'JSON File',
    extension: '.json',
    content: `{\n  "name": "example",\n  "version": "1.0.0"\n}\n`,
    description: 'JSON data file',
    icon: '📄'
  },
  {
    name: 'Markdown File',
    extension: '.md',
    content: `# Title\n\nYour markdown content here.\n\n## Section\n\n- List item 1\n- List item 2\n\n\`\`\`typescript\n// Code example\nconsole.log('Hello, World!');\n\`\`\`\n`,
    description: 'Markdown documentation',
    icon: '📝'
  },
  {
    name: 'CSS File',
    extension: '.css',
    content: `/* Stylesheet */\n\n.container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n`,
    description: 'CSS stylesheet',
    icon: '🎨'
  },
  {
    name: 'HTML File',
    extension: '.html',
    content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n`,
    description: 'HTML document',
    icon: '🌐'
  },
  {
    name: 'Empty File',
    extension: '',
    content: '',
    description: 'Empty file with custom extension',
    icon: '📋'
  }
];

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
}) => {
  const [fileName, setFileName] = useState(presetFileName);
  const [fileContent, setFileContent] = useState(presetContent);
  const [selectedTemplate, setSelectedTemplate] = useState<FileTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFileName(presetFileName || 'newfile.ts');
      setFileContent(presetContent);
      setSelectedTemplate(null);
      setValidationError(null);
      setIsLoading(false);
      setShowAdvanced(false);
      
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

  // Real-time validation
  useEffect(() => {
    if (fileName.trim()) {
      const validation = validateFileName(fileName.trim());
      setValidationError(validation?.message || null);
    } else {
      setValidationError('File name cannot be empty');
    }
  }, [fileName]);

  const handleTemplateSelect = (template: FileTemplate) => {
    setSelectedTemplate(template);
    
    if (template.extension) {
      // Update filename with template extension
      const nameWithoutExt = fileName.split('.')[0] || 'newfile';
      setFileName(nameWithoutExt + template.extension);
    }
    
    setFileContent(template.content);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const handleFileNameSuggestion = () => {
    const suggested = suggestFileName(fileName);
    setFileName(suggested);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancel}>
      <div 
        className="bg-vscode-bg border border-vscode-border rounded-md shadow-lg w-[600px] max-w-90vw max-h-90vh flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-vscode-border">
          <h2 className="text-lg font-semibold text-vscode-fg">New File</h2>
          <p className="text-sm text-vscode-fg-muted mt-1">
            Create a new file from template or start blank
          </p>
          {/* Current Directory Indicator */}
          {currentPath && (
            <div className="mt-2 px-3 py-2 bg-vscode-sidebar border border-vscode-border rounded">
              <span className="text-xs text-vscode-fg-muted">Creating in: </span>
              <span className="text-xs font-mono text-vscode-accent">{shortenPath(currentPath)}</span>
            </div>
          )}
        </div>

        {/* File Templates */}
        <div className="p-4 border-b border-vscode-border">
          <h3 className="text-sm font-medium text-vscode-fg mb-3">Templates</h3>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {FILE_TEMPLATES.map((template, index) => (
              <button
                key={index}
                onClick={() => handleTemplateSelect(template)}
                className={`
                  flex items-center space-x-2 p-3 rounded border text-left
                  hover:bg-vscode-button-hover transition-colors
                  focus:outline-none focus:ring-2 focus:ring-vscode-accent
                  ${selectedTemplate === template 
                    ? 'border-vscode-accent bg-vscode-accent bg-opacity-10' 
                    : 'border-vscode-border'
                  }
                `}
              >
                <span className="text-lg">{template.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-vscode-fg">{template.name}</div>
                  <div className="text-xs text-vscode-fg-muted truncate">{template.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
            
            {/* Path Info */}
            {currentPath && (
              <p className="text-xs text-vscode-fg-muted mt-1">
                Creating in: <span className="font-mono">{currentPath}</span>
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

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
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
              type="submit"
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
        </form>

        {/* Keyboard Shortcuts Help */}
        <div className="px-4 pb-3 text-xs text-vscode-fg-muted border-t border-vscode-border">
          <div className="flex justify-between">
            <span>Press <kbd className="px-1 bg-vscode-keybinding-bg rounded">Enter</kbd> to create</span>
            <span>Press <kbd className="px-1 bg-vscode-keybinding-bg rounded">Esc</kbd> to cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 