// Syntari AI IDE - Terminal Service
// VS Code-style terminal service using real pseudo-terminals (pty)

import { invoke } from '@tauri-apps/api/core';
import type { 
  TerminalSession, 
  TerminalOutput, 
  CommandResult, 
  TerminalInfo,
  SystemInfo,
  ServiceError
} from './types';

export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private activeSessionId: string | null = null;
  private ptySessionIds: Map<string, string> = new Map(); // Map UI session ID to backend pty session ID

  constructor() {
    this.sessions = new Map();
    this.ptySessionIds = new Map();
  }

  /**
   * Initialize terminal service and check backend connectivity
   */
  async initialize(): Promise<void> {
    try {
      // Test backend connection and get terminal info
      const result = await invoke<any>('get_terminal_info');
      
      // Backend returns TerminalInfo directly, not wrapped in TauriResult
      if (result && result.shell) {
        console.log('Terminal service initialized:', result);
      } else {
        console.warn('Terminal info not available');
      }
    } catch (error) {
      console.error('Failed to initialize terminal service:', error);
      throw this.handleError('TERMINAL_INIT_FAILED', 'Failed to initialize terminal service', error);
    }
  }

  /**
   * Create a new terminal session with real pty (like VS Code)
   */
  async createSession(name?: string, workingDirectory?: string): Promise<TerminalSession> {
    try {
      let terminalWorkingDir = workingDirectory || '/';
      
      // Try to get terminal info from backend, but don't fail if it's not available
      try {
        const terminalInfo = await invoke<any>('get_terminal_info');
        if (terminalInfo && terminalInfo.working_directory) {
          terminalWorkingDir = terminalInfo.working_directory;
        }
      } catch (error) {
        console.warn('Could not get terminal info from backend, using default directory');
      }
      
      // Create a real pty session in the backend
      const ptySessionId = await invoke<string>('create_terminal_session', {
        workingDirectory: terminalWorkingDir
      });
      
      const session: TerminalSession = {
        id: this.generateSessionId(),
        name: name || `Terminal ${this.sessions.size + 1}`,
        workingDirectory: terminalWorkingDir,
        history: [],
        isActive: false,
      };

      // Map UI session to backend pty session
      this.ptySessionIds.set(session.id, ptySessionId);
      this.sessions.set(session.id, session);
      
      // If this is the first session, make it active
      if (this.sessions.size === 1) {
        this.setActiveSession(session.id);
      }

      console.log(`Created terminal session ${session.id} with pty ${ptySessionId}`);
      return session;
    } catch (error) {
      console.error('Failed to create terminal session:', error);
      throw this.handleError('CREATE_SESSION_FAILED', 'Failed to create terminal session', error);
    }
  }

  /**
   * Execute a command in the pty terminal (like VS Code)
   */
  async executeCommand(sessionId: string, command: string): Promise<CommandResult> {
    console.log('TerminalService.executeCommand called with:', { sessionId, command });
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error('Session not found:', sessionId, 'Available sessions:', Array.from(this.sessions.keys()));
      throw this.handleError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    const ptySessionId = this.ptySessionIds.get(sessionId);
    if (!ptySessionId) {
      console.error('PTY session not found for UI session:', sessionId);
      throw this.handleError('PTY_SESSION_NOT_FOUND', `PTY session not found for session ${sessionId}`);
    }

    console.log('Found session:', session, 'PTY ID:', ptySessionId);

    try {
      // Add command to history immediately
      const commandOutput: TerminalOutput = {
        id: this.generateOutputId(),
        type: 'command',
        content: command,
        timestamp: new Date(),
      };
      session.history.push(commandOutput);

      // Send command to the pty terminal
      console.log('Sending command to pty:', { ptySessionId, command });
      await invoke('send_terminal_input', {
        sessionId: ptySessionId,
        input: command
      });

      // Give the command a moment to start executing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Read the output from the pty
      console.log('Reading output from pty...');
      const output = await invoke<string>('read_terminal_output', {
        sessionId: ptySessionId,
        timeoutMs: 5000 // 5 second timeout
      });
      
      console.log('PTY output received:', output);

      // Create output entry
      const resultOutput: TerminalOutput = {
          id: this.generateOutputId(),
          type: 'output',
        content: output || '',
          timestamp: new Date(),
        exitCode: 0, // PTY doesn't easily provide exit codes for individual commands
        };
      
      session.history.push(resultOutput);
      this.sessions.set(sessionId, session);
      
      return {
        success: true,
        output: output || '',
        error: '',
        exitCode: 0,
        command: command,
      };
    } catch (error) {
      console.error('Failed to execute command in pty:', error);
      
      const errorOutput: TerminalOutput = {
        id: this.generateOutputId(),
        type: 'error',
        content: `Error executing command: ${error}`,
        timestamp: new Date(),
        exitCode: -1,
      };
      session.history.push(errorOutput);
      this.sessions.set(sessionId, session);
      
      return {
        success: false,
        output: '',
        error: errorOutput.content,
        exitCode: -1,
        command: command,
      };
    }
  }

  /**
   * Send input to terminal (for interactive commands)
   */
  async sendInput(sessionId: string, input: string): Promise<void> {
    const ptySessionId = this.ptySessionIds.get(sessionId);
    if (!ptySessionId) {
      throw this.handleError('PTY_SESSION_NOT_FOUND', `PTY session not found for session ${sessionId}`);
    }

    await invoke('send_terminal_input', {
      sessionId: ptySessionId,
      input: input
    });
  }

  /**
   * Read terminal output
   */
  async readOutput(sessionId: string, timeoutMs: number = 1000): Promise<string> {
    const ptySessionId = this.ptySessionIds.get(sessionId);
    if (!ptySessionId) {
      throw this.handleError('PTY_SESSION_NOT_FOUND', `PTY session not found for session ${sessionId}`);
    }

    return await invoke<string>('read_terminal_output', {
      sessionId: ptySessionId,
      timeoutMs: timeoutMs
    });
  }

  /**
   * Change directory for a session (not needed with pty, but kept for compatibility)
   */
  async changeDirectory(sessionId: string, path: string): Promise<void> {
    // With pty, we just send a cd command
    await this.executeCommand(sessionId, `cd "${path}"`);
  }

  /**
   * List directory contents (not needed with pty, but kept for compatibility)
   */
  async listDirectory(sessionId: string, path?: string): Promise<string[]> {
    const command = path ? `ls "${path}"` : 'ls';
    const result = await this.executeCommand(sessionId, command);
    
    if (result.success) {
      return result.output.split('\n').filter(line => line.trim().length > 0);
    } else {
      throw this.handleError('LIST_DIRECTORY_FAILED', 'Failed to list directory');
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const result = await invoke<any>('get_system_info');
      return result;
    } catch (error) {
      throw this.handleError('SYSTEM_INFO_FAILED', 'Failed to get system information', error);
    }
  }

  /**
   * Get terminal information
   */
  async getTerminalInfo(): Promise<TerminalInfo> {
    try {
      const result = await invoke<any>('get_terminal_info');
      return result;
    } catch (error) {
      throw this.handleError('TERMINAL_INFO_FAILED', 'Failed to get terminal information', error);
    }
  }

  /**
   * Kill a process
   */
  async killProcess(pid: number): Promise<boolean> {
    try {
      await invoke('kill_process', { pid });
      return true;
    } catch (error) {
      console.error('Failed to kill process:', error);
      return false;
    }
  }

  /**
   * Clear session history
   */
  clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.history = [];
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Remove session and close pty
   */
  removeSession(sessionId: string): void {
    const ptySessionId = this.ptySessionIds.get(sessionId);
    if (ptySessionId) {
      // Close the pty session
      invoke('close_terminal_session', { sessionId: ptySessionId }).catch(console.error);
      this.ptySessionIds.delete(sessionId);
    }
    
    this.sessions.delete(sessionId);
    
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
  }

  /**
   * Set active session
   */
  setActiveSession(sessionId: string): void {
    // Mark all sessions as inactive
    for (const session of this.sessions.values()) {
      session.isActive = false;
      }

    // Mark the specified session as active
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isActive = true;
      this.activeSessionId = sessionId;
        this.sessions.set(sessionId, session);
    }
  }

  /**
   * Get all sessions
   */
  getSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get active session
   */
  getActiveSession(): TerminalSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TerminalSession | null {
    return this.sessions.get(sessionId) || null;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOutputId(): string {
    return `output_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleError(code: string, message: string, originalError?: any): ServiceError {
    console.error(`[${code}] ${message}`, originalError);
    return {
      code,
      message,
      originalError,
      timestamp: new Date(),
    };
  }
}

// Export singleton instance
export const terminalService = new TerminalService(); 