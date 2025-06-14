// Syntari AI IDE - Enhanced Terminal Panel
// Full-featured terminal with AI integration and professional features

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Plus, Maximize2, Minimize2, Copy, 
  RotateCcw, Terminal, ChevronRight,
  Bot, History, Search
} from 'lucide-react';
import { terminalService } from '../../services';
import { useContextMenuHandler } from '../ui/ContextMenu';
import type { TerminalSession, TerminalOutput } from '../../services/types';

interface EnhancedTerminalPanelProps {
  projectPath: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  height?: number;
  className?: string;
  onAIRequest?: (context: string) => void;
}

export const EnhancedTerminalPanel: React.FC<EnhancedTerminalPanelProps> = ({
  projectPath,
  isVisible,
  onToggleVisibility,
  height = 300,
  className = '',
  onAIRequest,
}) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleContextMenu = useContextMenuHandler();

  // Initialize terminal service
  useEffect(() => {
    const initializeTerminal = async () => {
      try {
        await terminalService.initialize();
        const session = await terminalService.createSession('Main', projectPath);
        setSessions([session]);
        setActiveSessionId(session.id);
        
        // Add welcome message with project context
        const welcomeOutput: TerminalOutput = {
          id: 'welcome',
          type: 'output',
          content: `🚀 Syntari AI IDE Terminal\n📁 Project: ${projectPath}\n💡 Type 'help' for AI-enhanced commands`,
          timestamp: new Date()
        };
        session.history.push(welcomeOutput);
        setSessions([session]);
      } catch (error) {
        console.error('Failed to initialize terminal:', error);
      }
    };

    if (isVisible && sessions.length === 0) {
      initializeTerminal();
    }
  }, [isVisible, projectPath]);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId]);

  // Focus input when terminal becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const executeCommand = useCallback(async (command: string) => {
    if (!activeSession || !command.trim() || isExecuting) return;

    setIsExecuting(true);
    setCurrentInput('');
    
    // Add to command history
    setCommandHistory(prev => {
      const newHistory = [command, ...prev.filter(cmd => cmd !== command)];
      return newHistory.slice(0, 100); // Keep last 100 commands
    });
    setHistoryIndex(-1);

    try {
      // Check for special AI commands
      if (command.startsWith('ai ') || command.startsWith('ask ')) {
        const query = command.replace(/^(ai|ask)\s+/, '');
        const context = `Terminal session in ${projectPath}\nWorking directory: ${activeSession.workingDirectory}\nQuery: ${query}`;
        onAIRequest?.(context);
        
        // Add AI request to terminal output
        const aiOutput: TerminalOutput = {
          id: `ai_${Date.now()}`,
          type: 'output',
          content: `🤖 AI Assistant: Processing "${query}"...\n(Check AI panel for response)`,
          timestamp: new Date(),
        };
        
        setSessions(prev => prev.map(session => 
          session.id === activeSession.id 
            ? { ...session, history: [...session.history, aiOutput] }
            : session
        ));
        return;
      }

      // Execute regular command
      const result = await terminalService.executeCommand(activeSession.id, command);
      
      // Log result for debugging
      if (!result.success) {
        console.warn('Command execution had issues:', result.error);
      }
      
      // Update sessions with new output
      const updatedSessions = sessions.map(session => {
        if (session.id === activeSession.id) {
          const updatedSession = terminalService.getSession(session.id);
          return updatedSession || session;
        }
        return session;
      });
      
      setSessions(updatedSessions);
    } catch (error) {
      console.error('Command execution failed:', error);
      
      // Add error to output
      const errorOutput: TerminalOutput = {
        id: `error_${Date.now()}`,
        type: 'error',
        content: `Error: ${error}`,
        timestamp: new Date()
      };
      
      setSessions(prev => prev.map(session => 
        session.id === activeSession.id 
          ? { ...session, history: [...session.history, errorOutput] }
          : session
      ));
    } finally {
      setIsExecuting(false);
    }
  }, [activeSession, isExecuting, sessions, projectPath, onAIRequest]);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim()) {
      executeCommand(currentInput);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Implement tab completion for commands and file paths
      const currentCommand = currentInput.trim();
      const words = currentCommand.split(' ');
      const lastWord = words[words.length - 1];
      
      // Basic command completion
      const commonCommands = ['ls', 'cd', 'pwd', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'cat', 'grep', 'find', 'git', 'npm', 'node', 'python', 'cargo', 'rustc', 'go', 'javac', 'java'];
      
      if (words.length === 1) {
        // Complete command names
        const matches = commonCommands.filter(cmd => cmd.startsWith(lastWord));
        if (matches.length === 1) {
          setCurrentInput(matches[0] + ' ');
        } else if (matches.length > 1) {
          // Show available completions in terminal
          const completionsOutput: TerminalOutput = {
            id: `completions-${Date.now()}`,
            type: 'output',
            content: `Available completions: ${matches.join(', ')}`,
            timestamp: new Date()
          };
          
          if (activeSession) {
            const updatedSessions = sessions.map(session => {
              if (session.id === activeSession.id) {
                return {
                  ...session,
                  history: [...session.history, completionsOutput]
                };
              }
              return session;
            });
            setSessions(updatedSessions);
          }
        }
      } else {
        // Complete file paths (simplified - in real implementation would query filesystem)
        console.log('File path completion not implemented for:', lastWord);
      }
    }
  };

  const createNewSession = async () => {
    try {
      const newSession = await terminalService.createSession(
        `Terminal ${sessions.length + 1}`, 
        projectPath
      );
      setSessions(prev => [...prev, newSession]);
      setActiveSessionId(newSession.id);
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  const closeSession = async (sessionId: string) => {
    if (sessions.length <= 1) return; // Keep at least one session

    terminalService.removeSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    if (activeSessionId === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setActiveSessionId(remainingSessions[0]?.id || null);
    }
  };

  const clearSession = () => {
    if (!activeSession) return;
    
    terminalService.clearSession(activeSession.id);
    setSessions(prev => prev.map(session => 
      session.id === activeSession.id 
        ? { ...session, history: [] }
        : session
    ));
  };

  const copyOutput = () => {
    if (!activeSession) return;
    
    const output = activeSession.history
      .filter(line => line.type !== 'command')
      .map(line => line.content)
      .join('\n');
    
    navigator.clipboard.writeText(output).catch(console.error);
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command).catch(console.error);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const handleTerminalContextMenu = (e: React.MouseEvent) => {
    const menuItems = [
      {
        id: 'copy',
        label: 'Copy Output',
        icon: '📋',
        shortcut: 'Ctrl+C',
        action: copyOutput
      },
      {
        id: 'clear',
        label: 'Clear Terminal',
        icon: '🧹',
        shortcut: 'Ctrl+L',
        action: clearSession
      },
      {
        id: 'separator1',
        separator: true
      },
      {
        id: 'newSession',
        label: 'New Terminal',
        icon: '➕',
        shortcut: 'Ctrl+Shift+`',
        action: createNewSession
      },
      {
        id: 'search',
        label: 'Search Output',
        icon: '🔍',
        shortcut: 'Ctrl+F',
        action: () => setShowSearch(true)
      },
      {
        id: 'separator2',
        separator: true
      },
      {
        id: 'ai',
        label: 'Ask AI about Terminal',
        icon: '🤖',
        shortcut: 'Ctrl+K',
        action: () => {
          const context = `Terminal output:\n${activeSession?.history.slice(-10).map(h => h.content).join('\n')}`;
          onAIRequest?.(context);
        }
      }
    ];

    handleContextMenu(e, menuItems);
  };

  const filteredHistory = activeSession?.history.filter(line => 
    !searchQuery || line.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!isVisible) return null;

  return (
    <div 
      className={`bg-vscode-bg border-t border-vscode-border flex flex-col ${className}`}
      style={{ height: isMaximized ? '80vh' : height }}
      onContextMenu={handleTerminalContextMenu}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <div className="flex items-center space-x-1">
            {/* Session tabs */}
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`px-3 py-1 text-sm rounded-t cursor-pointer flex items-center space-x-2 ${
                  session.id === activeSessionId
                    ? 'bg-vscode-bg text-vscode-fg border-t border-l border-r border-vscode-border'
                    : 'bg-vscode-tab-bg text-vscode-fg-muted hover:bg-vscode-tab-hover hover:text-vscode-fg'
                }`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <span>{session.name}</span>
                {sessions.length > 1 && (
                  <X 
                    className="w-3 h-3 hover:text-red-400" 
                    onClick={(e) => {
                      e.stopPropagation();
                      closeSession(session.id);
                    }}
                  />
                )}
              </div>
            ))}
            <button
              onClick={createNewSession}
              className="p-1 text-vscode-fg-muted hover:text-vscode-fg rounded"
              title="New Terminal (Ctrl+Shift+`)"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Terminal controls */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1 text-vscode-fg-muted hover:text-vscode-fg rounded"
            title="Search in Terminal"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCommandHistory([])}
            className="p-1 text-vscode-fg-muted hover:text-vscode-fg rounded"
            title="Clear Command History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={clearSession}
            className="p-1 text-vscode-fg-muted hover:text-vscode-fg rounded"
            title="Clear Terminal (Ctrl+L)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={copyOutput}
            className="p-1 text-vscode-fg-muted hover:text-vscode-fg rounded"
            title="Copy Output"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMaximize}
            className="p-1 text-vscode-fg-muted hover:text-vscode-fg rounded"
            title="Toggle Maximize"
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggleVisibility}
            className="p-1 text-vscode-fg-muted hover:text-vscode-fg rounded"
            title="Close Terminal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
          <input
            type="text"
            placeholder="Search terminal output..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1 bg-vscode-bg text-vscode-fg rounded border border-vscode-border focus:border-vscode-accent focus:outline-none"
            autoFocus
          />
        </div>
      )}

      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm text-green-400 leading-relaxed bg-vscode-bg"
      >
        {filteredHistory.map((output) => (
          <div 
            key={output.id} 
            className={`mb-1 flex items-start space-x-2 ${
              output.type === 'error' ? 'text-red-400' : 
              output.type === 'command' ? 'text-blue-400' : 'text-green-400'
            }`}
          >
            {output.type === 'command' && (
              <>
                <ChevronRight className="w-4 h-4 mt-0.5 text-blue-400" />
                <span className="text-gray-500 text-xs">{formatTimestamp(output.timestamp)}</span>
                <span 
                  className="cursor-pointer hover:bg-gray-800 px-1 rounded"
                  onClick={() => copyCommand(output.content)}
                  title="Click to copy command"
                >
                  {output.content}
                </span>
              </>
            )}
            {output.type !== 'command' && (
              <>
                <span className="text-gray-500 text-xs w-16">{formatTimestamp(output.timestamp)}</span>
                <pre className="whitespace-pre-wrap flex-1">{output.content}</pre>
              </>
            )}
          </div>
        ))}
        
        {isExecuting && (
          <div className="flex items-center space-x-2 text-yellow-400">
            <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
            <span>Executing command...</span>
          </div>
        )}
      </div>

      {/* Command Input */}
      <div className="border-t border-vscode-border p-4 bg-vscode-sidebar">
        <form onSubmit={handleInputSubmit} className="flex items-center space-x-2">
          <span className="text-green-400 font-mono">
            {activeSession?.workingDirectory?.split('/').pop() || 'terminal'}$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command... (try 'ai <question>' for AI help)"
            className="flex-1 bg-transparent text-green-400 font-mono focus:outline-none placeholder-vscode-fg-muted"
            disabled={isExecuting}
            autoComplete="off"
          />
          <button
            onClick={() => {
              // Cancel current command execution
              if (isExecuting && activeSession) {
                setIsExecuting(false);
                
                // Add cancellation message to terminal output
                const cancelOutput: TerminalOutput = {
                  id: `cancel-${Date.now()}`,
                  type: 'error',
                  content: '^C Command cancelled by user',
                  timestamp: new Date()
                };
                
                const updatedSessions = sessions.map(session => {
                  if (session.id === activeSession.id) {
                    return {
                      ...session,
                      history: [...session.history, cancelOutput]
                    };
                  }
                  return session;
                });
                
                setSessions(updatedSessions);
                setCurrentInput('');
                
                // Focus back to input
                setTimeout(() => inputRef.current?.focus(), 100);
              }
            }}
            disabled={!isExecuting}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 disabled:bg-gray-600/20 disabled:cursor-not-allowed text-red-400 disabled:text-gray-500 rounded transition-colors text-sm"
            title="Cancel current command (Ctrl+C)"
          >
            Cancel
          </button>
        </form>
        
        {/* Command suggestions */}
        {currentInput.startsWith('ai ') && (
          <div className="mt-2 text-xs text-vscode-fg-muted flex items-center space-x-1">
            <Bot className="w-3 h-3" />
            <span>AI command detected - will send to AI assistant</span>
          </div>
        )}
      </div>
    </div>
  );
}; 