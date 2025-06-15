import React, { useRef, useEffect, useState, useCallback } from 'react';
import { XTerm } from '@pablo-lion/xterm-react';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { invoke } from '@tauri-apps/api/core';
import { Terminal, X, Plus, Maximize2, Minimize2, Copy } from 'lucide-react';

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
  onAIRequest: _onAIRequest,
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

  // Initialize terminal with proper cleanup
  useEffect(() => {
    if (isVisible && !isInitialized) {
      initializeTerminal();
    }
    
    // Cleanup on unmount
    return () => {
      outputPollingRef.current = false; // Stop polling
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

      
      // Create initial session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create PTY session in backend
      const ptyId = await invoke<string>('create_terminal_session', {
        workingDirectory: projectPath
      });
      
      const newSession: TerminalSession = {
        id: sessionId,
        name: 'Terminal 1',
        ptyId: ptyId,
        workingDirectory: projectPath,
      };
      
      setSessions([newSession]);
      setActiveSessionId(sessionId);
      setIsInitialized(true);
      initializingRef.current = false;
      

      
      // Start polling for output
      startOutputPolling(ptyId);
      
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      initializingRef.current = false;
    }
  };

  // Start smart output polling (adaptive polling rate)
  const startOutputPolling = (ptyId: string) => {
    outputPollingRef.current = true; // Enable polling
    
    let consecutiveEmptyReads = 0;
    const maxEmptyReads = 10; // After 10 empty reads, slow down polling
    
    const poll = async () => {
      // Check if polling is still enabled
      if (!outputPollingRef.current) return;
      
      try {
        const output = await invoke<string>('read_terminal_output', {
          sessionId: ptyId,
          timeoutMs: 100 // Reasonable timeout
        });
        
        if (output && output.length > 0 && xtermRef.current) {
          xtermRef.current.write(output);
          consecutiveEmptyReads = 0; // Reset counter on successful read
          
          // Schedule next poll immediately for active output
          setTimeout(poll, 16);
        } else {
          consecutiveEmptyReads++;
          
          // Adaptive polling: slow down when no output
          const delay = consecutiveEmptyReads > maxEmptyReads ? 200 : 50;
          setTimeout(poll, delay);
        }
      } catch (error) {
        // Ignore timeout errors and slow down polling
        consecutiveEmptyReads++;
        const delay = consecutiveEmptyReads > maxEmptyReads ? 500 : 100;
        setTimeout(poll, delay);
      }
    };
    
    // Start polling
    poll();
  };

  // Handle terminal data (direct pty communication)
  const handleTerminalData = useCallback(async (data: string) => {
    if (!activeSessionId) return;
    
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession?.ptyId) return;

    try {
      // Send raw data directly to pty - let the shell handle line endings completely
      await invoke('send_terminal_input', {
        sessionId: activeSession.ptyId,
        input: data
      });
    } catch (error) {
      console.error('Failed to send input to pty:', error);
    }
  }, [activeSessionId, sessions]);

  // Initialize fit addon after terminal is mounted
  useEffect(() => {
    if (isInitialized && xtermRef.current && !fitAddonRef.current) {
      // Multiple attempts to find the fit addon
      const findFitAddon = () => {
        if (!xtermRef.current) return false;
        
        // Try different ways to access the fit addon
        const addons = xtermRef.current.loadedAddons || [];
        let fitAddon = addons.find((addon: any) => addon.constructor.name === 'FitAddon');
        
        // Alternative: try to access via terminal instance
        if (!fitAddon && xtermRef.current.terminal) {
          const terminal = xtermRef.current.terminal;
          if (terminal._addonManager && terminal._addonManager._addons) {
            fitAddon = terminal._addonManager._addons.find((addon: any) => 
              addon.constructor.name === 'FitAddon'
            );
          }
        }
        
        if (fitAddon) {
          fitAddonRef.current = fitAddon;
          return true;
        }
        
        return false;
      };
      
      // Try to find fit addon with retries
      const tryInitialize = (attempts = 0) => {
        if (attempts > 10) {
          console.error('Failed to initialize FitAddon after 10 attempts');
          return;
        }
        
        if (findFitAddon()) {
          // Initial fit with delay to ensure container is ready
          setTimeout(() => fitTerminal(), 200);
        } else {
          setTimeout(() => tryInitialize(attempts + 1), 100);
        }
      };
      
      tryInitialize();
    }
  }, [isInitialized]);

  // Handle container resize with proper debouncing
  useEffect(() => {
    if (!isInitialized || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        fitTerminal();
      }, 50);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [isInitialized]);

  // Force fit when terminal becomes visible
  useEffect(() => {
    if (isVisible && isInitialized && fitAddonRef.current) {
      // Small delay to ensure container is fully rendered
      setTimeout(() => {
        fitTerminal();
      }, 100);
    }
  }, [isVisible, isInitialized]);

  // Create new session
  const createNewSession = async () => {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const ptyId = await invoke<string>('create_terminal_session', {
        workingDirectory: projectPath
      });
      
      const newSession: TerminalSession = {
        id: sessionId,
        name: `Terminal ${sessions.length + 1}`,
        ptyId: ptyId,
        workingDirectory: projectPath,
      };
      
      setSessions(prev => [...prev, newSession]);
      setActiveSessionId(sessionId);
      
      // Start polling for the new session
      startOutputPolling(ptyId);
      
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  // Close session
  const closeSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session?.ptyId) {
      try {
        await invoke('close_terminal_session', {
          sessionId: session.ptyId
        });
      } catch (error) {
        console.error('Error closing session:', error);
      }
    }
    
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    
    if (activeSessionId === sessionId) {
      if (newSessions.length > 0) {
        setActiveSessionId(newSessions[0].id);
        // Start polling for the new active session
        const newActiveSession = newSessions[0];
        if (newActiveSession.ptyId) {
          startOutputPolling(newActiveSession.ptyId);
        }
      } else {
        outputPollingRef.current = false; // Stop polling
        onToggleVisibility();
      }
    }
  };

  // Copy terminal content
  const copyTerminalContent = () => {
    if (xtermRef.current) {
      const selection = xtermRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  };

  // Enhanced fit function following VS Code's approach
  const fitTerminal = useCallback(() => {
    if (!fitAddonRef.current || !xtermRef.current || !containerRef.current) {
      return;
    }
    
    try {
      // Get container dimensions with proper calculation
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      // Account for padding and borders (VS Code style calculation)
      const computedStyle = window.getComputedStyle(container);
      const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
      const paddingRight = parseInt(computedStyle.paddingRight) || 0;
      const paddingTop = parseInt(computedStyle.paddingTop) || 0;
      const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
      
      const availableWidth = containerRect.width - paddingLeft - paddingRight;
      const availableHeight = containerRect.height - paddingTop - paddingBottom;

      // Ensure container has proper dimensions
      if (availableWidth <= 0 || availableHeight <= 0) {
        setTimeout(() => fitTerminal(), 100);
        return;
      }

      // Force the terminal element to use full available space
      const xtermElement = xtermRef.current.element;
      if (xtermElement) {
        // Set explicit dimensions to prevent XTerm from using default 640px width
        xtermElement.style.width = `${availableWidth}px`;
        xtermElement.style.height = `${availableHeight}px`;
        xtermElement.style.maxWidth = 'none';
        xtermElement.style.minWidth = '0';
        
        // Ensure all child elements also use full space
        const screen = xtermElement.querySelector('.xterm-screen') as HTMLElement;
        const viewport = xtermElement.querySelector('.xterm-viewport') as HTMLElement;
        const canvas = xtermElement.querySelector('canvas') as HTMLCanvasElement;
        const rows = xtermElement.querySelector('.xterm-rows') as HTMLElement;
        
        if (screen) {
          screen.style.width = `${availableWidth}px`;
          screen.style.height = `${availableHeight}px`;
          screen.style.maxWidth = 'none';
          screen.style.minWidth = '0';
        }
        if (viewport) {
          viewport.style.width = `${availableWidth}px`;
          viewport.style.height = `${availableHeight}px`;
          viewport.style.maxWidth = 'none';
          viewport.style.minWidth = '0';
        }
        if (canvas) {
          canvas.style.width = `${availableWidth}px`;
          canvas.style.height = `${availableHeight}px`;
          canvas.style.maxWidth = 'none';
          canvas.style.minWidth = '0';
        }
        
        // CRITICAL: Force xterm-rows to use full width (this is what's stuck at 640px)
        if (rows) {
          rows.style.width = `${availableWidth}px !important`;
          rows.style.maxWidth = 'none';
          rows.style.minWidth = '0';
          
          // Force all row divs to use full width
          const rowDivs = rows.querySelectorAll('div');
          rowDivs.forEach(rowDiv => {
            (rowDiv as HTMLElement).style.width = `${availableWidth}px !important`;
            (rowDiv as HTMLElement).style.maxWidth = 'none';
            (rowDiv as HTMLElement).style.minWidth = '0';
          });
        }
      }

      // Perform the fit operation
      fitAddonRef.current.fit();
      
      // Get the new dimensions after fit
      const newCols = xtermRef.current.cols || 80;
      const newRows = xtermRef.current.rows || 24;
      
      // VS Code-style validation: ensure dimensions are reasonable
      if (newCols < 10 || newRows < 1 || newCols > 500 || newRows > 200) {
        return;
      }
      
      // Update the backend PTY to match the frontend terminal dimensions
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession?.ptyId) {
        // Debounced backend resize (VS Code approach)
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
        }, 100); // 100ms debounce like VS Code
      }
      
    } catch (error) {
      console.warn('Terminal fit failed:', error);
    }
  }, [activeSessionId, sessions]);

  if (!isVisible) return null;

  // Calculate dynamic terminal options based on container size
  const getTerminalOptions = useCallback(() => {
    const baseOptions = {
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
      fontWeightBold: 700,
      lineHeight: 1.4,
      letterSpacing: 0,
      cursorBlink: true,
      cursorStyle: 'bar' as const,
      cursorWidth: 2,
      scrollback: 10000,
      tabStopWidth: 4,
      allowTransparency: false,
      convertEol: false,
      disableStdin: false,
      localEcho: false,
      macOptionIsMeta: true,
      rightClickSelectsWord: true,
      fastScrollModifier: 'alt' as const,
      fastScrollSensitivity: 5,
      scrollSensitivity: 3,
      windowsMode: false,
    };

    // Calculate dimensions based on container if available
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const availableWidth = containerRect.width - 8; // Account for padding
      const availableHeight = containerRect.height - 8;
      
      // Calculate approximate cols/rows based on font size
      const charWidth = 7.2; // Approximate character width for size 13 font
      const charHeight = 18.2; // Approximate character height with line height 1.4
      
      const cols = Math.floor(availableWidth / charWidth);
      const rows = Math.floor(availableHeight / charHeight);
      
      if (cols > 10 && rows > 1) {
        return {
          ...baseOptions,
          cols: cols,
          rows: rows,
        };
      }
    }
    
    return baseOptions;
  }, []);

  const terminalOptions = getTerminalOptions();

  return (
    <div 
      className={`bg-[#1e1e1e] ${showHeader ? 'border border-[#3c3c3c] rounded-lg shadow-2xl' : ''} overflow-hidden ${className}`}
      style={{ 
        height: isMaximized ? '80vh' : height,
        width: '100%',
        maxWidth: 'none',
        minWidth: '0'
      }}
    >
      {/* Terminal Header - VS Code Style */}
      {showHeader && (
        <div className="flex items-center justify-between bg-[#2d2d30] px-3 py-1.5 border-b border-[#3c3c3c]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-[#cccccc]" />
              <span className="text-[#cccccc] text-sm font-medium">Terminal</span>
            </div>
            
            {/* Terminal Tabs */}
            <div className="flex space-x-0">
              {sessions.map((session, index) => (
                <button
                  key={session.id}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    if (session.ptyId) {
                      startOutputPolling(session.ptyId);
                    }
                  }}
                  className={`group flex items-center px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    activeSessionId === session.id
                      ? 'bg-[#1e1e1e] text-[#ffffff] border-t-2 border-[#007acc]'
                      : 'bg-transparent text-[#cccccc] hover:bg-[#37373d] hover:text-[#ffffff]'
                  }`}
                  style={{
                    borderTopLeftRadius: index === 0 ? '4px' : '0',
                    borderTopRightRadius: index === sessions.length - 1 ? '4px' : '0',
                  }}
                >
                  <span>{session.name}</span>
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeSession(session.id);
                      }}
                      className="ml-2 opacity-0 group-hover:opacity-100 text-[#cccccc] hover:text-[#f48771] transition-all duration-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Terminal Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={createNewSession}
              className="p-1.5 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#37373d] rounded transition-all duration-200"
              title="New Terminal (Ctrl+Shift+`)"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={copyTerminalContent}
              className="p-1.5 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#37373d] rounded transition-all duration-200"
              title="Copy Selection (Ctrl+C)"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            <div className="w-px h-4 bg-[#3c3c3c] mx-1" />
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#37373d] rounded transition-all duration-200"
              title={isMaximized ? 'Restore Panel' : 'Maximize Panel'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onToggleVisibility}
              className="p-1.5 text-[#cccccc] hover:text-[#f48771] hover:bg-[#37373d] rounded transition-all duration-200"
              title="Hide Terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Terminal Content */}
      <div 
        ref={containerRef}
        className={`relative bg-[#1e1e1e] w-full overflow-hidden`} 
        style={{ 
          width: '100%', 
          maxWidth: 'none',
          minWidth: '0',
          height: showHeader ? 'calc(100% - 40px)' : '100%',
          padding: '4px' // Small padding for better appearance
        }}
      >
        {isInitialized ? (
          <div 
            className="h-full w-full min-h-0 min-w-0 terminal-container" 
            style={{ 
              width: '100%', 
              maxWidth: 'none',
              minWidth: '0',
              height: '100%',
              display: 'block'
            }}
          >
            <XTerm
              ref={xtermRef}
              options={terminalOptions}
              onData={handleTerminalData}
              addons={[new FitAddon(), new WebLinksAddon()]}
              className="h-full w-full block terminal-xterm"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#cccccc]">
            <div className="text-center">
              <div className="relative">
                <Terminal className="w-8 h-8 mx-auto mb-3 text-[#007acc]" />
                <div className="absolute inset-0 w-8 h-8 mx-auto mb-3 border-2 border-[#007acc] rounded-full animate-ping opacity-20" />
              </div>
              <p className="text-sm font-medium">Initializing terminal...</p>
              <p className="text-xs text-[#858585] mt-1">Setting up shell environment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 