// Core Types for Syntari AI IDE - MVVM Architecture

// ================================
// MODEL LAYER TYPES (Business Logic)
// ================================

export interface AiProvider {
  id: string;
  name: string;
  type: 'claude' | 'openai' | 'gemini' | 'local';
  isAvailable: boolean;
  costPerToken: number;
  latency: number;
  specialties: string[];
}

export interface AiRequest {
  id: string;
  prompt: string;
  context?: ProjectContext;
  timestamp: number;
  userId?: string;
}

export interface AiResponse {
  id: string;
  requestId: string;
  provider: string;
  content: string;
  confidence: number;
  cost: number;
  responseTime: number;
  timestamp: number;
}

export interface ConsensusResult {
  bestResponse: AiResponse;
  alternativeResponses: AiResponse[];
  confidenceScore: number;
  totalCost: number;
  reasoning: string;
}

// ================================
// PROJECT & FILE SYSTEM TYPES
// ================================

export interface ProjectContext {
  rootPath: string;
  projectType: 'rust' | 'typescript' | 'python' | 'mixed' | 'unknown';
  openFiles: FileInfo[];
  dependencies: string[];
  gitBranch?: string;
  activeFramework?: string;
}

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified: number;
  content?: string;
  language?: string;
}

export interface EditorState {
  activeFile?: FileInfo;
  openTabs: FileInfo[];
  cursorPosition: { line: number; column: number };
  selection?: { start: Position; end: Position };
  unsavedChanges: boolean;
}

export interface Position {
  line: number;
  column: number;
}

// ================================
// CHAT & CONVERSATION TYPES
// ================================

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    provider?: string;
    cost?: number;
    context?: ProjectContext;
    codeSnippets?: CodeSnippet[];
  };
}

export interface CodeSnippet {
  language: string;
  code: string;
  filename?: string;
  startLine?: number;
  endLine?: number;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  context: ProjectContext;
  createdAt: number;
  updatedAt: number;
}

// ================================
// VIEW MODEL TYPES (Business Logic State)
// ================================

export interface AppViewModel {
  currentView: 'welcome' | 'editor' | 'chat' | 'settings';
  isLoading: boolean;
  error?: AppError;
  project?: ProjectContext;
  user?: UserProfile;
  performanceMode: boolean;
}

export interface EditorViewModel {
  state: EditorState;
  syntax: {
    language: string;
    theme: string;
    fontSize: number;
  };
  ai: {
    suggestionsEnabled: boolean;
    completionProvider: string;
    contextAware: boolean;
  };
}

export interface ChatViewModel {
  session: ChatSession;
  input: string;
  isTyping: boolean;
  availableProviders: AiProvider[];
  selectedProvider?: string;
  smartRouting: boolean;
}

export interface WelcomeViewModel {
  recentProjects: ProjectInfo[];
  templates: ProjectTemplate[];
  onboarding: {
    isFirstRun: boolean;
    currentStep: number;
    completed: boolean;
  };
}

// ================================
// CONFIGURATION & SETTINGS
// ================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    features: string[];
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  aiProvider: 'auto' | 'claude' | 'openai' | 'gemini';
  costOptimization: boolean;
  autoSave: boolean;
  performanceMode: boolean;
  keyboardShortcuts: Record<string, string>;
}

export interface ProjectInfo {
  name: string;
  path: string;
  type: string;
  lastOpened: number;
  favorite: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  framework?: string;
  files: TemplateFile[];
}

export interface TemplateFile {
  path: string;
  content: string;
  template: boolean;
}

// ================================
// ERROR HANDLING & EVENTS
// ================================

export interface AppError {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: number;
  context?: Record<string, any>;
  recoverable: boolean;
}

export interface AppEvent {
  type: string;
  payload: any;
  timestamp: number;
  source: 'ui' | 'backend' | 'ai' | 'system';
}

// ================================
// API RESPONSE TYPES (Tauri Commands)
// ================================

export type TauriResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface AiGenerateRequest {
  prompt: string;
  context?: ProjectContext;
  provider?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ProjectOpenRequest {
  path: string;
}

export interface FileReadRequest {
  path: string;
}

export interface FileSaveRequest {
  path: string;
  content: string;
}

// ================================
// ENTERPRISE FEATURES
// ================================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: number;
  metadata: Record<string, any>;
  compliance: {
    soc2: boolean;
    gdpr: boolean;
    fedramp: boolean;
  };
}

export interface SecurityContext {
  sessionId: string;
  permissions: string[];
  encryptionEnabled: boolean;
  auditingEnabled: boolean;
  complianceLevel: 'basic' | 'enterprise' | 'government';
}

// ================================
// PERFORMANCE & MONITORING
// ================================

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  errorRate: number;
}

export interface CostMetrics {
  totalSpent: number;
  savingsFromRouting: number;
  costPerRequest: number;
  budgetRemaining: number;
  monthlyProjection: number;
} 