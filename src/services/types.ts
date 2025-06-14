// Syntari AI IDE - Service Types
// TypeScript interfaces for Tauri backend integration

// Terminal Service Types
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

// AI Service Types (using core AiProvider interface)

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

// Error Types
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

// System Types
export interface SystemInfo {
  os: string;
  arch: string;
  family: string;
  executable: string;
  args: string[];
}

// Git command result type
export interface GitCommandResult {
  success: boolean;
  output: string;
  command: string;
}

// Terminal execution options
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

// Backend AI Provider type (to match Rust backend)
export interface BackendAiProvider {
  id: string;
  name: string;
  model_type: string;
  is_available: boolean;
  api_endpoint?: string;
  requires_auth: boolean;
}

// Backend project context type
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