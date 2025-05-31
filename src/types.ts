// Tauri Dialog API types
export interface DialogFilter {
  name: string;
  extensions: string[];
}

export interface OpenDialogOptions {
  multiple?: boolean;
  directory?: boolean;
  defaultPath?: string;
  filters?: DialogFilter[];
  title?: string;
}

// Core application types
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified: number;
  content?: string;
  language?: string;
  isOpen?: boolean;
  isDirty?: boolean;
}

export interface ProjectContext {
  rootPath: string;
  projectType: string;
  openFiles: FileInfo[];
  dependencies: string[];
  gitBranch?: string;
  activeFramework?: string;
  lastAnalyzed?: number;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    provider?: string;
    cost?: number;
    complianceApproved?: boolean;
    [key: string]: any;
  };
}

export interface AiProvider {
  id: string;
  name: string;
  type: 'claude' | 'openai' | 'gemini' | 'local';
  providerType: string;
  isAvailable: boolean;
  costPerToken: number;
  latency: number;
  specialties: string[];
}

export interface AppError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'critical';
  timestamp: number;
  recoverable: boolean;
  context?: Record<string, any>;
  errorId?: string;
  stackTrace?: string;
}

export interface PermissionCheckResult {
  success: boolean;
  data: boolean;
  error?: string;
}

// ================================
// TAURI RESULT WRAPPER
// ================================

export interface TauriResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ================================
// AI AND CHAT TYPES
// ================================

export interface AiRequest {
  id: string;
  prompt: string;
  context?: ProjectContext;
  provider?: string;
  maxTokens?: number;
  temperature?: number;
  timestamp: number;
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

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  context: ProjectContext;
  createdAt: number;
  updatedAt: number;
}

// ================================
// CONTEXT7 MCP INTEGRATION TYPES
// ================================

export interface Context7LibraryResult {
  id: string;
  name: string;
  description?: string;
  documentationCoverage?: number;
  trustScore?: number;
}

export interface Context7DocsResult {
  libraryId: string;
  content: string;
  tokensUsed: number;
  topicFocused?: string;
}

// ================================
// VIEW MODEL TYPES
// ================================

export interface AppViewModel {
  isLoading: boolean;
  currentView: 'projects' | 'editor' | 'settings' | 'analytics';
  currentProject?: ProjectContext;
  availableProviders: AiProvider[];
  error?: AppError;
  smartRouting: boolean;
  selectedProvider?: string;
}

export interface ChatViewModel {
  session?: ChatSession;
  input: string;
  isTyping: boolean;
  selectedProvider?: string;
  smartRouting: boolean;
  securityContext?: SecurityContext;
  qualityMetrics: QualityMetrics;
  performanceMetrics: PerformanceMetrics;
  costTracking: CostTracker;
  auditTrail: AuditMetadata[];
}

// ================================
// ENTERPRISE FEATURES
// ================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'developer' | 'admin' | 'viewer';
  preferences: Record<string, any>;
  permissions: string[];
}

export interface SecurityContext {
  userId: string;
  sessionId: string;
  permissions: string[];
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  auditEnabled: boolean;
  encryptionRequired: boolean;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  totalRequests: number;
  successRate: number;
  cacheHitRate: number;
  errorRate: number;
  providerDistribution: Record<string, number>;
  lastUpdated: number;
}

export interface QualityMetrics {
  averageConfidence: number;
  userSatisfactionScore: number;
  responseAccuracy: number;
  contextRelevance: number;
  lastCalculated: number;
}

export interface CostTracker {
  totalCost: number;
  costByProvider: Record<string, number>;
  costByProject: Record<string, number>;
  monthlyBudget: number;
  alertThreshold: number;
  lastReset: number;
}

export interface AuditMetadata {
  id: string;
  userId: string;
  action: string;
  timestamp: number;
  details: Record<string, any>;
  complianceLevel: 'low' | 'medium' | 'high' | 'critical';
} 