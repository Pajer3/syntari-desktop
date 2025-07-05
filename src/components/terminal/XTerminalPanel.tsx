import { invoke } from '@tauri-apps/api/core';
import '@xterm/xterm/css/xterm.css';
import {
  Plus,
  Terminal, X
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TerminalStatusBar } from './TerminalStatusBar';

// Enterprise error handling for terminal operations
interface TerminalError {
  code: string;
  message: string;
  context?: any;
  recovery?: 'retry' | 'fallback' | 'restart';
}

class TerminalErrorHandler {
  static handleError(error: any, context: string): TerminalError {
    console.error(`Terminal error in ${context}:`, error);

    // Classify error type for appropriate response
    if (error?.message?.includes('Session not found')) {
      return {
        code: 'SESSION_NOT_FOUND',
        message: 'Terminal session was disconnected. Creating new session...',
        recovery: 'restart'
      };
    } else if (error?.message?.includes('Permission denied')) {
      return {
        code: 'PERMISSION_DENIED',
        message: 'Insufficient permissions. Please check file access.',
        recovery: 'fallback'
      };
    } else if (error?.message?.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: 'Operation timed out. Retrying with alternative approach...',
        recovery: 'retry'
      };
    } else {
      return {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Attempting recovery...',
        recovery: 'retry'
      };
    }
  }
}

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
  id: string;              // This will be the PTY ID directly
  name: string;
  workingDirectory: string;
}

// Terminal instance info to track XTerm instances per session
interface TerminalInstance {
  container: HTMLDivElement;
  terminal: any; // XTerm instance
  fitAddon: any; // FitAddon instance
}

