// Syntari AI IDE - Core Type Definitions
// Core business logic types

export interface AiProvider {
  readonly id: string;
  readonly name: string;
  readonly type: 'claude' | 'openai' | 'gemini' | 'local' | 'consensus';
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

export interface TauriResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly errorCode?: string;
  readonly recoverable?: boolean;
  readonly retryAfter?: number;
}

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