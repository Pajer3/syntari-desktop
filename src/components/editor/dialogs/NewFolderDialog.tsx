// Syntari AI IDE - New Folder Dialog Component
// VS Code-style new folder creation

import React, { useState, useEffect, useRef } from 'react';
import { validateFileName } from '../../../utils/fileValidation';
import { BaseDialog } from '../../ui/BaseDialog';

interface NewFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (folderName: string) => Promise<void>;
  currentPath?: string;
  presetFolderName?: string;
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

export const NewFolderDialog: React.FC<NewFolderDialogProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
  currentPath = '',
  presetFolderName = '',
}) => {
  const [folderName, setFolderName] = useState(presetFolderName);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFolderName(presetFolderName || 'new-folder');
      setValidationError(null);
      setIsLoading(false);
      
      // Focus input with a small delay
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, presetFolderName]);

  // Real-time validation with folder existence checking
  useEffect(() => {
    const checkFolderAndValidate = async () => {
      if (folderName.trim()) {
        // Folders shouldn't have extensions
        if (folderName.includes('.')) {
          setValidationError('Folder names should not contain extensions');
          return;
        }
        
        const validation = validateFileName(folderName.trim());
        
        // Check if folder already exists
        if (!validation || validation.severity !== 'error') {
          try {
            const { fileSystemService } = await import('../../../services/fileSystemService');
            const items = await fileSystemService.loadFolderContents(currentPath || '', false);
            const folderExists = items.some(item => 
              item.isDirectory && 
              item.name.toLowerCase() === folderName.trim().toLowerCase()
            );
            
            if (folderExists) {
              setValidationError(`Folder '${folderName}' already exists`);
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
        setValidationError('Folder name cannot be empty');
      }
    };

    checkFolderAndValidate();
  }, [folderName, currentPath]);

  const handleSubmit = async () => {
    const trimmedFolderName = folderName.trim();
    if (!trimmedFolderName) {
      setValidationError('Folder name cannot be empty');
      return;
    }

    if (trimmedFolderName.includes('.')) {
      setValidationError('Folder names should not contain extensions');
      return;
    }

    const validation = validateFileName(trimmedFolderName);
    if (validation?.severity === 'error') {
      setValidationError(validation.message);
      return;
    }

    setIsLoading(true);
    try {
      await onCreateFolder(trimmedFolderName);
      onClose();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to create folder');
    } finally {
      setIsLoading(false);
    }
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

      {/* Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-6 space-y-6">
        {/* Folder Icon */}
        <div className="flex justify-center">
          <div className="text-6xl text-yellow-500">📁</div>
        </div>

        {/* Description */}
        <div className="text-center">
          <h3 className="text-lg font-medium text-vscode-fg mb-2">Create New Folder</h3>
          <p className="text-sm text-vscode-fg-muted">
            Enter a name for the new folder
          </p>
        </div>

        {/* Folder Name Input */}
        <div>
          <label htmlFor="folderName" className="block text-sm font-medium text-vscode-fg mb-2">
            Folder Name
          </label>
          <input
            ref={inputRef}
            id="folderName"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
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
            placeholder="Enter folder name..."
            autoComplete="off"
            spellCheck={false}
          />
          
          {/* Validation Messages */}
          {validationError && (
            <p className="text-sm text-red-400 mt-2 flex items-center">
              <span className="mr-1">⚠️</span>
              {validationError}
            </p>
          )}
        </div>

        {/* Tips */}
        <div className="bg-vscode-list-hover/30 rounded p-3">
          <div className="text-xs text-vscode-fg-muted">
            <div className="font-medium mb-1">💡 Tips:</div>
            <ul className="space-y-1">
              <li>• Use descriptive names (e.g., "components", "utils")</li>
              <li>• Avoid spaces and special characters</li>
              <li>• Use kebab-case or camelCase for consistency</li>
            </ul>
          </div>
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
          disabled={isLoading || !!validationError || !folderName.trim()}
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
            'Create Folder'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="New Folder"
      subtitle="Create a new folder in the current directory"
      width="500px"
      height="auto"
      maxHeight="90vh"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      footer={dialogFooter}
    >
      {dialogContent}
    </BaseDialog>
  );
}; 