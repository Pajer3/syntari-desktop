// Syntari AI IDE - Professional Empty Editor State Component
// VSCode-inspired welcome state when no file is open

import type { ProjectContext } from '../../types';

interface EmptyEditorStateProps {
  project: ProjectContext;
}

export const EmptyEditorState: React.FC<EmptyEditorStateProps> = ({ project }) => {
  return (
    <div className="flex items-center justify-center h-full bg-vscode-bg text-vscode-fg">
      <div className="text-center max-w-lg">
        <div className="mb-8">
          <div className="text-6xl mb-4 text-vscode-fg-muted">📝</div>
          <h2 className="text-xl font-medium text-vscode-fg mb-2">
            Welcome to Syntari AI IDE
          </h2>
          <p className="text-sm text-vscode-fg-muted">
            Select a file from the Explorer to start editing
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-vscode-sidebar border border-vscode-border rounded">
            <div className="text-2xl mb-2">🚀</div>
            <div className="text-sm font-medium text-vscode-fg">IntelliSense</div>
            <div className="text-xs text-vscode-fg-muted">Smart completions</div>
          </div>
          <div className="p-4 bg-vscode-sidebar border border-vscode-border rounded">
            <div className="text-2xl mb-2">🎨</div>
            <div className="text-sm font-medium text-vscode-fg">Syntax</div>
            <div className="text-xs text-vscode-fg-muted">Highlighting</div>
          </div>
          <div className="p-4 bg-vscode-sidebar border border-vscode-border rounded">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm font-medium text-vscode-fg">Search</div>
            <div className="text-xs text-vscode-fg-muted">& Replace</div>
          </div>
          <div className="p-4 bg-vscode-sidebar border border-vscode-border rounded">
            <div className="text-2xl mb-2">🤖</div>
            <div className="text-sm font-medium text-vscode-fg">AI Assistant</div>
            <div className="text-xs text-vscode-fg-muted">Smart help</div>
          </div>
        </div>

        <div className="text-xs text-vscode-fg-muted border-t border-vscode-border pt-4">
          <div>Project: <span className="text-vscode-accent">{project?.projectType || 'Unknown'}</span></div>
          <div>Files: <span className="text-vscode-accent">{project?.openFiles?.length || 0}</span></div>
        </div>
      </div>
    </div>
  );
}; 