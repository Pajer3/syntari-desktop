// Syntari AI IDE - Save As Dialog Component
// VS Code-style file saving with path navigation and validation

import React, { useState, useEffect, useRef } from 'react';
import { validateFileName } from '../../../utils/fileValidation';

interface SaveAsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAs: (filePath: string, fileName: string) => Promise<void>;
  currentFileName?: string;
  currentPath?: string;
  projectRootPath?: string;
}

export const SaveAsDialog: React.FC<SaveAsDialogProps> = ({
  isOpen,
  onClose,
  onSaveAs,
  currentFileName = 'Untitled.txt',
  currentPath = '',
  projectRootPath = '',
}) => {
  const [fileName, setFileName] = useState(currentFileName);
  const [selectedPath, setSelectedPath] = useState(currentPath || projectRootPath);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileExists, setFileExists] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFileName(currentFileName);
      setSelectedPath(currentPath || projectRootPath);
      setValidationError(null);
      setFileExists(false);
      setIsLoading(false);
      // Focus input with a small delay
      setTimeout(() => {
        inputRef.current?.focus();
        // Select filename without extension for easier editing
        const name = currentFileName;
        const lastDotIndex = name.lastIndexOf('.');
        if (lastDotIndex > 0) {
          inputRef.current?.setSelectionRange(0, lastDotIndex);
        } else {
          inputRef.current?.select();
        }
      }, 100);
    }
  }, [isOpen, currentFileName, currentPath, projectRootPath]);

  // Real-time validation
  useEffect(() => {
    if (fileName.trim()) {
      const validation = validateFileName(fileName.trim());
      setValidationError(validation?.message || null);
      
      // Check if file exists (simplified - in real implementation would check filesystem)
      setFileExists(false); // TODO: Implement actual file existence check
    } else {
      setValidationError('File name cannot be empty');
      setFileExists(false);
    }
  }, [fileName, selectedPath]);

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
      await onSaveAs(selectedPath, trimmedFileName);
      onClose();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to save file');
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

  const getDisplayPath = () => {
    if (!selectedPath) return 'Select location...';
    if (selectedPath === projectRootPath) return './';
    return selectedPath.replace(projectRootPath, './');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancel}>
      <div 
        className="bg-vscode-bg border border-vscode-border rounded-md shadow-lg w-[500px] max-w-90vw"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-vscode-border">
          <h2 className="text-lg font-semibold text-vscode-fg">Save As</h2>
          <p className="text-sm text-vscode-fg-muted mt-1">
            Choose location and name for the file
          </p>
          {/* Current Directory Indicator */}
          {selectedPath && (
            <div className="mt-2 px-3 py-2 bg-vscode-sidebar border border-vscode-border rounded">
              <span className="text-xs text-vscode-fg-muted">Default location: </span>
              <span className="text-xs font-mono text-vscode-accent">{getDisplayPath()}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Path Selection */}
          <div>
            <label htmlFor="savePath" className="block text-sm font-medium text-vscode-fg mb-2">
              Save Location
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 px-3 py-2 bg-vscode-input-bg border border-vscode-border rounded text-vscode-fg text-sm">
                <span className="flex items-center">
                  <span className="mr-2">📁</span>
                  {getDisplayPath()}
                </span>
              </div>
              <button
                type="button"
                disabled={isLoading}
                className="
                  px-3 py-2 text-sm font-medium text-vscode-fg
                  border border-vscode-border rounded hover:bg-vscode-button-hover
                  focus:outline-none focus:ring-2 focus:ring-vscode-accent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
                title="Browse for location"
              >
                Browse...
              </button>
            </div>
          </div>

          {/* File Name Input */}
          <div>
            <label htmlFor="fileName" className="block text-sm font-medium text-vscode-fg mb-2">
              File Name
            </label>
            <input
              ref={inputRef}
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              disabled={isLoading}
              className={`
                w-full px-3 py-2 bg-vscode-input-bg border rounded
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
            
            {/* Validation Messages */}
            {validationError && (
              <p className="text-sm text-red-400 mt-1 flex items-center">
                <span className="mr-1">⚠️</span>
                {validationError}
              </p>
            )}
            
            {fileExists && !validationError && (
              <p className="text-sm text-yellow-400 mt-1 flex items-center">
                <span className="mr-1">⚠️</span>
                A file with this name already exists. It will be overwritten.
              </p>
            )}
          </div>

          {/* File Preview Info */}
          {fileName.trim() && !validationError && (
            <div className="bg-vscode-sidebar border border-vscode-border rounded p-3">
              <div className="text-sm text-vscode-fg-muted">
                <div className="flex items-center justify-between">
                  <span>Full path:</span>
                  <span className="font-mono text-xs text-vscode-fg">
                    {selectedPath}/{fileName.trim()}
                  </span>
                </div>
              </div>
            </div>
          )}

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
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>

        {/* Keyboard Shortcuts Help */}
        <div className="px-4 pb-3 text-xs text-vscode-fg-muted border-t border-vscode-border">
          <div className="flex justify-between">
            <span>Press <kbd className="px-1 bg-vscode-keybinding-bg rounded">Enter</kbd> to save</span>
            <span>Press <kbd className="px-1 bg-vscode-keybinding-bg rounded">Esc</kbd> to cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 