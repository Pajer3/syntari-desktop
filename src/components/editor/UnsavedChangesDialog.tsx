// Syntari AI IDE - Unsaved Changes Warning Dialog
// VS Code-style warning dialog for unsaved file changes

import React, { useEffect, useRef, useCallback } from 'react';
import { useShortcut, type KeyboardEvent } from '../../hooks/useKeyboardShortcuts';

interface UnsavedChangesDialogProps {
  isOpen: boolean;
  fileName: string;
  onSave: () => Promise<void>;
  onDontSave: () => void;
  onCancel: () => void;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  fileName,
  onSave,
  onDontSave,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onCancel();
          break;
        case 'Enter':
          e.preventDefault();
          onSave();
          break;
        case 's':
          if (e.ctrlKey) {
            e.preventDefault();
            onSave();
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the dialog for accessibility
      dialogRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onSave, onCancel]);

  // Keyboard shortcut handlers - only register when dialog is open
  useShortcut('dialog', 'save', useCallback((e: KeyboardEvent) => {
    if (isOpen) {
      e.preventDefault && e.preventDefault();
      onSave?.().catch(console.error);
    }
  }, [isOpen, onSave]));

  useShortcut('dialog', 'saveAlt', useCallback((e: KeyboardEvent) => {
    if (isOpen) {
      e.preventDefault && e.preventDefault();
      onSave?.().catch(console.error);
    }
  }, [isOpen, onSave]));

  useShortcut('dialog', 'cancel', useCallback((e: KeyboardEvent) => {
    if (isOpen) {
      e.preventDefault && e.preventDefault();
      onCancel?.();
    }
  }, [isOpen, onCancel]));

  // Add the missing "Don't Save" shortcut (Ctrl+D)
  useShortcut('dialog', 'dontSave', useCallback((e: KeyboardEvent) => {
    if (isOpen) {
      e.preventDefault && e.preventDefault();
      onDontSave?.();
    }
  }, [isOpen, onDontSave]));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-vscode-bg border border-vscode-border rounded-lg shadow-xl max-w-md w-full mx-4"
        tabIndex={-1}
      >
        {/* Dialog Header */}
        <div className="p-4 border-b border-vscode-border">
          <h2 className="text-lg font-semibold text-vscode-fg">
            Unsaved Changes
          </h2>
        </div>

        {/* Dialog Content */}
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <p className="text-vscode-fg mb-2">
                Do you want to save the changes you made to{' '}
                <span className="font-semibold text-vscode-accent">
                  {fileName}
                </span>
                ?
              </p>
              <p className="text-sm text-vscode-fg-muted">
                Your changes will be lost if you don't save them.
              </p>
            </div>
          </div>
        </div>

        {/* Dialog Actions */}
        <div className="flex justify-end space-x-2 p-4 border-t border-vscode-border">
          <button
            onClick={onDontSave}
            className="px-4 py-2 text-vscode-fg-muted hover:text-vscode-fg hover:bg-vscode-button-hover rounded transition-colors"
          >
            Don't Save
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-vscode-button text-vscode-fg hover:bg-vscode-button-hover rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-vscode-accent text-white hover:bg-blue-600 rounded transition-colors"
          >
            Save
          </button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="px-4 pb-2 text-xs text-vscode-fg-muted">
          <div>Enter - Save • Escape - Cancel • Ctrl+S - Save</div>
        </div>
      </div>
    </div>
  );
}; 