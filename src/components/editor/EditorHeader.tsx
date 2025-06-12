// Syntari AI IDE - Professional Editor Header Component
// VSCode-inspired tab bar and editor controls

import React from 'react';
import type { FileInfo } from '../../types';
import { getLanguageFromExtension } from '../../utils/editorUtils';
import { EnhancedFileIcon } from '../ui/EnhancedFileIcon';

interface EditorHeaderProps {
  selectedFile: FileInfo;
  isModified: boolean;
  isLoading: boolean;
  onSave: () => void;
  onAskAI: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  selectedFile,
  isModified,
  isLoading,
  onSave,
  onAskAI,
}) => {
  const language = getLanguageFromExtension(selectedFile.extension);

  return (
    <div className="vscode-tab active editor-header">
      {/* Tab Content */}
      <div className="editor-file-info">
        <EnhancedFileIcon 
          fileName={selectedFile.name}
          size={16}
          className="icon"
        />
        <span className="file-name">{selectedFile.name}</span>
        {isModified && <div className="status-dot modified" title="File has unsaved changes"></div>}
        {isLoading && <div className="status-dot loading" title="Loading..."></div>}
      </div>
      
      {/* Tab Actions */}
      <div className="editor-actions">
        <span className="language-badge text-xs text-vscode-fg-muted bg-vscode-sidebar px-2 py-1 rounded-sm">
          {language}
        </span>
        <button
          onClick={onSave}
          disabled={!isModified || isLoading}
          className={`editor-button ${isModified && !isLoading ? 'primary' : ''}`}
          title={isModified ? 'Save (Ctrl+S)' : 'No changes to save'}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onAskAI}
          disabled={!selectedFile || isLoading}
          className="editor-button"
          title="Ask AI about this file (Ctrl+K)"
        >
          AI
        </button>
      </div>
    </div>
  );
}; 