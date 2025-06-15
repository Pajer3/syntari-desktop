import React, { useRef, useEffect, useState, useCallback } from 'react';
import { XTerm } from '@pablo-lion/xterm-react';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { invoke } from '@tauri-apps/api/core';
import { 
  Terminal, X, Plus, Maximize2, Minimize2, Copy, Search, 
  Settings, History, Trash2
} from 'lucide-react';
import { TerminalStatusBar } from './TerminalStatusBar';

interface XTerminalPanelProps {
  projectPath: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  height?: number;
  className?: string;
  onAIRequest?: (context: string) => void;
  showHeader?: boolean;
}

interface TerminalSession {
  id: string;
  name: string;
  ptyId?: string;
  workingDirectory: string;
}

export const XTerminalPanel: React.FC<XTerminalPanelProps> = ({
  projectPath,
  isVisible,
  onToggleVisibility,
  height = 300,
  className = '',
  onAIRequest,
  showHeader = true,
}) => {
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const outputPollingRef = useRef<boolean>(false);
  const initializingRef = useRef<boolean>(false);
  const resizeTimeoutRef = useRef<any>(null);
  
  // UI State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [commandHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize terminal with proper cleanup
  useEffect(() => {
    if (isVisible && !isInitialized) {
      initializeTerminal();
    }
    
    return () => {
      outputPollingRef.current = false;
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (isInitialized) {
        sessions.forEach(session => {
          if (session.ptyId) {
            invoke('close_terminal_session', { sessionId: session.ptyId }).catch(console.error);
          }
        });
      }
    };
  }, [isVisible]);

  const initializeTerminal = async () => {
    if (isInitialized || initializingRef.current) {
      return;
    }
    
    initializingRef.current = true;
    
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const ptyId = await invoke<string>('create_terminal_session', {
        workingDirectory: projectPath
      });
      
      const newSession: TerminalSession = {
        id: sessionId,
        name: 'Main',
        ptyId: ptyId,
        workingDirectory: projectPath,
      };
      
      setSessions([newSession]);
      setActiveSessionId(sessionId);
      setIsInitialized(true);
      initializingRef.current = false;
      
      startOutputPolling(ptyId);
      
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      initializingRef.current = false;
    }
  };

  const startOutputPolling = (ptyId: string) => {
    outputPollingRef.current = true;
    
    let consecutiveEmptyReads = 0;
    const maxEmptyReads = 10;
    
    const poll = async () => {
      if (!outputPollingRef.current) return;
      
      try {
        const output = await invoke<string>('read_terminal_output', {
          sessionId: ptyId,
          timeoutMs: 100
        });
        
        if (output && output.length > 0 && xtermRef.current) {
          xtermRef.current.write(output);
          consecutiveEmptyReads = 0;
          setTimeout(poll, 16);
        } else {
          consecutiveEmptyReads++;
          const delay = consecutiveEmptyReads > maxEmptyReads ? 200 : 50;
          setTimeout(poll, delay);
        }
      } catch (error) {
        consecutiveEmptyReads++;
        const delay = consecutiveEmptyReads > maxEmptyReads ? 500 : 100;
        setTimeout(poll, delay);
      }
    };
    
    poll();
  };

  const handleTerminalData = useCallback(async (data: string) => {
    if (!activeSessionId) return;
    
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession?.ptyId) return;

    try {
      await invoke('send_terminal_input', {
        sessionId: activeSession.ptyId,
        input: data
      });
    } catch (error) {
      console.error('Failed to send input to pty:', error);
    }
  }, [activeSessionId, sessions]);

  // Initialize fit addon
  useEffect(() => {
    if (isInitialized && xtermRef.current && !fitAddonRef.current) {
      const initializeFitAddon = async () => {
        try {
          const { FitAddon } = await import('@xterm/addon-fit');
          const fitAddon = new FitAddon();
          const terminal = xtermRef.current?.terminal;
          
          if (!terminal) {
            console.warn('Terminal instance not available for FitAddon');
            return;
          }
          
          terminal.loadAddon(fitAddon);
          fitAddonRef.current = fitAddon;
          
          // Initial fit
          setTimeout(() => {
            fitTerminal();
          }, 100);
          
        } catch (error) {
          console.error('Failed to initialize FitAddon:', error);
        }
      };

      initializeFitAddon();
    }
  }, [isInitialized]);

  // Resize handling
  useEffect(() => {
    if (!isInitialized) return;

    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        fitTerminal();
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isInitialized]);

  const createNewSession = async () => {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const ptyId = await invoke<string>('create_terminal_session', {
        workingDirectory: projectPath
      });
      
      const newSession: TerminalSession = {
        id: sessionId,
        name: `${sessions.length + 1}`,
        ptyId: ptyId,
        workingDirectory: projectPath,
      };
      
      setSessions(prev => [...prev, newSession]);
      setActiveSessionId(sessionId);
      startOutputPolling(ptyId);
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  const closeSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session?.ptyId) {
      try {
        await invoke('close_terminal_session', { sessionId: session.ptyId });
      } catch (error) {
        console.error('Failed to close session:', error);
      }
    }
    
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    
    if (activeSessionId === sessionId && updatedSessions.length > 0) {
      setActiveSessionId(updatedSessions[0].id);
    }
  };

  const copyTerminalContent = () => {
    if (xtermRef.current) {
      const selection = xtermRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  };

  const handleClearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  const handleAIRequest = () => {
    if (onAIRequest) {
      const context = `Terminal session in ${projectPath}`;
      onAIRequest(context);
    }
  };

  const fitTerminal = useCallback(() => {
    if (!xtermRef.current || !containerRef.current || !fitAddonRef.current) {
      return;
    }
    
    try {
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      if (containerRect.width <= 0 || containerRect.height <= 0) {
        setTimeout(() => fitTerminal(), 100);
        return;
      }

      fitAddonRef.current.fit();
      
      const newCols = xtermRef.current.cols || 80;
      const newRows = xtermRef.current.rows || 24;
      
      if (newCols < 10 || newRows < 1 || newCols > 500 || newRows > 200) {
        return;
      }
      
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession?.ptyId) {
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        
        resizeTimeoutRef.current = setTimeout(() => {
          invoke('resize_terminal_session', {
            sessionId: activeSession.ptyId,
            cols: newCols,
            rows: newRows
          }).catch((error) => {
            console.warn('Failed to resize backend PTY:', error);
          });
        }, 100);
      }
      
    } catch (error) {
      console.warn('Terminal fit failed:', error);
    }
  }, [activeSessionId, sessions]);

  if (!isVisible) return null;

  const terminalOptions = {
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selection: '#264f78',
      selectionForeground: '#ffffff',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff',
    },
    fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", "SF Mono", Monaco, Consolas, monospace',
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.4,
    cursorBlink: true,
         cursorStyle: 'bar' as const,
    scrollback: 10000,
    tabStopWidth: 4,
    bellStyle: 'sound',
    allowTransparency: true,
    convertEol: true,
         fastScrollModifier: 'shift' as const,
    scrollSensitivity: 3,
    altClickMovesCursor: true,
    rightClickSelectsWord: true,
    macOptionIsMeta: true,
    macOptionClickForcesSelection: false,
    minimumContrastRatio: 1,
    drawBoldTextInBrightColors: true,
    disableStdin: false,
         logLevel: 'warn' as const,
    windowsMode: false,
  };

  return (
    <div className={`flex flex-col bg-[#1e1e1e] text-[#d4d4d4] ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between h-12 px-4 bg-[#2d2d30] border-b border-[#3c3c3c]">
          <div className="flex items-center space-x-2">
            {/* Session Tabs */}
            <div className="flex items-center space-x-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors ${
                    activeSessionId === session.id
                      ? 'bg-[#007acc] text-white'
                      : 'bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4a4a4a]'
                  }`}
                >
                  <span>{session.name}</span>
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeSession(session.id);
                      }}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-[#cccccc] hover:text-[#007acc] hover:bg-[#3c3c3c] rounded transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 text-[#cccccc] hover:text-[#007acc] hover:bg-[#3c3c3c] rounded transition-colors"
              title="Command History"
            >
              <History className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleClearTerminal}
              className="p-2 text-[#cccccc] hover:text-[#ff6b6b] hover:bg-[#3c3c3c] rounded transition-colors"
              title="Clear Terminal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            <button
              onClick={copyTerminalContent}
              className="p-2 text-[#cccccc] hover:text-[#007acc] hover:bg-[#3c3c3c] rounded transition-colors"
              title="Copy Selection"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            <button
              onClick={createNewSession}
              className="p-2 text-[#cccccc] hover:text-[#00ff9f] hover:bg-[#3c3c3c] rounded transition-colors"
              title="New Terminal"
            >
              <Plus className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-[#cccccc] hover:text-[#007acc] hover:bg-[#3c3c3c] rounded transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-[#cccccc] hover:text-[#007acc] hover:bg-[#3c3c3c] rounded transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={onToggleVisibility}
              className="p-2 text-[#cccccc] hover:text-[#ff6b6b] hover:bg-[#3c3c3c] rounded transition-colors"
              title="Close Terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Terminal Content */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ height: showHeader ? `${height - 48}px` : `${height}px` }}
      >
        {isInitialized ? (
          <div className="h-full w-full">
            <XTerm
              ref={xtermRef}
              options={terminalOptions}
              onData={handleTerminalData}
              addons={[new WebLinksAddon()]}
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#cccccc]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <Terminal className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#007acc] z-10" />
                <div className="absolute inset-0 border-2 border-[#007acc] rounded-full animate-spin opacity-30" />
              </div>
              <p className="text-sm font-medium mb-2">Initializing terminal...</p>
              <p className="text-xs text-[#858585]">Setting up shell environment</p>
            </div>
          </div>
        )}

        {/* Search Panel */}
        {showSearch && (
          <div className="absolute top-4 right-4 bg-[#2d2d30] border border-[#3c3c3c] rounded-lg shadow-xl z-10 min-w-[300px]">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#cccccc] text-sm font-medium flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search Terminal
                </h3>
                <button
                  onClick={() => setShowSearch(false)}
                  className="text-[#cccccc] hover:text-[#ff6b6b] p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Search in terminal output..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] text-sm focus:border-[#007acc] focus:outline-none"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="absolute top-4 right-4 bg-[#2d2d30] border border-[#3c3c3c] rounded-lg shadow-xl z-10 min-w-[350px] max-h-[400px] overflow-hidden">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#cccccc] text-sm font-medium flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Command History
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-[#cccccc] hover:text-[#ff6b6b] p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {commandHistory.length > 0 ? (
                  commandHistory.map((cmd, index) => (
                    <div
                      key={index}
                      className="px-2 py-1 bg-[#1e1e1e] rounded text-[#cccccc] text-sm font-mono hover:bg-[#37373d] cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(cmd);
                      }}
                    >
                      {cmd}
                    </div>
                  ))
                ) : (
                  <div className="text-[#858585] text-sm py-4 text-center">
                    No command history yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-4 right-4 bg-[#2d2d30] border border-[#3c3c3c] rounded-lg shadow-xl z-10 min-w-[320px]">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#cccccc] text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Terminal Settings
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-[#cccccc] hover:text-[#ff6b6b] p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[#cccccc] text-sm mb-2">Font Size</label>
                  <input
                    type="range"
                    min="10"
                    max="20"
                    defaultValue="13"
                    className="w-full accent-[#007acc]"
                  />
                  <div className="text-xs text-[#858585] mt-1">13px</div>
                </div>
                
                {onAIRequest && (
                  <button
                    onClick={handleAIRequest}
                    className="w-full px-3 py-2 bg-[#007acc] text-white rounded hover:bg-[#005a9e] transition-colors"
                  >
                    AI Assistant
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <TerminalStatusBar
        workingDirectory={projectPath}
        isConnected={isInitialized}
        commandCount={sessions.length}
      />
    </div>
  );
}; 