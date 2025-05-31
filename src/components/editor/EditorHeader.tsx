// Syntari AI IDE - Editor Header Component
// Extracted from CodeEditor.tsx for better maintainability

import React from 'react';
import type { FileInfo } from '../../types';
import { getFileIcon, getLanguageFromExtension } from '../../utils/editorUtils';

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
    <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-b border-gray-600 shadow-lg">
      <div className="flex items-center space-x-4">
        <span className="text-xl">{getFileIcon(selectedFile.extension)}</span>
        <div className="flex flex-col">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-semibold text-gray-100">{selectedFile.name}</span>
            {isModified && <span className="w-2 h-2 bg-orange-400 rounded-full shadow-lg"></span>}
            {isLoading && <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-lg"></span>}
          </div>
          <span className="text-xs text-gray-400">{selectedFile.path}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <span className="text-xs text-gray-300 px-3 py-1.5 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg border border-gray-500">
          {language}
        </span>
        <button
          onClick={onSave}
          disabled={!isModified || isLoading}
          className={`px-4 py-2 text-xs rounded-lg transition-all duration-300 font-medium ${
            isModified && !isLoading
              ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg border border-green-400'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
          }`}
        >
          {isLoading ? 'Saving...' : 'Save'} <span className="text-gray-300">(Ctrl+S)</span>
        </button>
        <button
          onClick={onAskAI}
          disabled={!selectedFile || isLoading}
          className="px-4 py-2 text-xs bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed rounded-lg transition-all duration-300 text-white shadow-lg border border-blue-400 font-medium"
        >
          Ask AI <span className="text-gray-300">(Ctrl+K)</span>
        </button>
      </div>
    </div>
  );
}; 