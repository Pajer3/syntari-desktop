import React, { useRef, useEffect, useState, useCallback } from 'react';
import { XTerm } from '@pablo-lion/xterm-react';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { invoke } from '@tauri-apps/api/core';
import { 
  Terminal, X, Plus, Maximize2, Minimize2, Copy, Search, 
  Download, Settings, Palette, History, Bot, Trash2,
  FileText, Camera, Volume2, VolumeX
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
  
  // Enhanced Terminal Features State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [terminalTheme, setTerminalTheme] = useState('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
        name: 'Main',
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
      // Create FitAddon instance directly
      const initializeFitAddon = async () => {
        try {
          // Import FitAddon dynamically to ensure it's available
          const { FitAddon } = await import('@xterm/addon-fit');
          
          // Create new FitAddon instance
          const fitAddon = new FitAddon();
          
          // Get the terminal instance
          const terminal = xtermRef.current?.terminal;
          if (!terminal) {
            console.warn('Terminal instance not available for FitAddon');
            return;
          }
          
          // Load the addon into the terminal
          terminal.loadAddon(fitAddon);
          
          // Store reference for later use
          fitAddonRef.current = fitAddon;
          
          console.log('FitAddon successfully initialized');
          
          // Initial fit with delay to ensure container is ready
          setTimeout(() => {
            try {
              fitTerminal();
            } catch (error) {
              console.warn('Initial fit failed:', error);
              // Retry after a longer delay
              setTimeout(() => fitTerminal(), 500);
            }
          }, 200);
          
        } catch (error) {
          console.error('Failed to initialize FitAddon:', error);
          
          // Fallback: try the old approach as last resort
          setTimeout(() => {
            tryFallbackInitialization();
          }, 500);
        }
      };
      
      // Fallback initialization method
      const tryFallbackInitialization = () => {
        console.log('Attempting fallback FitAddon initialization...');
        
        if (!xtermRef.current?.terminal) return;
        
        const terminal = xtermRef.current.terminal;
        
        // Check if FitAddon is already loaded
        if (terminal._addonManager && terminal._addonManager._addons) {
          const existingFitAddon = terminal._addonManager._addons.find((addon: any) => 
            addon.constructor.name === 'FitAddon'
          );
          
          if (existingFitAddon) {
            fitAddonRef.current = existingFitAddon;
            console.log('Found existing FitAddon in fallback');
            setTimeout(() => fitTerminal(), 200);
            return;
          }
        }
        
        // If still no FitAddon, create a manual fit function
        console.warn('Creating manual fit function as final fallback');
        fitAddonRef.current = {
          fit: () => {
            // Manual terminal fitting logic
            if (!containerRef.current || !xtermRef.current?.terminal) return;
            
            const container = containerRef.current;
            const terminal = xtermRef.current.terminal;
            const rect = container.getBoundingClientRect();
            
            // Calculate dimensions
            const style = window.getComputedStyle(container);
            const paddingX = parseInt(style.paddingLeft) + parseInt(style.paddingRight);
            const paddingY = parseInt(style.paddingTop) + parseInt(style.paddingBottom);
            
            const availableWidth = rect.width - paddingX;
            const availableHeight = rect.height - paddingY;
            
            // Estimate character dimensions (approximate values)
            const charWidth = 9; // Approximate character width
            const charHeight = 17; // Approximate character height
            
            const cols = Math.max(10, Math.floor(availableWidth / charWidth));
            const rows = Math.max(3, Math.floor(availableHeight / charHeight));
            
            // Resize terminal
            try {
              terminal.resize(cols, rows);
              console.log(`Manual fit: ${cols}x${rows}`);
            } catch (error) {
              console.warn('Manual terminal resize failed:', error);
            }
          }
        };
        
        setTimeout(() => fitTerminal(), 200);
      };
      
      // Start initialization
      initializeFitAddon();
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
        name: `Tab ${sessions.length + 1}`,
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

  // Enhanced Terminal Feature Functions (Mock implementations)
  const handleSearch = () => {
    setShowSearch(!showSearch);
    console.log('🔍 Terminal search toggled');
  };

  const handleExportSession = () => {
    // Mock: Export terminal session to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `terminal-session-${timestamp}.txt`;
    console.log(`📥 Exporting terminal session to ${filename}`);
    // In real implementation: generate and download file
  };

  const handleThemeChange = () => {
    const themes = ['dark', 'light', 'matrix', 'cyberpunk', 'vintage'];
    const currentIndex = themes.indexOf(terminalTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTerminalTheme(nextTheme);
    console.log(`🎨 Terminal theme changed to: ${nextTheme}`);
  };

  const handleToggleSound = () => {
    setSoundEnabled(!soundEnabled);
    console.log(`🔊 Terminal sound ${!soundEnabled ? 'enabled' : 'disabled'}`);
  };

  const handleShowHistory = () => {
    setShowHistory(!showHistory);
    console.log('📚 Command history toggled');
  };

  const handleAIAssist = () => {
    console.log('🤖 AI terminal assistant activated');
    // Mock AI integration
  };

  const handleClearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      console.log('🗑️ Terminal cleared');
    }
  };

  const handleTakeScreenshot = () => {
    console.log('📸 Terminal screenshot captured');
    // Mock screenshot functionality
  };

  const handleShowSettings = () => {
    setShowSettings(!showSettings);
    console.log('⚙️ Terminal settings toggled');
  };

  // Enhanced fit function following VS Code's approach
  const fitTerminal = useCallback(() => {
    if (!xtermRef.current || !containerRef.current) {
      console.warn('Terminal or container not available for fitting');
      return;
    }
    
    if (!fitAddonRef.current) {
      console.warn('FitAddon not available, skipping fit operation');
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
        minWidth: '0',
        // Add subtle glass effect when enhanced-terminal-ui class is present
        ...(className?.includes('enhanced-terminal-ui') ? {
          backgroundColor: '#1e1e1edd',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'
        } : {})
      }}
    >
      {/* Terminal Header - VS Code Style */}
      {showHeader && (
        <div className="flex items-center justify-between bg-[#2d2d30] px-3 py-1.5 border-b border-[#3c3c3c]">
          <div className="flex items-center space-x-3">
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
          
          {/* Enhanced Terminal Feature Toolbar */}
          <div className="flex items-center space-x-1">
            {/* Search Feature */}
            <button
              onClick={handleSearch}
              className={`p-1.5 rounded transition-all duration-200 ${
                showSearch 
                  ? 'text-[#007acc] bg-[#007acc]/20 hover:bg-[#007acc]/30' 
                  : 'text-[#cccccc] hover:text-[#ffffff] hover:bg-[#37373d]'
              }`}
              title="Search in Terminal (Ctrl+F)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Command History */}
            <button
              onClick={handleShowHistory}
              className={`p-1.5 rounded transition-all duration-200 ${
                showHistory 
                  ? 'text-[#007acc] bg-[#007acc]/20 hover:bg-[#007acc]/30' 
                  : 'text-[#cccccc] hover:text-[#ffffff] hover:bg-[#37373d]'
              }`}
              title="Command History"
            >
              <History className="w-4 h-4" />
            </button>

            {/* AI Assistant */}
            <button
              onClick={handleAIAssist}
              className="p-1.5 text-[#cccccc] hover:text-[#00ff88] hover:bg-[#00ff88]/10 rounded transition-all duration-200"
              title="AI Terminal Assistant"
            >
              <Bot className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-[#3c3c3c] mx-1" />

            {/* Export Session */}
            <button
              onClick={handleExportSession}
              className="p-1.5 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#37373d] rounded transition-all duration-200"
              title="Export Terminal Session"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Take Screenshot */}
            <button
              onClick={handleTakeScreenshot}
              className="p-1.5 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#37373d] rounded transition-all duration-200"
              title="Take Terminal Screenshot"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Theme Selector */}
            <button
              onClick={handleThemeChange}
              className="p-1.5 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#37373d] rounded transition-all duration-200"
              title={`Current Theme: ${terminalTheme}`}
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-1.5 rounded transition-all duration-200 ${
                soundEnabled 
                  ? 'text-[#00ff88] hover:text-[#ffffff] hover:bg-[#37373d]' 
                  : 'text-[#ff6b6b] hover:text-[#ffffff] hover:bg-[#37373d]'
              }`}
              title={soundEnabled ? 'Disable Terminal Sounds' : 'Enable Terminal Sounds'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <div className="w-px h-4 bg-[#3c3c3c] mx-1" />

            {/* Clear Terminal */}
            <button
              onClick={handleClearTerminal}
              className="p-1.5 text-[#cccccc] hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded transition-all duration-200"
              title="Clear Terminal"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button
              onClick={handleShowSettings}
              className={`p-1.5 rounded transition-all duration-200 ${
                showSettings 
                  ? 'text-[#007acc] bg-[#007acc]/20 hover:bg-[#007acc]/30' 
                  : 'text-[#cccccc] hover:text-[#ffffff] hover:bg-[#37373d]'
              }`}
              title="Terminal Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-[#3c3c3c] mx-1" />

            {/* Standard Controls */}
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
            className="h-full w-full min-h-0 min-w-0 terminal-container terminal-glow" 
            style={{ 
              width: '100%', 
              maxWidth: 'none',
              minWidth: '0',
              height: '100%',
              display: 'block',
              position: 'relative',
            }}
          >
            {/* Subtle scanline effect */}
            <div className="terminal-scanline absolute inset-0 pointer-events-none" />
            
            <XTerm
              ref={xtermRef}
              options={terminalOptions}
              onData={handleTerminalData}
              addons={[new WebLinksAddon()]}
              className="h-full w-full block terminal-xterm"
            />
            
            {/* Terminal overlay effects */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at center, transparent 60%, rgba(0, 122, 204, 0.02) 100%)',
                opacity: 0.5,
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#cccccc] backdrop-blur-sm">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 mx-auto relative">
                  <Terminal className="w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#007acc] z-10" />
                  <div className="absolute inset-0 border-2 border-[#007acc] rounded-full animate-spin opacity-30" />
                  <div className="absolute inset-2 border border-[#007acc] rounded-full animate-ping opacity-20" />
                  <div className="absolute inset-4 bg-[#007acc] rounded-full animate-pulse opacity-10" />
                </div>
              </div>
              <p className="text-sm font-medium mb-2 animate-fade-in">Initializing terminal...</p>
              <p className="text-xs text-[#858585] animate-fade-in-up">Setting up shell environment</p>
              
              {/* Loading progress */}
              <div className="mt-4 w-32 mx-auto">
                <div className="h-1 bg-[#3c3c3c] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#007acc] to-[#00a8ff] rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Feature Panels */}
        {showSearch && (
          <div className="absolute top-0 right-0 m-4 bg-[#2d2d30] border border-[#3c3c3c] rounded-lg shadow-2xl backdrop-blur-sm z-10 min-w-[300px]">
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
              <div className="mt-2 text-xs text-[#858585]">
                Press Enter to search • Esc to close
              </div>
            </div>
          </div>
        )}

        {showHistory && (
          <div className="absolute top-0 right-0 m-4 bg-[#2d2d30] border border-[#3c3c3c] rounded-lg shadow-2xl backdrop-blur-sm z-10 min-w-[350px] max-h-[400px] overflow-hidden">
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
                        // Mock: Copy command to clipboard
                        navigator.clipboard.writeText(cmd);
                        console.log(`Copied command: ${cmd}`);
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

        {showSettings && (
          <div className="absolute top-0 right-0 m-4 bg-[#2d2d30] border border-[#3c3c3c] rounded-lg shadow-2xl backdrop-blur-sm z-10 min-w-[320px]">
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
                {/* Theme Setting */}
                <div>
                  <label className="block text-[#cccccc] text-sm mb-2">Theme</label>
                  <select
                    value={terminalTheme}
                    onChange={(e) => setTerminalTheme(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] text-sm focus:border-[#007acc] focus:outline-none"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="matrix">Matrix</option>
                    <option value="cyberpunk">Cyberpunk</option>
                    <option value="vintage">Vintage</option>
                  </select>
                </div>

                {/* Sound Setting */}
                <div className="flex items-center justify-between">
                  <span className="text-[#cccccc] text-sm">Terminal Sounds</span>
                  <button
                    onClick={handleToggleSound}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      soundEnabled ? 'bg-[#007acc]' : 'bg-[#3c3c3c]'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Font Size */}
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
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Enhanced Terminal Status Bar */}
      <TerminalStatusBar
        osInfo={{
          os: 'linux',
          shell: 'bash', 
          username: 'pajer',
          hostname: 'IdeaPad-Gaming'
        }}
        workingDirectory={projectPath}
        commandCount={sessions.length}
        isConnected={isInitialized}
        className="border-t border-gray-700/30 bg-gray-900/80 backdrop-blur-sm"
      />
    </div>
  );
}; 