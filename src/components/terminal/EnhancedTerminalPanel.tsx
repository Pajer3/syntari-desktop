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
import { 
  getTerminalTheme, 
  generatePrompt, 
  getOSCommands, 
  BlinkingCursor,
  type OSTerminalInfo,
  type TerminalTheme 
} from './OSTerminalTheme';
import { TerminalAutoComplete } from './TerminalAutoComplete';
import type { TerminalSession, TerminalOutput, TerminalInfo } from '../../services/types';

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
  const [, setTerminalInfo] = useState<TerminalInfo | null>(null);
  const [osInfo, setOSInfo] = useState<OSTerminalInfo | null>(null);
  const [theme, setTheme] = useState<TerminalTheme | null>(null);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleContextMenu = useContextMenuHandler();

  // Initialize terminal service
  useEffect(() => {
    const initializeTerminal = async () => {
      try {
        await terminalService.initialize();
        
        // Get terminal info for OS-specific theming
        const info = await terminalService.getTerminalInfo();
        setTerminalInfo(info);
        
        // Set up OS info and theme
        const osTerminalInfo: OSTerminalInfo = {
          os: info.os,
          shell: info.shell,
          username: info.username,
          hostname: info.hostname,
        };
        setOSInfo(osTerminalInfo);
        
        const terminalTheme = getTerminalTheme(osTerminalInfo);
        setTheme(terminalTheme);
        
        const session = await terminalService.createSession('Main', projectPath);
        setSessions([session]);
        setActiveSessionId(session.id);
        
        // Add OS-specific welcome message
        const osName = info.os.charAt(0).toUpperCase() + info.os.slice(1);
        const welcomeOutput: TerminalOutput = {
          id: 'welcome',
          type: 'output',
          content: `🚀 Syntari AI IDE Terminal (${osName})\n📁 Project: ${projectPath}\n🖥️  Shell: ${info.shell}\n💡 Type 'help' for AI-enhanced commands`,
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
      const terminal = terminalRef.current;
      terminal.scrollTop = terminal.scrollHeight;
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

    console.log('Executing command:', command);
    setIsExecuting(true);
    
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
        setCurrentInput('');
        return;
      }

      // Handle built-in commands
      if (command === 'help' || command === '--help') {
        const helpOutput: TerminalOutput = {
          id: `help-${Date.now()}`,
          type: 'output',
          content: `🚀 Syntari AI IDE Terminal Help

Built-in Commands:
  help, --help     Show this help message
  clear, cls       Clear terminal screen
  exit             Close terminal session
  ai <question>    Ask AI assistant a question
  ask <question>   Alias for 'ai' command

OS Commands (${osInfo?.os || 'Unknown'}):
  ${osInfo ? getOSCommands(osInfo.os).slice(0, 8).join(', ') : 'Loading...'}
  
Features:
  • Tab completion for commands and files
  • Command history (↑/↓ arrows)
  • Multi-session support (Ctrl+Shift+\`)
  • AI-powered assistance
  • OS-specific terminal theming
  • Search terminal output (Ctrl+F)

Keyboard Shortcuts:
  Tab              Show auto-completion
  ↑/↓              Navigate command history
  Ctrl+L           Clear terminal
  Ctrl+C           Cancel current command
  Ctrl+F           Search terminal output
  Ctrl+Shift+\`    New terminal session
  Escape           Close auto-completion

💡 Try typing 'ai how do I...' for intelligent help!`,
          timestamp: new Date()
        };
        
        setSessions(prev => prev.map(session => 
          session.id === activeSession.id 
            ? { ...session, history: [...session.history, helpOutput] }
            : session
        ));
        setCurrentInput('');
        return;
      }

      // Handle clear command
      if (command === 'clear' || command === 'cls') {
        clearSession();
        setCurrentInput('');
        return;
      }

      // Handle exit command
      if (command === 'exit') {
        if (sessions.length > 1) {
          closeSession(activeSession.id);
        } else {
          onToggleVisibility();
        }
        setCurrentInput('');
        return;
      }

      // Execute regular command
      console.log('Calling terminalService.executeCommand with:', activeSession.id, command);
      const result = await terminalService.executeCommand(activeSession.id, command);
      console.log('Command result:', result);
      
      // Log result for debugging
      if (!result.success) {
        console.warn('Command execution had issues:', result.error);
      }
      
      // Update sessions with new output - get the fresh session from the service
      setSessions(prev => prev.map(session => {
        if (session.id === activeSession.id) {
          const updatedSession = terminalService.getSession(session.id);
          if (updatedSession) {
            console.log('Updated session with', updatedSession.history.length, 'history items');
            return updatedSession;
          } else {
            console.warn('Could not get updated session from service, manually adding command result');
            // Fallback: manually add the command and result to the session
            const commandOutput: TerminalOutput = {
              id: `cmd-${Date.now()}`,
              type: 'command',
              content: command,
              timestamp: new Date(),
            };
            
            const resultOutput: TerminalOutput = {
              id: `result-${Date.now()}`,
              type: result.success ? 'output' : 'error',
              content: result.output || result.error || 'No output',
              timestamp: new Date(),
              exitCode: result.exitCode,
            };
            
            return {
              ...session,
              history: [...session.history, commandOutput, resultOutput]
            };
          }
        }
        return session;
      }));
      
      // Clear input only after successful execution
      setCurrentInput('');
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
      setCurrentInput('');
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
      if (!showAutoComplete) {
        setShowAutoComplete(true);
      }
    } else if (e.key === 'Escape') {
      if (showAutoComplete) {
        setShowAutoComplete(false);
      }
    } else {
      // Show auto-complete when typing
      if (currentInput.trim() && !showAutoComplete) {
        setShowAutoComplete(true);
      } else if (!currentInput.trim() && showAutoComplete) {
        setShowAutoComplete(false);
      }
    }

    // Legacy tab completion (keeping as fallback)
    if (e.key === 'Tab' && !showAutoComplete) {
      const currentCommand = currentInput.trim();
      const words = currentCommand.split(' ');
      const lastWord = words[words.length - 1];
      
      // Get OS-specific commands
      const osCommands = osInfo ? getOSCommands(osInfo.os) : [];
      const commonCommands = [...osCommands, 'git', 'npm', 'node', 'python', 'cargo', 'rustc', 'go', 'javac', 'java', 'ai', 'ask'];
      
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

  if (!osInfo || !theme) {
    return (
      <div className={`bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg flex items-center justify-center ${className}`}
           style={{ height: `${height}px` }}>
        <div className="text-vscode-fg-muted">Loading terminal...</div>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col ${className}`}
      style={{ 
        height: isMaximized ? '80vh' : height,
        backgroundColor: theme.backgroundColor,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: '8px',
        overflow: 'hidden'
      }}
      onContextMenu={handleTerminalContextMenu}
    >
      {/* Terminal Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{
          backgroundColor: theme.backgroundColor,
          borderColor: theme.borderColor,
        }}
      >
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4" style={{ color: theme?.successColor || '#51cf66' }} />
          <span className="text-xs px-2 py-1 rounded" style={{ 
            backgroundColor: theme?.successColor || '#51cf66',
            color: theme?.backgroundColor || '#1e1e1e'
          }}>
            {osInfo?.os.toUpperCase() || 'TERMINAL'}
          </span>
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
        <div 
          className="px-4 py-2 border-b"
          style={{
            backgroundColor: theme.backgroundColor,
            borderColor: theme.borderColor,
          }}
        >
          <input
            type="text"
            placeholder="Search terminal output..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1 rounded border focus:outline-none"
            style={{
              backgroundColor: theme.backgroundColor,
              color: theme.textColor,
              borderColor: theme.borderColor,
              fontFamily: theme.fontFamily,
            }}
            autoFocus
          />
        </div>
      )}

      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 leading-relaxed"
        style={{
          backgroundColor: theme?.backgroundColor || '#1e1e1e',
          color: theme?.textColor || '#ffffff',
          fontFamily: theme?.fontFamily || 'monospace',
          fontSize: theme?.fontSize || '14px',
          lineHeight: theme?.lineHeight || '1.4',
        }}
      >
        {filteredHistory.map((output) => (
          <div 
            key={output.id} 
            className="mb-1 flex items-start space-x-2"
            style={{
              color: output.type === 'error' ? theme?.errorColor || '#ff6b6b' : 
                     output.type === 'command' ? theme?.commandColor || '#ffffff' : 
                     theme?.outputColor || '#ffffff'
            }}
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
      <div 
        className="border-t p-4 relative"
        style={{
          backgroundColor: theme?.backgroundColor || '#1e1e1e',
          borderColor: theme?.borderColor || '#404040',
        }}
      >
        {/* Auto-complete */}
        {osInfo && (
          <TerminalAutoComplete
            input={currentInput}
            osInfo={osInfo}
            workingDirectory={activeSession?.workingDirectory || '/'}
            onSelect={(completion) => {
              const words = currentInput.trim().split(' ');
              words[words.length - 1] = completion;
              setCurrentInput(words.join(' ') + ' ');
              setShowAutoComplete(false);
              inputRef.current?.focus();
            }}
            onClose={() => setShowAutoComplete(false)}
            visible={showAutoComplete}
          />
        )}
        
        <form onSubmit={handleInputSubmit} className="w-full flex items-center gap-2">
          <span 
            className="flex-shrink-0 text-sm"
            style={{
              color: theme?.promptColor || '#8ae234',
              fontFamily: theme?.fontFamily || 'monospace',
              minWidth: 'max-content',
            }}
          >
            {osInfo && activeSession ? 
              generatePrompt(osInfo, activeSession.workingDirectory) : 
              'terminal$'
            }
          </span>
          <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command... (try 'ai <question>' for AI help)"
              className="w-full bg-transparent focus:outline-none placeholder-gray-500 pr-2"
            style={{
              color: theme?.textColor || '#ffffff',
              fontFamily: theme?.fontFamily || 'monospace',
                fontSize: '14px',
                padding: '4px 8px',
                minWidth: '0',
            }}
            disabled={isExecuting}
            autoComplete="off"
          />
          {!isExecuting && (
              <div className="absolute right-2 pointer-events-none">
            <BlinkingCursor theme={theme || { cursorColor: '#ffffff' } as TerminalTheme} />
              </div>
          )}
          </div>
          {isExecuting && (
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
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
            title="Cancel current command (Ctrl+C)"
          >
              ✕
          </button>
          )}
        </form>
        
        {/* Command suggestions and status */}
        <div className="mt-2 flex items-center justify-between">
          {currentInput.startsWith('ai ') && (
            <div className="text-xs flex items-center space-x-1" style={{ color: theme?.promptColor }}>
              <Bot className="w-3 h-3" />
              <span>AI command detected - will send to AI assistant</span>
            </div>
          )}
          
          {/* Terminal status */}
          <div className="flex items-center space-x-2 text-xs" style={{ color: theme?.textColor }}>
            <div className="flex items-center space-x-1">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme?.successColor || '#51cf66' }}
              />
              <span>Connected</span>
            </div>
            {activeSession && (
              <span style={{ color: theme?.promptColor }}>
                {activeSession.history.length} lines
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 