export const XTerminalPanel: React.FC<XTerminalPanelProps> = React.memo(({
  projectPath,
  isVisible,
  onToggleVisibility,
  height = 300,
  className = '',
  onAIRequest: _onAIRequest,
  showHeader = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalInstancesRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const outputPollingRef = useRef<boolean>(false);
  const initializingRef = useRef<boolean>(false);
  const resizeTimeoutRef = useRef<any>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Map to store terminal instances for each session
  const terminalsRef = useRef<Map<string, TerminalInstance>>(new Map());

  // Memoized terminal options for better performance - moved to top
  const terminalOptions = useMemo(() => {
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
      scrollback: 8000, // Reduced scrollback for better performance
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
      // Performance optimizations
      rendererType: 'canvas' as const, // Use canvas renderer for better performance
      smoothScrollDuration: 0, // Disable smooth scrolling for faster response
    };

    // Use generous defaults that work well - avoid runtime calculations
    return {
      ...baseOptions,
      cols: 100, // Good default that works across screen sizes
      rows: 30,  // Reasonable height
    };
  }, []); // Empty dependency array - options are static

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

      // Reset ready state when not visible
      if (!isVisible) {
        setIsTerminalReady(false);
      }

      if (isInitialized) {
        sessions.forEach(session => {
          if (session.id) {
            invoke('close_terminal_session', { sessionId: session.id }).catch(console.error);
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
      console.log('🚀 Initializing terminal...');

      // Create initial session
      // Calculate initial terminal dimensions
      let initialCols = 100; // Default
      let initialRows = 30;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const charWidth = 7.2;
          const charHeight = 18.2;
          initialCols = Math.max(80, Math.floor((rect.width - 8) / charWidth));
          initialRows = Math.max(24, Math.floor((rect.height - 8) / charHeight));
        }
      }

      // Only log in development to reduce production overhead
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Creating PTY with initial dimensions:', `${initialCols}x${initialRows}`);
      }

      // Create PTY session in backend with proper initial dimensions
      const ptyId = await invoke<string>('create_terminal_session', {
        workingDirectory: projectPath,
        cols: initialCols,
        rows: initialRows
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ PTY session created:', ptyId);
      }

      const newSession: TerminalSession = {
        id: ptyId,
        name: 'Main',
        workingDirectory: projectPath,
      };

      setSessions([newSession]);
      setActiveSessionId(ptyId);
      setIsInitialized(true);
      initializingRef.current = false;

      // Wait for DOM to be ready before creating terminal instance
      setTimeout(async () => {
        // Mark as creating to prevent premature fits
        setIsCreating(true);

        // Create terminal instance for the initial session
        const terminalInstance = await createTerminalInstance(ptyId);

        // Only proceed if instance was created successfully
        if (terminalInstance) {
          console.log(`🔍 INIT-SUCCESS: Terminal instance ready, proceeding with setup`);

          // Show the terminal
          terminalInstance.container.style.display = 'block';

                    // Mark as ready AFTER instance is fully created
          setIsTerminalReady(true);
          setIsCreating(false); // Clear creating state

          // Fit the terminal after showing - with proper validation
          setTimeout(() => {
            // Double-check that terminal is still in map before fitting
            const verifyTerminal = terminalsRef.current.get(ptyId);
            if (verifyTerminal && verifyTerminal.fitAddon) {
              console.log(`🔍 INIT-FIT: Performing initial fit for ready terminal`);
              verifyTerminal.fitAddon.fit();
            }
          }, 50);
        } else {
          console.error(`🔍 INIT-FAIL: Terminal instance creation failed for ${ptyId}`);
          setIsCreating(false); // Clear creating state on failure too
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Terminal session initialized');
        }

        // Wait a bit before starting polling to let shell settle
        setTimeout(() => {
          startOutputPolling(ptyId);
        }, 200);
      }, 100);

    } catch (error) {
            const terminalError = TerminalErrorHandler.handleError(error, 'terminal initialization');

      // Show user-friendly error message
      setErrorMessage(terminalError.message);

      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Failed to initialize terminal:', terminalError);
      }

      // Implement recovery based on error type
      if (terminalError.recovery === 'retry') {
        setTimeout(() => {
          initializingRef.current = false;
          setErrorMessage(null); // Clear error on retry
          initializeTerminal();
        }, 2000);
      } else {
        initializingRef.current = false;
      }
    }
  };

  // Optimized output polling for low-end hardware
  const startOutputPolling = (ptyId: string) => {
    // Stop any existing polling first
    outputPollingRef.current = false;

    // DIAGNOSTIC: Track polling instances
    const pollId = Math.random().toString(36).substr(2, 9);
    console.log(`🔍 POLL-START: Starting polling ${pollId} for PTY ${ptyId}`);

    // Wait a moment to ensure previous polling stops
    setTimeout(() => {
      outputPollingRef.current = true;
      console.log(`🔍 POLL-ACTIVE: Polling ${pollId} now active`);

      let pollActive = false;
      let emptyReadCount = 0;
      let lastOutputTime = Date.now();

              const poll = async () => {
          // DIAGNOSTIC: Track poll attempts
          if (Math.random() < 0.05) { // Log 5% of poll attempts
            console.log(`🔍 POLL-ATTEMPT: ${pollId} attempting poll for ${ptyId}`);
          }

          // Prevent overlapping polls and check if this is still the active session
        if (!outputPollingRef.current || pollActive || ptyId !== activeSessionId) {
          return;
        }

        pollActive = true;

        try {
          const output = await invoke<string>('read_terminal_output', {
            sessionId: ptyId,
            timeoutMs: 150 // Reduced from 200ms for faster response
          });

          if (output && output.length > 0) {
            // Get the terminal instance for this session
            const terminalInstance = terminalsRef.current.get(ptyId);
            if (terminalInstance?.terminal && ptyId === activeSessionId) {
              terminalInstance.terminal.write(output);
            }

            emptyReadCount = 0;
            lastOutputTime = Date.now();

            // Faster polling after output for interactive feel
            setTimeout(poll, 100); // Reduced from 200ms

          } else {
            emptyReadCount++;

            // More aggressive adaptive delays for better performance
            const timeSinceLastOutput = Date.now() - lastOutputTime;
            let delay;

            if (timeSinceLastOutput < 500) {
              // Very recent activity - keep responsive
              delay = emptyReadCount < 2 ? 150 : 250;
            } else if (timeSinceLastOutput < 2000) {
              // Recent activity - moderate polling
              delay = 400;
            } else if (timeSinceLastOutput < 10000) {
              // Moderate idle - slow down
              delay = 800;
            } else {
              // Long idle - very slow polling
              delay = 2000;
            }

            setTimeout(poll, delay);
          }

        } catch (error) {
          // On error, wait longer before retrying
          emptyReadCount++;
          setTimeout(poll, 600);
        } finally {
          pollActive = false;
        }
      };

      // Start first poll quicker
      setTimeout(poll, 200);
    }, 100);
  };

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
    if (isVisible && isInitialized && isTerminalReady) {
      console.log(`🔍 AUTO-FIT: Triggered by state change, ready=${isTerminalReady}`);
      // Small delay to ensure container is fully rendered
      setTimeout(() => {
        fitTerminal();
      }, 100);
    }
  }, [isVisible, isInitialized, isTerminalReady]);

  // Create new session
  const createNewSession = async () => {
    try {
      // Calculate terminal dimensions for new session
      let cols = 100; // Default
      let rows = 30;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const charWidth = 7.2;
          const charHeight = 18.2;
          cols = Math.max(80, Math.floor((rect.width - 8) / charWidth));
          rows = Math.max(24, Math.floor((rect.height - 8) / charHeight));
        }
      }

      console.log('🎯 Creating new session with dimensions:', `${cols}x${rows}`);

      const ptyId = await invoke<string>('create_terminal_session', {
        workingDirectory: projectPath,
        cols: cols,
        rows: rows
      });

      const newSession: TerminalSession = {
        id: ptyId,
        name: `Tab ${sessions.length + 1}`,
        workingDirectory: projectPath,
      };

      setSessions(prev => [...prev, newSession]);

      // Create terminal instance for the new session
      await createTerminalInstance(ptyId);

      // Switch to the new session
      switchSession(ptyId);

    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  // Close session
  const closeSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session?.id) {
      try {
        await invoke('close_terminal_session', {
          sessionId: session.id
        });
      } catch (error) {
        console.error('Error closing session:', error);
      }
    }

    // Clean up terminal instance
    const terminalInstance = terminalsRef.current.get(sessionId);
    if (terminalInstance) {
      console.log(`🔍 INSTANCE-CLEANUP: Cleaning up terminal for session ${sessionId}, map-size-before=${terminalsRef.current.size}`);

      // Dispose terminal
      if (terminalInstance.terminal?.dispose) {
        terminalInstance.terminal.dispose();
      }
      // Remove container
      if (terminalInstance.container.parentNode) {
        terminalInstance.container.parentNode.removeChild(terminalInstance.container);
      }
      // Remove from map
      terminalsRef.current.delete(sessionId);

      console.log(`🔍 INSTANCE-CLEANUP: Terminal cleaned up, map-size-after=${terminalsRef.current.size}`);
    }

    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);

    if (activeSessionId === sessionId) {
      if (newSessions.length > 0) {
        switchSession(newSessions[0].id);
      } else {
        outputPollingRef.current = false; // Stop polling
        onToggleVisibility();
      }
    }
  };

  // Rename session
  const renameSession = (sessionId: string, newName: string) => {
    setSessions(prev => prev.map(session =>
      session.id === sessionId ? { ...session, name: newName } : session
    ));
  };

  // Enhanced fit function following VS Code's approach
  const fitTerminal = useCallback(() => {
    // DIAGNOSTIC: Track fit attempts
    const fitId = Math.random().toString(36).substr(2, 6);
    console.log(`🔍 FIT-START: Attempt ${fitId}, session=${activeSessionId}, ready=${isTerminalReady}, visible=${isVisible}`);

    const activeTerminal = getActiveTerminal();
        if (!activeTerminal || !containerRef.current) {
      console.log(`🔍 FIT-FAIL: ${fitId} - activeTerminal=${!!activeTerminal}, container=${!!containerRef.current}, creating=${isCreating}`);

      // Only log warning if we expect to have a terminal (when fully ready and not creating)
      // Reduce console noise by checking more conditions
      if (isTerminalReady && isVisible && activeSessionId && !isCreating && containerRef.current && containerRef.current.offsetWidth > 0) {
        console.warn('Active terminal or container not available for fitting');
      }
      return;
    }

    if (!activeTerminal.fitAddon) {
      console.warn('FitAddon not available for active terminal');
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

      // Only log in development to reduce overhead - throttle logging
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🎯 Terminal fit:', `${availableWidth}x${availableHeight}`);
      }

      // Ensure container has proper dimensions
      if (availableWidth <= 50 || availableHeight <= 20) {
        setTimeout(() => fitTerminal(), 100);
        return;
      }

      // Force the terminal container to use full available space
      const terminalContainer = activeTerminal.container;
      if (terminalContainer) {
        // Set explicit dimensions
        terminalContainer.style.width = `${availableWidth}px`;
        terminalContainer.style.height = `${availableHeight}px`;
      }

      // Perform the fit operation
      activeTerminal.fitAddon.fit();

      // Get dimensions after fit and validate
      const terminal = activeTerminal.terminal;
      const newCols = terminal?.cols || 80;
      const newRows = terminal?.rows || 24;

      // Only log detailed info in development - throttle logging
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🚀 Terminal fit result:', `${newCols}x${newRows}`);
      }

      // Ensure minimum usable width - force at least 80 columns for reasonable use
      if (newCols < 60) {
        // Force a reasonable column count
        const minCols = Math.max(80, Math.floor(availableWidth / 8)); // At least 80 cols or calculated
        const minRows = Math.max(24, Math.floor(availableHeight / 17)); // At least 24 rows or calculated

        try {
          terminal?.resize(minCols, minRows);
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.2) {
            console.log(`✅ Forced terminal resize to ${minCols}x${minRows}`);
          }
                  } catch (error) {
            // Always log errors, but only occasionally in development
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.3) {
              console.error('Failed to force terminal resize:', error);
            }
          }
      }

      // Get final dimensions
      const finalCols = terminal?.cols || newCols;
      const finalRows = terminal?.rows || newRows;

      // VS Code-style validation: ensure dimensions are reasonable
      if (finalCols < 10 || finalRows < 1 || finalCols > 500 || finalRows > 200) {
        console.warn('Terminal dimensions out of range, skipping backend sync');
        return;
      }

      // Update the backend PTY to match the frontend terminal dimensions
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession?.id) {
        // Debounced backend resize (VS Code approach)
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }

        resizeTimeoutRef.current = setTimeout(() => {
          console.log(`🔄 Syncing backend PTY to ${finalCols}x${finalRows}`);
          invoke('resize_terminal_session', {
            sessionId: activeSession.id,
            cols: finalCols,
            rows: finalRows
          }).then(() => {
            console.log('✅ Backend PTY resized successfully');
          }).catch((error) => {
            console.warn('Failed to resize backend PTY:', error);
          });
        }, 100); // 100ms debounce like VS Code
      }

    } catch (error) {
      console.warn('Terminal fit failed:', error);
    }
  }, [activeSessionId, sessions, isInitialized, isVisible]);

  // Handle session switching
  const switchSession = useCallback((sessionId: string) => {
    if (sessionId === activeSessionId) return;

    console.log('Switching to session:', sessionId);

    // Stop current polling
    outputPollingRef.current = false;

    // Hide all terminals
    terminalsRef.current.forEach((instance) => {
      instance.container.style.display = 'none';
    });

    // Show the selected terminal
    const selectedTerminal = terminalsRef.current.get(sessionId);
    if (selectedTerminal) {
      selectedTerminal.container.style.display = 'block';
      // Focus the terminal for input
      selectedTerminal.terminal.focus();

      // Fit the terminal after showing
      setTimeout(() => {
        if (selectedTerminal.fitAddon) {
          selectedTerminal.fitAddon.fit();
        }
      }, 50);
    }

    setActiveSessionId(sessionId);

    // Start polling for the new session
    setTimeout(() => {
      startOutputPolling(sessionId);
    }, 150);
  }, [activeSessionId]);

  // Create a new terminal instance for a session
  const createTerminalInstance = async (sessionId: string): Promise<TerminalInstance | null> => {
    if (!terminalInstancesRef.current) {
      console.error('Terminal instances container not ready');
      return null;
    }

    console.log('Creating terminal instance for session:', sessionId);

    try {
      // Create container div for this terminal
      const terminalContainer = document.createElement('div');
      terminalContainer.style.width = '100%';
      terminalContainer.style.height = '100%';
      terminalContainer.style.display = 'none'; // Hidden by default
      terminalContainer.className = 'terminal-instance';
      terminalInstancesRef.current.appendChild(terminalContainer);

      console.log('Terminal container created');

      // Dynamically import terminal modules
      const { Terminal } = await import('@xterm/xterm');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');
      const { FitAddon } = await import('@xterm/addon-fit');

      console.log('Terminal modules imported');

      // Create terminal with options
      const terminal = new Terminal(terminalOptions);

      // Create and load addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      // Open terminal in the container
      terminal.open(terminalContainer);

      console.log('Terminal opened in container');

      // Set up data handler for this terminal with proper session binding
      terminal.onData((data: string) => {
        // Directly use the sessionId from closure - much more reliable
        invoke('send_terminal_input', {
          sessionId: sessionId,
          input: data
        }).catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Input send failed for session:', sessionId, error);
          }
        });
      });

      const instance: TerminalInstance = {
        container: terminalContainer,
        terminal,
        fitAddon
      };

      terminalsRef.current.set(sessionId, instance);
      console.log(`🔍 INSTANCE-CREATE: Terminal instance created for session ${sessionId}, map-size=${terminalsRef.current.size}`);
      return instance;
    } catch (error) {
      console.error('Failed to create terminal instance:', error);
      return null;
    }
  };

  // Get the active terminal instance
  const getActiveTerminal = () => {
    if (!activeSessionId) {
      console.log(`🔍 GET-TERMINAL: No active session ID`);
      return null;
    }

    const terminal = terminalsRef.current.get(activeSessionId);
    if (Math.random() < 0.1) { // Log 10% of calls
      console.log(`🔍 GET-TERMINAL: Session ${activeSessionId}, found=${!!terminal}, map-size=${terminalsRef.current.size}`);
    }

    return terminal;
  };

  if (!isVisible) return null;

  return (
        <div
      className={`bg-[#1e1e1e] ${showHeader ? 'border border-[#3c3c3c] rounded-lg shadow-2xl' : ''} overflow-hidden ${className}`}
      style={{
        height: height,
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
                    if (editingSessionId !== session.id) {
                      switchSession(session.id);
                    }
                  }}
                  onDoubleClick={() => setEditingSessionId(session.id)}
                  className={`group flex items-center px-3 py-1.5 text-xs font-medium transition-all duration-200 relative ${
                    activeSessionId === session.id
                      ? 'bg-[#1e1e1e] text-[#ffffff] shadow-lg'
                      : 'bg-transparent text-[#cccccc] hover:bg-[#37373d] hover:text-[#ffffff]'
                  }`}
                  style={{
                    borderTopLeftRadius: index === 0 ? '4px' : '0',
                    borderTopRightRadius: index === sessions.length - 1 ? '4px' : '0',
                    border: activeSessionId === session.id ? '1px solid #007acc' : '1px solid transparent',
                    borderBottom: activeSessionId === session.id ? '1px solid #1e1e1e' : '1px solid #3c3c3c',
                  }}
                >
                  {/* Active tab indicator */}
                  {activeSessionId === session.id && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#007acc]" />
                  )}

                  {editingSessionId === session.id ? (
                    <input
                      type="text"
                      defaultValue={session.name}
                      autoFocus
                      className="bg-transparent outline-none border-b border-[#007acc] text-xs w-24"
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        renameSession(session.id, e.target.value || session.name);
                        setEditingSessionId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameSession(session.id, e.currentTarget.value || session.name);
                          setEditingSessionId(null);
                        } else if (e.key === 'Escape') {
                          setEditingSessionId(null);
                        }
                      }}
                    />
                  ) : (
                    <span className={activeSessionId === session.id ? 'font-semibold' : ''}>{session.name}</span>
                  )}
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

          {/* Simplified Toolbar - Only Plus Button */}
          <div className="flex items-center space-x-1">
            <button
              onClick={createNewSession}
              className="p-1.5 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#37373d] rounded transition-all duration-200"
              title="New Terminal (Ctrl+Shift+`)"
            >
              <Plus className="w-4 h-4" />
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
            ref={terminalInstancesRef}
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

            {/* Terminal containers will be appended here dynamically */}

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
});
