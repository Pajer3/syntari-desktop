// Syntari AI IDE - Chat Type Definitions
// Chat and AI interaction types

import type { ProjectContext, AiProvider } from './core';

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

export interface CodeSnippet {
  readonly language: string;
  readonly code: string;
  readonly filename?: string;
  readonly startLine?: number;
  readonly endLine?: number;
  readonly securityAnalysis?: SecurityAnalysis;
  readonly syntaxValid?: boolean;
}

export interface SecurityAnalysis {
  readonly hasSecrets: boolean;
  readonly hasVulnerabilities: boolean;
  readonly riskScore: number;
  readonly recommendations: readonly string[];
}

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

export interface SessionAnalytics {
  readonly messageCount: number;
  readonly averageResponseTime: number;
  readonly totalCost: number;
  readonly modelUsageBreakdown: Record<string, number>;
  readonly userSatisfactionScore?: number;
  readonly productivityGains?: number;
}

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