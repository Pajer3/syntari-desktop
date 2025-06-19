// Syntari AI IDE - Service Layer Types

// Core Terminal Types
export interface TerminalSession {
  id: string;
  name: string;
  workingDirectory: string;
  history: TerminalOutput[];
  isActive: boolean;
  pid?: number;
}

export interface TerminalOutput {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
  exitCode?: number;
}

export interface CommandResult {
  success: boolean;
  output: string;
  error: string;
  exitCode: number;
  command: string;
}

export interface TerminalInfo {
  shell: string;
  working_directory: string;
  environment_variables: [string, string][];
  os: string;
  arch: string;
  family: string;
  username: string;
  hostname: string;
}

// Search Service Types
export interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxResults?: number;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  text: string;
  match: string;
  preview: string;
}

export interface ReplaceOptions extends SearchOptions {
  replacement: string;
  replaceAll?: boolean;
}

// Command Service Types
export interface Command {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  keybinding?: string;
  icon?: string;
  action: () => Promise<void> | void;
}

export type CommandCategory = 'File' | 'Edit' | 'View' | 'Terminal' | 'Git' | 'AI' | 'Debug';

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  filteredCommands: Command[];
  recentCommands: string[];
}

// AI Service Types
export interface AIRequest {
  prompt: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;
  latency: number;
}

// Project Service Types
export interface ProjectInfo {
  name: string;
  path: string;
  type: string;
  lastModified: Date;
  files: number;
  size: number;
}

export interface FileSystemEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified: Date;
  permissions: string;
}

// Chat Service Types
export interface ChatUsageMetrics {
  totalConversations: number;
  totalMessages: number;
  averageResponseTime: number;
  totalCost: number;
}

export interface ChatCostAnalysis {
  totalCost: number;
  averageCostPerMessage: number;
  costByProvider: Record<string, number>;
  dailyCosts: Array<{ date: string; cost: number }>;
}

// System Types
export interface SystemInfo {
  os: string;
  arch: string;
  family: string;
  executable: string;
  args: string[];
}

export interface GitCommandResult {
  success: boolean;
  output: string;
  command: string;
}

export interface ExecuteOptions {
  workingDirectory?: string;
  timeout?: number;
  env?: Record<string, string>;
}

// Backend compatibility types
export interface TauriResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BackendAiProvider {
  id: string;
  name: string;
  model_type: string;
  is_available: boolean;
  api_endpoint?: string;
  requires_auth: boolean;
}

export interface BackendProjectContext {
  root_path: string;
  project_type: string;
  open_files: Array<{
    path: string;
    name: string;
    extension: string;
    size: number;
    last_modified: number;
    content: string;
    language: string;
  }>;
  dependencies: any[];
  git_branch?: string;
  active_framework?: string;
}

// Enhanced error types with business context and recovery strategies
export interface ServiceError {
  code: string;
  message: string;
  category: 'user' | 'system' | 'network' | 'ai' | 'filesystem' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  businessImpact: 'none' | 'productivity' | 'data' | 'security' | 'revenue';
  recoverySuggestions: string[];
  timestamp: number;
  context?: Record<string, any>;
  userActions?: {
    primary: { label: string; action: string };
    secondary?: { label: string; action: string };
  };
}

// Error factory for consistent error creation
export class ServiceErrorFactory {
  static create(
    code: string,
    message: string,
    category: ServiceError['category'],
    options: Partial<Omit<ServiceError, 'code' | 'message' | 'category' | 'timestamp'>> = {}
  ): ServiceError {
    return {
      code,
      message,
      category,
      severity: options.severity ?? 'medium',
      recoverable: options.recoverable ?? true,
      businessImpact: options.businessImpact ?? 'productivity',
      recoverySuggestions: options.recoverySuggestions ?? [],
      timestamp: Date.now(),
      context: options.context,
      userActions: options.userActions,
    };
  }

  static filesystem(code: string, message: string, path?: string): ServiceError {
    return this.create(code, message, 'filesystem', {
      severity: 'medium',
      businessImpact: 'productivity',
      context: { path },
      recoverySuggestions: [
        'Check file permissions',
        'Verify file exists',
        'Try refreshing file tree',
      ],
      userActions: {
        primary: { label: 'Retry', action: 'retry' },
        secondary: { label: 'Refresh', action: 'refresh' },
      },
    });
  }

  static ai(code: string, message: string, provider?: string, cost?: number): ServiceError {
    return this.create(code, message, 'ai', {
      severity: 'high',
      businessImpact: 'productivity',
      context: { provider, cost },
      recoverySuggestions: [
        'Try alternative AI provider',
        'Check network connection',
        'Verify API credentials',
      ],
      userActions: {
        primary: { label: 'Switch Provider', action: 'switch_provider' },
        secondary: { label: 'Retry', action: 'retry' },
      },
    });
  }

  static security(code: string, message: string, resource?: string): ServiceError {
    return this.create(code, message, 'security', {
      severity: 'critical',
      businessImpact: 'security',
      recoverable: false,
      context: { resource },
      recoverySuggestions: [
        'Contact system administrator',
        'Review security policies',
        'Check user permissions',
      ],
      userActions: {
        primary: { label: 'Contact Admin', action: 'contact_admin' },
      },
    });
  }
} 