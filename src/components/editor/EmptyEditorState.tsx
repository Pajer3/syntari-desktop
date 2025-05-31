// Syntari AI IDE - Empty Editor State Component
// Extracted from CodeEditor.tsx for better maintainability

import React from 'react';
import type { ProjectContext } from '../../types';

interface EmptyEditorStateProps {
  project: ProjectContext;
}

export const EmptyEditorState: React.FC<EmptyEditorStateProps> = ({ project }) => {
  return (
    <div className="flex items-center justify-center h-full text-gray-300 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center max-w-2xl px-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-8 border border-gray-600 shadow-2xl">
          <div className="text-7xl mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">💻</div>
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">Syntari AI IDE</h2>
          <p className="text-gray-300 mb-2 text-lg">Professional code editor powered by Monaco</p>
          <p className="text-sm text-gray-400 mb-8">
            Select a file from the explorer to start editing with enterprise-grade features
          </p>
          <div className="grid grid-cols-2 gap-6 text-sm text-gray-400 mb-8">
            <div className="text-center p-4 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl border border-gray-500">
              <div className="text-3xl mb-3 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">🚀</div>
              <p className="text-gray-200 font-medium">IntelliSense & Auto-completion</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl border border-gray-500">
              <div className="text-3xl mb-3 bg-gradient-to-r from-pink-400 to-red-500 bg-clip-text text-transparent">🎨</div>
              <p className="text-gray-200 font-medium">Syntax Highlighting</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl border border-gray-500">
              <div className="text-3xl mb-3 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">🔍</div>
              <p className="text-gray-200 font-medium">Advanced Search & Replace</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl border border-gray-500">
              <div className="text-3xl mb-3 bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">🤖</div>
              <p className="text-gray-200 font-medium">AI-Powered Assistance</p>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-600">
            <p className="text-xs text-gray-500">
              Project: <span className="text-blue-400 font-medium">{project.projectType}</span> • 
              Files: <span className="text-green-400 font-medium">{project.openFiles.length}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 