// Syntari AI IDE - Main Type Definitions Index
// Re-exports from organized type files for clean imports

// Core types
export type {
  AiProvider,
  FileInfo,
  ProjectContext,
  AppError,
  TauriResult,
  SecurityScanResult,
  SecurityVulnerability,
  ComplianceStatus,
  ComplianceViolation,
} from './core';

// Chat types
export type {
  ChatMessage,
  ChatMessageMetadata,
  CodeSnippet,
  SecurityAnalysis,
  ChatSession,
  SessionAnalytics,
  AiRequest,
  AiResponse,
  ConsensusResult,
  ChatViewModel,
  QualityMetrics,
  CostTracker,
  CostOptimizationMetrics,
  SecurityContext,
  AuditMetadata,
} from './chat';

// Import types for local use
import type { AppError, ProjectContext, FileInfo } from './core';
import type { SecurityContext } from './chat';

// App State types
export interface AppViewModel {
  readonly currentView: 'welcome' | 'editor' | 'chat' | 'settings' | 'projects' | 'analytics';
  readonly isLoading: boolean;
  readonly error?: AppError;
  readonly project?: ProjectContext;
  readonly user?: UserProfile;
  readonly performanceMode: boolean;
  readonly securityContext?: SecurityContext;
  readonly complianceMode?: boolean;
  readonly availableProviders: readonly import('./core').AiProvider[];
  readonly smartRouting: boolean;
  readonly selectedProvider?: string;
  readonly currentProject?: ProjectContext;
  readonly session?: import('./chat').ChatSession;
}

export interface EditorViewModel {
  readonly state: EditorState;
  readonly syntax: SyntaxConfiguration;
  readonly ai: AiIntegrationSettings;
  readonly collaboration?: CollaborationState;
  readonly qualityGates?: QualityGateStatus;
}

export interface SyntaxConfiguration {
  readonly language: string;
  readonly theme: string;
  readonly fontSize: number;
  readonly tabSize: number;
  readonly wordWrap: boolean;
  readonly lineNumbers: boolean;
}

export interface AiIntegrationSettings {
  readonly suggestionsEnabled: boolean;
  readonly completionProvider: string;
  readonly contextAware: boolean;
  readonly securityScanning: boolean;
  readonly costOptimization: boolean;
}

export interface EditorState {
  readonly activeFile?: FileInfo;
  readonly openTabs: readonly FileInfo[];
  readonly cursorPosition: Position;
  readonly selection?: Selection;
  readonly unsavedChanges: boolean;
  readonly undoStack: readonly EditorAction[];
  readonly redoStack: readonly EditorAction[];
  readonly sessionId: string;
  readonly lastSaved: number;
}

export interface Position {
  readonly line: number;
  readonly column: number;
}

export interface Selection {
  readonly start: Position;
  readonly end: Position;
}

export interface EditorAction {
  readonly type: 'insert' | 'delete' | 'replace';
  readonly position: Position;
  readonly content: string;
  readonly timestamp: number;
}

export interface UserProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly preferences: UserPreferences;
  readonly subscription: SubscriptionInfo;
  readonly complianceProfile?: ComplianceProfile;
  readonly securityClearance?: SecurityClearance;
  readonly auditSettings?: AuditSettings;
}

export interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly aiProvider: 'auto' | 'claude' | 'openai' | 'gemini';
  readonly costOptimization: boolean;
  readonly autoSave: boolean;
  readonly performanceMode: boolean;
  readonly keyboardShortcuts: Record<string, string>;
  readonly securityLevel: 'standard' | 'enhanced' | 'maximum';
  readonly complianceMode: boolean;
}

export interface SubscriptionInfo {
  readonly plan: 'free' | 'pro' | 'enterprise';
  readonly features: readonly string[];
  readonly limits: UsageLimits;
  readonly billingCycle?: 'monthly' | 'yearly';
  readonly expiresAt?: number;
}

export interface UsageLimits {
  readonly requestsPerDay: number;
  readonly tokensPerMonth: number;
  readonly storageGB: number;
  readonly collaborators: number;
}

export interface PerformanceMetrics {
  readonly responseTime: number;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly networkLatency: number;
  readonly errorRate: number;
  readonly throughput: number;
}

export interface QualityGateStatus {
  readonly security: 'pass' | 'fail' | 'warning';
  readonly performance: 'pass' | 'fail' | 'warning';
  readonly compliance: 'pass' | 'fail' | 'warning';
  readonly lastCheck: number;
}

export interface CollaborationState {
  readonly isCollaborating: boolean;
  readonly collaborators: readonly CollaboratorInfo[];
  readonly permissions: readonly string[];
}

export interface CollaboratorInfo {
  readonly id: string;
  readonly name: string;
  readonly role: 'viewer' | 'editor' | 'admin';
  readonly lastSeen: number;
}

export interface ComplianceProfile {
  readonly requiredStandards: readonly string[];
  readonly dataClassification: 'public' | 'internal' | 'confidential' | 'secret';
  readonly retentionPeriod: number;
  readonly auditFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

export interface SecurityClearance {
  readonly level: 'basic' | 'secret' | 'top_secret';
  readonly validUntil: number;
  readonly issuedBy: string;
  readonly restrictions: readonly string[];
}

export interface AuditSettings {
  readonly logLevel: 'minimal' | 'standard' | 'comprehensive';
  readonly retentionDays: number;
  readonly realTimeMonitoring: boolean;
  readonly alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  readonly errorRate: number;
  readonly responseTime: number;
  readonly costPerHour: number;
  readonly securityIncidents: number;
}

// Export file system types
export type {
  FileNode,
  FileSystemDiff,
  FileSystemSnapshot,
  FileWatchEvent,
  FileSystemCache,
  FileSystemService,
  ScanOptions,
  FileSystemMetrics,
} from './fileSystem'; 