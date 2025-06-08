// Syntari AI IDE - Terminal Component
// Professional embedded terminal with command history and VS Code styling

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: number;
  workingDirectory: string;
  duration: number;
}

interface TerminalSession {
  id: string;
  name: string;
  workingDirectory: string;
  commands: TerminalCommand[];
  isActive: boolean;
  lastActivity: number;
}

interface TerminalProps {
  initialDirectory?: string;
  onDirectoryChange?: (directory: string) => void;
  className?: string;
  height?: number;
  enableMultipleSessions?: boolean;
  showStatusBar?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({
  initialDirectory = '.',
  onDirectoryChange,
  className = '',
  height = 300,
  enableMultipleSessions = true,
  showStatusBar = true,
}) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [workingDirectory, setWorkingDirectory] = useState(initialDirectory);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Initialize default session
  useEffect(() => {
    if (sessions.length === 0) {
      const defaultSession: TerminalSession = {
        id: 'default',
        name: 'Terminal',
        workingDirectory: initialDirectory,
        commands: [],
        isActive: true,
        lastActivity: Date.now(),
      };
      setSessions([defaultSession]);
      setActiveSessionId('default');
    }
  }, [initialDirectory, sessions.length]);

  // Get active session
  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Execute command via Tauri
  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim() || !activeSession) return;

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      const result = await invoke<{ output: string; exit_code: number }>('execute_shell_command', {
        command: command.trim(),
        workingDirectory: activeSession.workingDirectory,
      });

      const terminalCommand: TerminalCommand = {
        id: `cmd-${Date.now()}`,
        command: command.trim(),
        output: result.output,
        exitCode: result.exit_code,
        timestamp: Date.now(),
        workingDirectory: activeSession.workingDirectory,
        duration: Date.now() - startTime,
      };

      // Update session with new command
      setSessions(prev => prev.map(session => 
        session.id === activeSessionId
          ? {
              ...session,
              commands: [...session.commands, terminalCommand],
              lastActivity: Date.now(),
            }
          : session
      ));

      // Update command history
      setCommandHistory(prev => {
        const newHistory = [command.trim(), ...prev.filter(cmd => cmd !== command.trim())];
        return newHistory.slice(0, 100); // Keep last 100 commands
      });

      // Handle directory changes
      if (command.startsWith('cd ')) {
        const newDir = command.substring(3).trim();
        const updatedDir = newDir.startsWith('/') ? newDir : `${activeSession.workingDirectory}/${newDir}`;
        setWorkingDirectory(updatedDir);
        onDirectoryChange?.(updatedDir);
        
        // Update session working directory
        setSessions(prev => prev.map(session => 
          session.id === activeSessionId
            ? { ...session, workingDirectory: updatedDir }
            : session
        ));
      }

    } catch (error) {
      const errorCommand: TerminalCommand = {
        id: `cmd-${Date.now()}`,
        command: command.trim(),
        output: `Error: ${error}`,
        exitCode: 1,
        timestamp: Date.now(),
        workingDirectory: activeSession.workingDirectory,
        duration: Date.now() - startTime,
      };

      setSessions(prev => prev.map(session => 
        session.id === activeSessionId
          ? {
              ...session,
              commands: [...session.commands, errorCommand],
              lastActivity: Date.now(),
            }
          : session
      ));
    } finally {
      setIsExecuting(false);
      setCurrentCommand('');
      setHistoryIndex(-1);
    }
  }, [activeSession, activeSessionId, onDirectoryChange]);

  // Handle input submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (currentCommand.trim() && !isExecuting) {
      executeCommand(currentCommand);
    }
  }, [currentCommand, isExecuting, executeCommand]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex] || '');
        }
        break;
      
      case 'ArrowDown':
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex] || '');
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        }
        break;
      
      case 'Escape':
        setCurrentCommand('');
        setHistoryIndex(-1);
        break;
    }
  }, [historyIndex, commandHistory]);

  // Auto-scroll to bottom when new output appears
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeSession?.commands]);

  // Focus input when clicking terminal
  const handleTerminalClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Create new session
  const createNewSession = useCallback(() => {
    const newSession: TerminalSession = {
      id: `session-${Date.now()}`,
      name: `Terminal ${sessions.length + 1}`,
      workingDirectory: workingDirectory,
      commands: [],
      isActive: false,
      lastActivity: Date.now(),
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  }, [sessions.length, workingDirectory]);

  // Close session
  const closeSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId);
      if (remaining.length === 0) {
        // Create default session
        const defaultSession: TerminalSession = {
          id: 'default-new',
          name: 'Terminal',
          workingDirectory: workingDirectory,
          commands: [],
          isActive: true,
          lastActivity: Date.now(),
        };
        setActiveSessionId(defaultSession.id);
        return [defaultSession];
      } else {
        // Switch to first remaining session if active session was closed
        if (sessionId === activeSessionId) {
          setActiveSessionId(remaining[0].id);
        }
        return remaining;
      }
    });
  }, [activeSessionId, workingDirectory]);

  // Clear current session
  const clearSession = useCallback(() => {
    if (!activeSession) return;
    
    setSessions(prev => prev.map(session => 
      session.id === activeSessionId
        ? { ...session, commands: [] }
        : session
    ));
  }, [activeSession, activeSessionId]);

  return (
    <div className={`terminal-container bg-vscode-bg text-vscode-fg flex flex-col ${className}`}>
      {/* Terminal Tabs */}
      {enableMultipleSessions && (
        <div className="terminal-tabs flex bg-vscode-sidebar border-b border-vscode-border">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`terminal-tab flex items-center px-3 py-2 cursor-pointer border-r border-vscode-border ${
                session.id === activeSessionId
                  ? 'bg-vscode-tab-active text-vscode-tab-active-fg'
                  : 'bg-vscode-tab-inactive hover:bg-vscode-tab-hover'
              }`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <span className="text-sm truncate max-w-32">{session.name}</span>
              {sessions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSession(session.id);
                  }}
                  className="ml-2 text-vscode-fg-muted hover:text-vscode-fg"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          
          <button
            onClick={createNewSession}
            className="px-3 py-2 text-vscode-fg-muted hover:text-vscode-fg hover:bg-vscode-tab-hover"
            title="New Terminal"
          >
            +
          </button>
        </div>
      )}

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="terminal-output flex-1 overflow-hidden cursor-text"
        style={{ height: `${height}px` }}
        onClick={handleTerminalClick}
      >
        <div
          ref={outputRef}
          className="h-full overflow-y-auto p-3 font-mono text-sm leading-relaxed"
        >
          {activeSession?.commands.map(cmd => (
            <div key={cmd.id} className="mb-2">
              {/* Command */}
              <div className="flex items-center text-vscode-accent">
                <span className="text-green-400 mr-2">$</span>
                <span className="text-vscode-fg">{cmd.workingDirectory}</span>
                <span className="text-vscode-accent mx-2">{'>'}</span>
                <span>{cmd.command}</span>
              </div>
              
              {/* Output */}
              {cmd.output && (
                <div className={`mt-1 whitespace-pre-wrap ${
                  cmd.exitCode === 0 ? 'text-vscode-fg' : 'text-red-400'
                }`}>
                  {cmd.output}
                </div>
              )}
              
              {/* Command metadata */}
              <div className="text-xs text-vscode-fg-muted mt-1">
                Exit code: {cmd.exitCode} • Duration: {cmd.duration}ms
              </div>
            </div>
          ))}
          
          {/* Current prompt */}
          <form onSubmit={handleSubmit} className="flex items-center">
            <span className="text-green-400 mr-2">$</span>
            <span className="text-vscode-fg mr-2">{workingDirectory}</span>
            <span className="text-vscode-accent mr-2">{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              className="flex-1 bg-transparent border-none outline-none text-vscode-fg"
              placeholder={isExecuting ? 'Executing...' : 'Enter command...'}
              autoFocus
            />
            {isExecuting && (
              <div className="ml-2 text-vscode-accent animate-pulse">⏳</div>
            )}
          </form>
        </div>
      </div>

      {/* Status Bar */}
      {showStatusBar && (
        <div className="terminal-status bg-vscode-sidebar border-t border-vscode-border px-3 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <span className="text-vscode-fg-muted">
              Working Directory: <span className="text-vscode-fg font-mono">{workingDirectory}</span>
            </span>
            <span className="text-vscode-fg-muted">
              Commands: {activeSession?.commands.length || 0}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={clearSession}
              className="px-2 py-1 bg-vscode-button hover:bg-vscode-button-hover rounded text-xs"
              title="Clear Terminal"
            >
              Clear
            </button>
            <button
              onClick={() => inputRef.current?.focus()}
              className="px-2 py-1 bg-vscode-button hover:bg-vscode-button-hover rounded text-xs"
              title="Focus Terminal"
            >
              Focus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 