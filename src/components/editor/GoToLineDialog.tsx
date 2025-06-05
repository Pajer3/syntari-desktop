// Syntari AI IDE - Go to Line Dialog
// VS Code-style Go to Line implementation with keyboard navigation

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useShortcut } from '../../hooks/useKeyboardShortcuts';

// ================================
// TYPES
// ================================

interface GoToLineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLine: (lineNumber: number, column?: number) => void;
  currentLineNumber: number;
  totalLines: number;
  className?: string;
}

interface ParsedPosition {
  lineNumber: number;
  column?: number;
  isValid: boolean;
}

// ================================
// GO TO LINE DIALOG COMPONENT
// ================================

export const GoToLineDialog: React.FC<GoToLineDialogProps> = ({
  isOpen,
  onClose,
  onGoToLine,
  currentLineNumber,
  totalLines,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [parsedPosition, setParsedPosition] = useState<ParsedPosition>({
    lineNumber: currentLineNumber,
    column: undefined,
    isValid: true,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Parse input value to extract line and column numbers
  const parseInput = useCallback((value: string): ParsedPosition => {
    if (!value.trim()) {
      return {
        lineNumber: currentLineNumber,
        column: undefined,
        isValid: true,
      };
    }

    // Support line-col formats: `line,col`, `line:col`, `line#col`
    const numbers = value
      .split(/[,:# ]/)
      .map(part => parseInt(part.trim(), 10))
      .filter(part => !isNaN(part));

    if (numbers.length === 0) {
      return {
        lineNumber: currentLineNumber,
        column: undefined,
        isValid: false,
      };
    }

    const lineNumber = numbers[0];
    const column = numbers[1];

    // Handle negative line numbers (relative to end)
    const resolvedLineNumber = lineNumber > 0 
      ? lineNumber 
      : totalLines + lineNumber + 1;

    const isValid = resolvedLineNumber > 0 && resolvedLineNumber <= totalLines;

    return {
      lineNumber: resolvedLineNumber,
      column,
      isValid,
    };
  }, [currentLineNumber, totalLines]);

  // Update parsed position when input changes
  useEffect(() => {
    setParsedPosition(parseInput(inputValue));
  }, [inputValue, parseInput]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Initialize input with current line when opening
  useEffect(() => {
    if (isOpen) {
      setInputValue(currentLineNumber.toString());
    }
  }, [isOpen, currentLineNumber]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (parsedPosition.isValid) {
      onGoToLine(parsedPosition.lineNumber, parsedPosition.column);
      onClose();
    }
  }, [parsedPosition, onGoToLine, onClose]);

  // Handle key down events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleSubmit();
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [handleSubmit, onClose]);

  // Global keyboard shortcuts
  useShortcut('navigation', 'goToLine', useCallback((e) => {
    if (isOpen) {
      e.preventDefault?.();
      onClose();
      return true;
    }
    return false;
  }, [isOpen, onClose]));

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Generate help text
  const getHelpText = useCallback((): string => {
    if (!inputValue.trim()) {
      return `Current Line: ${currentLineNumber}. Type a line number between 1 and ${totalLines} to navigate to.`;
    }

    if (!parsedPosition.isValid) {
      return `Invalid line number. Enter a value between 1 and ${totalLines}.`;
    }

    if (parsedPosition.column !== undefined) {
      return `Go to line ${parsedPosition.lineNumber} and character ${parsedPosition.column}.`;
    }

    return `Go to line ${parsedPosition.lineNumber}.`;
  }, [inputValue, currentLineNumber, totalLines, parsedPosition]);

  // Generate placeholder text
  const getPlaceholder = useCallback((): string => {
    return `${currentLineNumber}:1`;
  }, [currentLineNumber]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/20 flex items-start justify-center z-50 pt-16"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goto-line-title"
    >
      <div 
        ref={dialogRef}
        className={`bg-vscode-bg border border-vscode-border rounded-lg shadow-xl w-full max-w-md mx-4 ${className}`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-vscode-border">
          <h2 
            id="goto-line-title" 
            className="text-sm font-medium text-vscode-fg"
          >
            Go to Line
          </h2>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-3">
            {/* Input Field */}
            <div>
              <label 
                htmlFor="line-input" 
                className="block text-xs text-vscode-fg-muted mb-1"
              >
                Line number (and optional character position)
              </label>
              <input
                ref={inputRef}
                id="line-input"
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={getPlaceholder()}
                className={`
                  w-full px-3 py-2 text-sm border rounded
                  bg-vscode-input text-vscode-fg
                  border-vscode-border focus:border-vscode-accent
                  focus:outline-none focus:ring-1 focus:ring-vscode-accent
                  ${!parsedPosition.isValid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                `}
                aria-describedby="line-help"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Help Text */}
            <div 
              id="line-help"
              className={`text-xs ${
                parsedPosition.isValid ? 'text-vscode-fg-muted' : 'text-red-400'
              }`}
            >
              {getHelpText()}
            </div>

            {/* Format Examples */}
            <div className="text-xs text-vscode-fg-muted">
              <div className="font-medium mb-1">Examples:</div>
              <div className="space-y-1">
                <div><code className="bg-vscode-sidebar px-1 rounded">42</code> - Go to line 42</div>
                <div><code className="bg-vscode-sidebar px-1 rounded">42:5</code> - Go to line 42, character 5</div>
                <div><code className="bg-vscode-sidebar px-1 rounded">42,10</code> - Go to line 42, character 10</div>
                <div><code className="bg-vscode-sidebar px-1 rounded">-5</code> - Go to 5th line from end</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-vscode-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-vscode-fg border border-vscode-border rounded hover:bg-vscode-list-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!parsedPosition.isValid}
              className="px-3 py-1.5 text-sm bg-vscode-accent text-vscode-accent-fg rounded hover:bg-vscode-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go to Line
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 