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
  output: string;
  exit_code: number;
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