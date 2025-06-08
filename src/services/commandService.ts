// Syntari AI IDE - Command Service
// Bridges CommandPalette UI with application commands and operations

import { invoke } from '@tauri-apps/api/core';
import type { 
  Command, 
  CommandCategory, 
  ServiceError 
} from './types';

class CommandService {
  private commands: Map<string, Command> = new Map();
  private recentCommands: string[] = [];
  private readonly maxRecentCommands = 20;

  constructor() {
    this.initializeDefaultCommands();
  }

  /**
   * Initialize the command service
   */
  async initialize(): Promise<void> {
    // Command service doesn't need async initialization
    // All commands are registered synchronously
  }

  /**
   * Initialize default IDE commands
   */
  private initializeDefaultCommands(): void {
    // File commands
    this.registerCommand({
      id: 'file.new',
      name: 'New File',
      description: 'Create a new file',
      category: 'File',
      keybinding: 'Ctrl+N',
      icon: '📄',
      action: async () => {
        // Trigger new file dialog
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'new-file' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'file.open',
      name: 'Open File',
      description: 'Open an existing file',
      category: 'File',
      keybinding: 'Ctrl+O',
      icon: '📂',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'open-file' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'file.save',
      name: 'Save File',
      description: 'Save the current file',
      category: 'File',
      keybinding: 'Ctrl+S',
      icon: '💾',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'save-file' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'file.saveAs',
      name: 'Save As...',
      description: 'Save the current file with a new name',
      category: 'File',
      keybinding: 'Ctrl+Shift+S',
      icon: '💾',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'save-as' } 
        });
        window.dispatchEvent(event);
      }
    });

    // Edit commands
    this.registerCommand({
      id: 'edit.undo',
      name: 'Undo',
      description: 'Undo the last action',
      category: 'Edit',
      keybinding: 'Ctrl+Z',
      icon: '↶',
      action: async () => {
        document.execCommand('undo');
      }
    });

    this.registerCommand({
      id: 'edit.redo',
      name: 'Redo',
      description: 'Redo the last undone action',
      category: 'Edit',
      keybinding: 'Ctrl+Y',
      icon: '↷',
      action: async () => {
        document.execCommand('redo');
      }
    });

    this.registerCommand({
      id: 'edit.find',
      name: 'Find',
      description: 'Search in the current file',
      category: 'Edit',
      keybinding: 'Ctrl+F',
      icon: '🔍',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'find' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'edit.findReplace',
      name: 'Find and Replace',
      description: 'Find and replace text in the project',
      category: 'Edit',
      keybinding: 'Ctrl+H',
      icon: '🔄',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'find-replace' } 
        });
        window.dispatchEvent(event);
      }
    });

    // View commands
    this.registerCommand({
      id: 'view.toggleSidebar',
      name: 'Toggle Sidebar',
      description: 'Show or hide the sidebar',
      category: 'View',
      keybinding: 'Ctrl+B',
      icon: '📋',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'toggle-sidebar' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'view.toggleTerminal',
      name: 'Toggle Terminal',
      description: 'Show or hide the terminal panel',
      category: 'View',
      keybinding: 'Ctrl+`',
      icon: '💻',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'toggle-terminal' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'view.zoomIn',
      name: 'Zoom In',
      description: 'Increase the editor font size',
      category: 'View',
      keybinding: 'Ctrl+=',
      icon: '🔍+',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'zoom-in' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'view.zoomOut',
      name: 'Zoom Out',
      description: 'Decrease the editor font size',
      category: 'View',
      keybinding: 'Ctrl+-',
      icon: '🔍-',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'zoom-out' } 
        });
        window.dispatchEvent(event);
      }
    });

    // Terminal commands
    this.registerCommand({
      id: 'terminal.new',
      name: 'New Terminal',
      description: 'Open a new terminal session',
      category: 'Terminal',
      keybinding: 'Ctrl+Shift+`',
      icon: '➕💻',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'new-terminal' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'terminal.kill',
      name: 'Kill Terminal',
      description: 'Close the active terminal session',
      category: 'Terminal',
      icon: '❌💻',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'kill-terminal' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'terminal.clear',
      name: 'Clear Terminal',
      description: 'Clear the terminal output',
      category: 'Terminal',
      icon: '🧹',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'clear-terminal' } 
        });
        window.dispatchEvent(event);
      }
    });

    // Git commands
    this.registerCommand({
      id: 'git.status',
      name: 'Git Status',
      description: 'Show git repository status',
      category: 'Git',
      icon: 'ℹ️',
      action: async () => {
        try {
          await invoke('git_get_status');
          const event = new CustomEvent('syntari:command', { 
            detail: { type: 'git-status' } 
          });
          window.dispatchEvent(event);
        } catch (error) {
          console.error('Git status failed:', error);
        }
      }
    });

    this.registerCommand({
      id: 'git.commit',
      name: 'Git Commit',
      description: 'Commit staged changes',
      category: 'Git',
      icon: '📝',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'git-commit' } 
        });
        window.dispatchEvent(event);
      }
    });

    // AI commands
    this.registerCommand({
      id: 'ai.chat',
      name: 'Open AI Chat',
      description: 'Start a conversation with AI assistant',
      category: 'AI',
      keybinding: 'Ctrl+Shift+A',
      icon: '🤖',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'ai-chat' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'ai.generateCode',
      name: 'Generate Code',
      description: 'Generate code with AI assistance',
      category: 'AI',
      icon: '✨',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'ai-generate' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'ai.explainCode',
      name: 'Explain Code',
      description: 'Get AI explanation of selected code',
      category: 'AI',
      icon: '💡',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'ai-explain' } 
        });
        window.dispatchEvent(event);
      }
    });

    // Debug commands
    this.registerCommand({
      id: 'debug.start',
      name: 'Start Debugging',
      description: 'Start the debugger',
      category: 'Debug',
      keybinding: 'F5',
      icon: '🐛',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'debug-start' } 
        });
        window.dispatchEvent(event);
      }
    });

    this.registerCommand({
      id: 'debug.stop',
      name: 'Stop Debugging',
      description: 'Stop the debugger',
      category: 'Debug',
      keybinding: 'Shift+F5',
      icon: '⏹️',
      action: async () => {
        const event = new CustomEvent('syntari:command', { 
          detail: { type: 'debug-stop' } 
        });
        window.dispatchEvent(event);
      }
    });
  }

  /**
   * Register a new command
   */
  registerCommand(command: Command): void {
    this.commands.set(command.id, command);
  }

  /**
   * Unregister a command
   */
  unregisterCommand(commandId: string): void {
    this.commands.delete(commandId);
  }

  /**
   * Execute a command by ID
   */
  async executeCommand(commandId: string): Promise<void> {
    const command = this.commands.get(commandId);
    if (!command) {
      throw this.handleError('COMMAND_NOT_FOUND', `Command ${commandId} not found`);
    }

    try {
      await command.action();
      this.addToRecentCommands(commandId);
    } catch (error) {
      throw this.handleError('COMMAND_EXECUTION_FAILED', `Failed to execute command ${commandId}`, error);
    }
  }

  /**
   * Search commands with fuzzy matching
   */
  searchCommands(query: string): Command[] {
    if (!query.trim()) {
      return this.getAllCommands();
    }

    const queryLower = query.toLowerCase();
    const results = Array.from(this.commands.values())
      .map(command => ({
        command,
        score: this.calculateFuzzyScore(command, queryLower)
      }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.command);

    // Prioritize recent commands
    const recent = this.getRecentCommands();
    const recentResults = results.filter(cmd => recent.includes(cmd.id));
    const otherResults = results.filter(cmd => !recent.includes(cmd.id));

    return [...recentResults, ...otherResults];
  }

  /**
   * Get all commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: CommandCategory): Command[] {
    return Array.from(this.commands.values())
      .filter(command => command.category === category);
  }

  /**
   * Get recent commands
   */
  getRecentCommands(): string[] {
    return [...this.recentCommands];
  }

  /**
   * Get command by ID
   */
  getCommand(commandId: string): Command | null {
    return this.commands.get(commandId) || null;
  }

  /**
   * Add command to recent commands
   */
  private addToRecentCommands(commandId: string): void {
    // Remove if already exists
    this.recentCommands = this.recentCommands.filter(id => id !== commandId);
    
    // Add to front
    this.recentCommands.unshift(commandId);
    
    // Keep only max recent commands
    if (this.recentCommands.length > this.maxRecentCommands) {
      this.recentCommands = this.recentCommands.slice(0, this.maxRecentCommands);
    }
  }

  /**
   * Calculate fuzzy matching score
   */
  private calculateFuzzyScore(command: Command, query: string): number {
    const name = command.name.toLowerCase();
    const description = command.description.toLowerCase();
    
    let score = 0;

    // Exact name match
    if (name === query) {
      score += 1000;
    }
    // Name starts with query
    else if (name.startsWith(query)) {
      score += 800;
    }
    // Name contains query
    else if (name.includes(query)) {
      score += 600;
    }
    // Description contains query
    else if (description.includes(query)) {
      score += 400;
    }

    // Character-by-character fuzzy matching
    let queryIndex = 0;
    let nameIndex = 0;
    let consecutiveMatches = 0;
    
    while (queryIndex < query.length && nameIndex < name.length) {
      if (query[queryIndex] === name[nameIndex]) {
        queryIndex++;
        consecutiveMatches++;
        score += consecutiveMatches * 10; // Bonus for consecutive matches
      } else {
        consecutiveMatches = 0;
      }
      nameIndex++;
    }

    // Bonus if all query characters were matched
    if (queryIndex === query.length) {
      score += 200;
    }

    // Recent command bonus
    if (this.recentCommands.includes(command.id)) {
      score += 300;
    }

    // Category bonus (if query matches category)
    if (command.category.toLowerCase().includes(query)) {
      score += 100;
    }

    return score;
  }

  /**
   * Get command suggestions based on context
   */
  getCommandSuggestions(context?: string): Command[] {
    // This could be enhanced with AI-powered suggestions
    const suggestions: Command[] = [];
    
    // Add most used commands
    const recent = this.getRecentCommands().slice(0, 5);
    for (const commandId of recent) {
      const command = this.commands.get(commandId);
      if (command) {
        suggestions.push(command);
      }
    }

    // Add context-specific suggestions
    if (context) {
      if (context.includes('file')) {
        suggestions.push(...this.getCommandsByCategory('File').slice(0, 3));
      }
      if (context.includes('terminal')) {
        suggestions.push(...this.getCommandsByCategory('Terminal').slice(0, 3));
      }
      if (context.includes('git')) {
        suggestions.push(...this.getCommandsByCategory('Git').slice(0, 3));
      }
    }

    // Remove duplicates
    const uniqueSuggestions = suggestions.filter((cmd, index, arr) => 
      arr.findIndex(c => c.id === cmd.id) === index
    );

    return uniqueSuggestions.slice(0, 10);
  }

  /**
   * Clear recent commands history
   */
  clearRecentCommands(): void {
    this.recentCommands = [];
  }

  private handleError(code: string, message: string, originalError?: any): ServiceError {
    console.error(`[CommandService] ${code}: ${message}`, originalError);
    return {
      code,
      message,
      details: originalError,
    };
  }
}

// Export singleton instance
export const commandService = new CommandService(); 