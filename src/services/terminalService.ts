// Syntari AI IDE - Terminal Service
// Bridges TerminalPanel UI with Tauri backend terminal commands

import { invoke } from '@tauri-apps/api/core';
import type { 
  TerminalSession, 
  TerminalOutput, 
  CommandResult, 
  TerminalInfo,
  SystemInfo,
  ServiceError 
} from './types';

class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private activeSessionId: string | null = null;

  /**
   * Initialize terminal service and check backend connectivity
   */
  async initialize(): Promise<void> {
    try {
      // Test backend connection and get terminal info
      const result = await invoke<any>('get_terminal_info');
      
      // Handle TauriResult pattern from backend
      if (result.success && result.data) {
        console.log('Terminal service initialized:', result.data);
      } else {
        console.warn('Terminal info not available:', result.error);
      }
    } catch (error) {
      console.error('Failed to initialize terminal service:', error);
      throw this.handleError('TERMINAL_INIT_FAILED', 'Failed to initialize terminal service', error);
    }
  }

  /**
   * Create a new terminal session
   */
  async createSession(name?: string): Promise<TerminalSession> {
    try {
      const terminalInfo = await invoke<TerminalInfo>('get_terminal_info');
      
      const session: TerminalSession = {
        id: this.generateSessionId(),
        name: name || `Terminal ${this.sessions.size + 1}`,
        workingDirectory: terminalInfo.working_directory,
        history: [],
        isActive: false,
      };

      this.sessions.set(session.id, session);
      
      // If this is the first session, make it active
      if (this.sessions.size === 1) {
        this.setActiveSession(session.id);
      }

      return session;
    } catch (error) {
      throw this.handleError('CREATE_SESSION_FAILED', 'Failed to create terminal session', error);
    }
  }

  /**
   * Execute a command with improved error handling
   */
  async executeCommand(command: string, args: string[] = [], options: ExecuteOptions = {}): Promise<CommandResult> {
    try {
      const result = await invoke<any>('execute_shell_command', {
        command,
        args,
        workingDirectory: options.workingDirectory || this.currentDirectory,
        timeout: options.timeout || 30000,
      });
      
      // Handle TauriResult pattern
      if (result.success && result.data) {
        return {
          success: true,
          output: result.data.output || '',
          error: result.data.error || '',
          exitCode: result.data.exit_code || 0,
          command: `${command} ${args.join(' ')}`.trim(),
        };
      } else {
        return {
          success: false,
          output: '',
          error: result.error || 'Command failed',
          exitCode: 1,
          command: `${command} ${args.join(' ')}`.trim(),
        };
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
        command: `${command} ${args.join(' ')}`.trim(),
      };
    }
  }

  /**
   * Change directory for a session
   */
  async changeDirectory(sessionId: string, path: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw this.handleError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    try {
      const newDir = await invoke<string>('change_directory', { path });
      session.workingDirectory = newDir;
      this.sessions.set(sessionId, session);
    } catch (error) {
      throw this.handleError('CHANGE_DIRECTORY_FAILED', 'Failed to change directory', error);
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(sessionId: string, path?: string): Promise<string[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw this.handleError('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
    }

    try {
      const targetPath = path || session.workingDirectory;
      return await invoke<string[]>('list_directory', { path: targetPath });
    } catch (error) {
      throw this.handleError('LIST_DIRECTORY_FAILED', 'Failed to list directory', error);
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      return await invoke<SystemInfo>('get_system_info');
    } catch (error) {
      throw this.handleError('GET_SYSTEM_INFO_FAILED', 'Failed to get system info', error);
    }
  }

  /**
   * Get terminal information
   */
  async getTerminalInfo(): Promise<TerminalInfo> {
    try {
      return await invoke<TerminalInfo>('get_terminal_info');
    } catch (error) {
      throw this.handleError('GET_TERMINAL_INFO_FAILED', 'Failed to get terminal info', error);
    }
  }

  /**
   * Kill a process with proper error handling
   */
  async killProcess(pid: number): Promise<boolean> {
    try {
      const result = await invoke<any>('kill_process', { pid });
      
      // Handle TauriResult pattern
      if (result.success) {
        console.log(`Process ${pid} terminated successfully`);
        return true;
      } else {
        console.error(`Failed to kill process ${pid}:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`Error killing process ${pid}:`, error);
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
   * Remove a session
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    if (this.activeSessionId === sessionId) {
      // Set new active session if available
      const remaining = Array.from(this.sessions.keys());
      this.activeSessionId = remaining.length > 0 ? remaining[0] : null;
    }
  }

  /**
   * Set active session
   */
  setActiveSession(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      // Deactivate previous session
      if (this.activeSessionId) {
        const prevSession = this.sessions.get(this.activeSessionId);
        if (prevSession) {
          prevSession.isActive = false;
          this.sessions.set(this.activeSessionId, prevSession);
        }
      }

      // Activate new session
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isActive = true;
        this.sessions.set(sessionId, session);
        this.activeSessionId = sessionId;
      }
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
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) || null : null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): TerminalSession | null {
    return this.sessions.get(sessionId) || null;
  }

  // Private helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOutputId(): string {
    return `output_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleError(code: string, message: string, originalError?: any): ServiceError {
    console.error(`[TerminalService] ${code}: ${message}`, originalError);
    return {
      code,
      message,
      details: originalError,
    };
  }
}

// Export singleton instance
export const terminalService = new TerminalService(); 