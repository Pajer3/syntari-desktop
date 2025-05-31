// Core Types for Syntari AI IDE - MVVM Architecture
// Enterprise-grade TypeScript interfaces with comprehensive validation

// ================================
// CORE BUSINESS DOMAIN TYPES
// ================================

/**
 * AI Provider configuration with enterprise security and monitoring
 * @enterprise Includes cost tracking, performance metrics, and security validation
 */
export interface AiProvider {
  readonly id: string;
  readonly name: string;
  readonly type: 'claude' | 'openai' | 'gemini' | 'local';
  readonly isAvailable: boolean;
  readonly costPerToken: number;
  readonly latency: number;
  readonly specialties: readonly string[];
  readonly securityLevel: 'basic' | 'enterprise' | 'government';
  readonly complianceFeatures: readonly string[];
  readonly rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

/**
 * AI Request with enterprise audit trail and security context
 * @security All requests are logged and validated for compliance
 */
export interface AiRequest {
  readonly id: string;
  readonly prompt: string;
  readonly context?: ProjectContext;
  readonly timestamp: number;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly securityContext?: SecurityContext;
  readonly auditMetadata?: AuditMetadata;
  readonly provider?: string; // Optional for smart routing
  readonly maxTokens?: number;
  readonly temperature?: number;
}

/**
 * AI Response with comprehensive metadata and cost tracking
 * @performance Includes timing, cost, and quality metrics
 */
export interface AiResponse {
  readonly id: string;
  readonly requestId: string;
  readonly provider: string;
  readonly content: string;
  readonly confidence: number;
  readonly cost: number;
  readonly responseTime: number;
  readonly timestamp: number;
  readonly tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  readonly qualityScore?: number;
  readonly securityFlags?: readonly string[];
}

/**
 * Consensus Result from multi-model analysis with business intelligence
 * @intelligence Advanced consensus algorithm with reasoning and alternatives
 */
export interface ConsensusResult {
  readonly bestResponse: AiResponse;
  readonly alternativeResponses: readonly AiResponse[];
  readonly confidenceScore: number;
  readonly totalCost: number;
  readonly reasoning: string;
  readonly savingsFromRouting: number;
  readonly performanceMetrics: {
    totalResponseTime: number;
    averageConfidence: number;
    consensusStrength: number;
  };
}

// ================================
// PROJECT & FILE SYSTEM TYPES
// ================================

/**
 * Project Context with enterprise security and compliance tracking
 * @security Includes dependency scanning and security analysis
 */
export interface ProjectContext {
  readonly rootPath: string;
  readonly projectType: 'rust' | 'typescript' | 'python' | 'mixed' | 'unknown';
  readonly openFiles: readonly FileInfo[];
  readonly dependencies: readonly string[];
  readonly gitBranch?: string;
  readonly activeFramework?: string;
  readonly securityScan?: SecurityScanResult;
  readonly complianceStatus?: ComplianceStatus;
  readonly lastAnalyzed: number;
}

/**
 * File Information with security and content analysis
 * @security Includes file integrity and security classification
 */
export interface FileInfo {
  readonly path: string;
  readonly name: string;
  readonly extension: string;
  readonly size: number;
  readonly lastModified: number;
  readonly content?: string;
  readonly language?: string;
  readonly securityClassification?: 'public' | 'internal' | 'confidential' | 'secret';
  readonly containsSensitiveData?: boolean;
  readonly checksum?: string;
}

/**
 * Editor State with enterprise undo/redo and session persistence
 * @performance Optimized for large files and complex operations
 */
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

// ================================
// CHAT & CONVERSATION TYPES
// ================================

/**
 * Chat Message with enterprise audit and content analysis
 * @security All messages are scanned for sensitive data and compliance
 */
export interface ChatMessage {
  readonly id: string;
  readonly type: 'user' | 'ai' | 'system';
  readonly content: string;
  readonly timestamp: number;
  readonly metadata?: ChatMessageMetadata;
  readonly securityFlags?: readonly string[];
  readonly complianceApproved?: boolean;
}

export interface ChatMessageMetadata {
  readonly provider?: string;
  readonly cost?: number;
  readonly context?: ProjectContext;
  readonly codeSnippets?: readonly CodeSnippet[];
  readonly responseTime?: number;
  readonly qualityScore?: number;
  readonly auditId?: string;
}

/**
 * Code Snippet with syntax validation and security analysis
 * @security Code is scanned for security vulnerabilities and compliance
 */
export interface CodeSnippet {
  readonly language: string;
  readonly code: string;
  readonly filename?: string;
  readonly startLine?: number;
  readonly endLine?: number;
  readonly securityAnalysis?: SecurityAnalysis;
  readonly syntaxValid?: boolean;
}

/**
 * Chat Session with enterprise persistence and analytics
 * @analytics Full conversation analytics and business intelligence
 */
export interface ChatSession {
  readonly id: string;
  readonly name: string;
  readonly messages: readonly ChatMessage[];
  readonly context: ProjectContext;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly userId?: string;
  readonly analytics?: SessionAnalytics;
  readonly archived?: boolean;
}

// ================================
// VIEW MODEL TYPES (MVVM Architecture)
// ================================

/**
 * Application ViewModel with enterprise state management
 * @architecture MVVM pattern with reactive state and business logic separation
 */
export interface AppViewModel {
  readonly currentView: 'welcome' | 'editor' | 'chat' | 'settings';
  readonly isLoading: boolean;
  readonly error?: AppError;
  readonly project?: ProjectContext;
  readonly user?: UserProfile;
  readonly performanceMode: boolean;
  readonly securityContext?: SecurityContext;
  readonly complianceMode?: boolean;
}

/**
 * Editor ViewModel with enterprise development features
 * @features Advanced editing with AI integration and enterprise tools
 */
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

/**
 * Chat ViewModel with enterprise conversation management
 * @intelligence Smart routing, cost optimization, and quality assurance
 */
export interface ChatViewModel {
  readonly session: ChatSession;
  readonly input: string;
  readonly isTyping: boolean;
  readonly availableProviders: readonly AiProvider[];
  readonly selectedProvider?: string;
  readonly smartRouting: boolean;
  readonly costTracking: CostTracker;
  readonly qualityMetrics: QualityMetrics;
}

// ================================
// ENTERPRISE CONFIGURATION
// ================================

/**
 * User Profile with enterprise features and compliance
 * @compliance GDPR, SOC2, and FedRAMP compliant user management
 */
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

// ================================
// ERROR HANDLING & SECURITY
// ================================

/**
 * Application Error with enterprise error management
 * @recovery Automatic recovery strategies and escalation procedures
 */
export interface AppError {
  readonly code: string;
  readonly message: string;
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly timestamp: number;
  readonly context?: Record<string, unknown>;
  readonly recoverable: boolean;
  readonly stackTrace?: string;
  readonly errorId?: string;
  readonly userNotified?: boolean;
  readonly escalated?: boolean;
}

/**
 * Security Context for enterprise compliance
 * @security Zero-trust security model with comprehensive audit trail
 */
export interface SecurityContext {
  readonly sessionId: string;
  readonly userId: string;
  readonly permissions: readonly string[];
  readonly encryptionEnabled: boolean;
  readonly auditingEnabled: boolean;
  readonly complianceLevel: 'basic' | 'enterprise' | 'government';
  readonly accessLevel: 'read' | 'write' | 'admin';
  readonly lastAuthenticated: number;
  readonly mfaVerified: boolean;
}

export interface AuditMetadata {
  readonly auditId: string;
  readonly operation: string;
  readonly resource: string;
  readonly outcome: 'success' | 'failure' | 'partial';
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly complianceFlags: readonly string[];
}

// ================================
// QUALITY & PERFORMANCE MONITORING
// ================================

export interface QualityMetrics {
  readonly averageResponseTime: number;
  readonly accuracyScore: number;
  readonly userSatisfaction: number;
  readonly errorRate: number;
  readonly costEfficiency: number;
}

export interface CostTracker {
  readonly totalSpent: number;
  readonly savingsFromRouting: number;
  readonly costPerRequest: number;
  readonly budgetRemaining: number;
  readonly monthlyProjection: number;
  readonly optimization: CostOptimizationMetrics;
}

export interface CostOptimizationMetrics {
  readonly routingAccuracy: number;
  readonly cheapestModelUsage: number;
  readonly expensiveModelAvoidance: number;
  readonly savingsPercentage: number;
}

export interface PerformanceMetrics {
  readonly responseTime: number;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly networkLatency: number;
  readonly errorRate: number;
  readonly throughput: number;
}

// ================================
// COMPLIANCE & SECURITY ANALYSIS
// ================================

export interface SecurityScanResult {
  readonly scanId: string;
  readonly timestamp: number;
  readonly vulnerabilities: readonly SecurityVulnerability[];
  readonly overallRisk: 'low' | 'medium' | 'high' | 'critical';
  readonly complianceStatus: ComplianceStatus;
}

export interface SecurityVulnerability {
  readonly id: string;
  readonly type: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly file?: string;
  readonly line?: number;
  readonly recommendation: string;
}

export interface ComplianceStatus {
  readonly soc2: boolean;
  readonly gdpr: boolean;
  readonly fedramp: boolean;
  readonly hipaa?: boolean;
  readonly lastAudit: number;
  readonly nextAudit: number;
  readonly violations: readonly ComplianceViolation[];
}

export interface ComplianceViolation {
  readonly type: string;
  readonly severity: 'minor' | 'major' | 'critical';
  readonly description: string;
  readonly remediation: string;
  readonly deadline?: number;
}

export interface SecurityAnalysis {
  readonly hasSecrets: boolean;
  readonly hasVulnerabilities: boolean;
  readonly riskScore: number;
  readonly recommendations: readonly string[];
}

// ================================
// API RESPONSE TYPES (Tauri Integration)
// ================================

/**
 * Tauri Result with comprehensive error handling
 * @error_handling Enterprise-grade error response with recovery information
 */
export type TauriResult<T> = {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly errorCode?: string;
  readonly recoverable?: boolean;
  readonly retryAfter?: number;
};

// ================================
// ENTERPRISE ANALYTICS
// ================================

export interface SessionAnalytics {
  readonly messageCount: number;
  readonly averageResponseTime: number;
  readonly totalCost: number;
  readonly modelUsageBreakdown: Record<string, number>;
  readonly userSatisfactionScore?: number;
  readonly productivityGains?: number;
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