// Syntari AI IDE - Error Notification Component
// Extracted from CodeEditor.tsx for better maintainability

import React from 'react';

interface ErrorNotificationProps {
  error: string | null;
  onDismiss: () => void;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
}) => {
  if (!error) return null;

  return (
    <div className="h-8 px-4 bg-vscode-error-bg border-b border-vscode-error-border text-vscode-error-fg text-xs flex items-center">
      <span className="mr-2">⚠</span>
      <span className="flex-1 truncate">{error}</span>
      <button 
        onClick={onDismiss}
        className="ml-2 text-vscode-error-fg hover:text-white transition-colors"
        title="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}; 