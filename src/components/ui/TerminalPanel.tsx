// Syntari AI IDE - Terminal Panel Component
// Professional terminal interface with Tauri backend integration

import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Maximize2, Minimize2, Square, Copy, FolderOpen } from 'lucide-react';
import { terminalService } from '../../services';
import type { TerminalSession, TerminalOutput } from '../../services/types';

interface TerminalPanelProps {
  projectPath: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  height?: number;
  className?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  // projectPath,  // Removed unused parameter
  isVisible,
  onToggleVisibility,
  height = 300,
  className = '',
}) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize first session on mount
  useEffect(() => {
    const initializeTerminal = async () => {
      try {
        const session = await terminalService.createSession();
        setSessions([session]);
        setActiveSessionId(session.id);
        
        // Add welcome message
        const welcomeOutput: TerminalOutput = {
          id: 'welcome',
          type: 'output',
          content: `Syntari AI IDE Terminal - Connected to ${session.workingDirectory}`,
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
  }, [isVisible]);

  // Focus input when terminal becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible, activeSessionId]);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const executeCommand = async (command: string) => {
    if (!activeSession || !command.trim() || isExecuting) return;

    setIsExecuting(true);
    setCurrentInput('');

    try {
      // const output = await terminalService.executeCommand(activeSession.id, command);  // Removed unused variable
      await terminalService.executeCommand(activeSession.id, command);
      
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
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim()) {
      executeCommand(currentInput);
    }
  };

  const createNewSession = async () => {
    try {
      const newSession = await terminalService.createSession(`Terminal ${sessions.length + 1}`);
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
      .map(line => line.content)
      .join('\n');
    
    navigator.clipboard.writeText(output).catch(console.error);
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

  if (!isVisible) return null;

  return (
    <div 
      className={`bg-gray-900 border-t border-gray-700 flex flex-col ${className}`}
      style={{ height: isMaximized ? '80vh' : height }}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {/* Session tabs */}
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`px-3 py-1 text-sm rounded-t cursor-pointer flex items-center space-x-2 ${
                  session.id === activeSessionId
                    ? 'bg-gray-900 text-white border-t border-l border-r border-gray-600'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <span>{session.name}</span>
                {sessions.length > 1 && (
                  <X
                    size={14}
                    className="hover:text-red-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeSession(session.id);
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          
          <button
            onClick={createNewSession}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="New Terminal"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span>{activeSession?.workingDirectory}</span>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={copyOutput}
              className="p-1 hover:text-white transition-colors"
              title="Copy Output"
            >
              <Copy size={16} />
            </button>
            
            <button
              onClick={clearSession}
              className="p-1 hover:text-white transition-colors"
              title="Clear Terminal"
            >
              <Square size={16} />
            </button>
            
            <button
              onClick={toggleMaximize}
              className="p-1 hover:text-white transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            
            <button
              onClick={onToggleVisibility}
              className="p-1 hover:text-white transition-colors"
              title="Close Terminal"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm text-gray-100 bg-gray-900"
        style={{ scrollBehavior: 'smooth' }}
      >
        {activeSession?.history.map((line) => (
          <div key={line.id} className="flex items-start space-x-2 mb-1">
            <span className="text-xs text-gray-500 min-w-[60px]">
              {formatTimestamp(line.timestamp)}
            </span>
            <div className={`flex-1 ${
              line.type === 'command' ? 'text-green-400' :
              line.type === 'error' ? 'text-red-400' :
              'text-gray-100'
            }`}>
              {line.type === 'command' && <span className="text-blue-400">$ </span>}
              <span className="whitespace-pre-wrap">{line.content}</span>
            </div>
          </div>
        ))}
        
        {isExecuting && (
          <div className="flex items-center space-x-2 text-yellow-400">
            <span className="text-xs text-gray-500 min-w-[60px]">
              {formatTimestamp(new Date())}
            </span>
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-3 h-3 border border-yellow-400 border-t-transparent rounded-full"></div>
              <span>Executing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <form onSubmit={handleInputSubmit} className="flex items-center space-x-2">
          <span className="text-blue-400 font-mono">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder="Enter command..."
            disabled={isExecuting}
            className="flex-1 bg-transparent border-none outline-none text-gray-100 font-mono placeholder-gray-500"
          />
          {isExecuting && (
            <div className="animate-spin w-4 h-4 border border-yellow-400 border-t-transparent rounded-full"></div>
          )}
        </form>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>Sessions: {sessions.length}</span>
          <span>Active: {activeSession?.name || 'None'}</span>
          <span>Status: {isExecuting ? 'Executing' : 'Ready'}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <FolderOpen size={12} />
          <span>{activeSession?.workingDirectory}</span>
        </div>
      </div>
    </div>
  );
}; 