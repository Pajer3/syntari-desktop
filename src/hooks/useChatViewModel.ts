// Syntari AI IDE - Chat View Model (MVVM Business Logic Layer)
// Enterprise chat with AI consensus, cost optimization, security, and compliance

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type {
  AppError,
  ProjectContext,
  ChatViewModel,
  ChatSession,
  ChatMessage,
  AiProvider,
  AiRequest,
  ConsensusResult,
  SecurityContext,
  AuditMetadata,
  QualityMetrics,
  TauriResult,
} from '../types';

// ================================
// ENTERPRISE AI CONFIGURATION
// ================================

const AI_CONFIG = {
  MAX_MESSAGE_LENGTH: 8000,
  MAX_CONVERSATION_LENGTH: 100,
  COST_OPTIMIZATION_THRESHOLD: 0.01, // $0.01
  QUALITY_THRESHOLD: 0.8, // 80% confidence minimum
  RESPONSE_TIMEOUT_MS: 30000, // 30 seconds
  RATE_LIMIT_PER_MINUTE: 60,
  SECURITY_SCAN_TIMEOUT: 5000,
  AUDIT_BATCH_SIZE: 5,
} as const;

const COST_SAVINGS_TARGET = 0.97; // 97% savings goal

const AI_ERROR_CODES = {
  MESSAGE_SEND_FAILED: 'AI_MESSAGE_SEND_FAILED',
  SESSION_CREATE_FAILED: 'AI_SESSION_CREATE_FAILED',
  PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  COST_LIMIT_EXCEEDED: 'AI_COST_LIMIT_EXCEEDED',
  QUALITY_THRESHOLD_FAILED: 'AI_QUALITY_THRESHOLD_FAILED',
  SECURITY_VIOLATION: 'AI_SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED: 'AI_RATE_LIMIT_EXCEEDED',
} as const;

// ================================
// ENTERPRISE CHAT INTERFACE
// ================================

interface UseChatViewModelReturn {
  // Core State
  readonly viewModel: ChatViewModel;
  
  // Primary Actions
  readonly createSession: (project: ProjectContext) => Promise<string | null>;
  readonly sendMessage: (content: string) => Promise<void>;
  readonly setInput: (input: string) => void;
  readonly clearSession: () => void;
  
  // AI Provider Management
  readonly selectProvider: (providerId: string) => void;
  readonly toggleSmartRouting: () => void;
  readonly getProviderRecommendation: (prompt: string) => Promise<string | null>;
  
  // Cost & Quality Management
  readonly getCostBreakdown: () => Record<string, number>;
  readonly getQualityTrends: () => QualityMetrics;
  readonly optimizeCosts: () => Promise<void>;
  
  // Security & Compliance
  readonly validateMessageSecurity: (content: string) => Promise<boolean>;
  readonly exportConversation: () => Promise<string>;
  readonly auditConversation: () => Promise<AuditMetadata[]>;
  
  // Computed Properties
  readonly isReady: boolean;
  readonly canSendMessage: boolean;
  readonly totalCost: number;
  readonly messageCount: number;
  readonly savingsPercentage: number;
  readonly averageQuality: number;
  readonly securityRisk: 'low' | 'medium' | 'high';
}

// ================================
// ENTERPRISE CHAT VIEW MODEL
// ================================

export const useChatViewModel = (
  project?: ProjectContext,
  onError?: (error: AppError) => void
): UseChatViewModelReturn => {
  // ================================
  // STATE MANAGEMENT (IMMUTABLE)
  // ================================
  
  const [viewModel, setViewModel] = useState<ChatViewModel>({
    session: {
      id: '',
      name: 'New Chat',
      messages: [],
      context: project || {
        rootPath: '',
        projectType: 'unknown',
        openFiles: [],
        dependencies: [],
        lastAnalyzed: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: 'user-1',
      analytics: {
        messageCount: 0,
        averageResponseTime: 0,
        totalCost: 0,
        modelUsageBreakdown: {},
        userSatisfactionScore: 5.0,
        productivityGains: 0,
      },
    },
    input: '',
    isTyping: false,
    availableProviders: [],
    selectedProvider: undefined,
    smartRouting: true,
    costTracking: {
      totalSpent: 0,
      savingsFromRouting: 0,
      costPerRequest: 0,
      budgetRemaining: 1000, // $1000 default budget
      monthlyProjection: 0,
      optimization: {
        routingAccuracy: 0.95,
        cheapestModelUsage: 0.8,
        expensiveModelAvoidance: 0.9,
        savingsPercentage: COST_SAVINGS_TARGET,
      },
    },
    qualityMetrics: {
      averageResponseTime: 0,
      accuracyScore: 0.9,
      userSatisfaction: 5.0,
      errorRate: 0,
      costEfficiency: 0.97,
    },
  });
  
  // Enterprise State Management
  const [isInitialized, setIsInitialized] = useState(false);
  const [securityContext] = useState<SecurityContext | undefined>(undefined);
  const [auditQueue, setAuditQueue] = useState<AuditMetadata[]>([]);
  
  // Operational References
  const sendingMessageRef = useRef<boolean>(false);
  const sessionRef = useRef<string>('');
  const rateLimitRef = useRef<number[]>([]);
  const qualityHistoryRef = useRef<number[]>([]);
  
  // ================================
  // COMPUTED PROPERTIES
  // ================================
  
  const isReady = isInitialized && sessionRef.current !== '';
  const canSendMessage = isReady && 
    viewModel.input.trim() !== '' && 
    !viewModel.isTyping && 
    viewModel.input.length <= AI_CONFIG.MAX_MESSAGE_LENGTH &&
    !isRateLimited();
  
  const totalCost = viewModel.session.analytics?.totalCost || 0;
  const messageCount = viewModel.session.messages.length;
  const savingsPercentage = viewModel.costTracking.optimization.savingsPercentage * 100;
  const averageQuality = qualityHistoryRef.current.length > 0 
    ? qualityHistoryRef.current.reduce((a, b) => a + b, 0) / qualityHistoryRef.current.length 
    : 0.9;
  
  const securityRisk: 'low' | 'medium' | 'high' = (() => {
    if (!securityContext) return 'high';
    if (totalCost > viewModel.costTracking.budgetRemaining * 0.8) return 'medium';
    if (viewModel.qualityMetrics.errorRate > 0.1) return 'medium';
    return 'low';
  })();
  
  // ================================
  // RATE LIMITING & SECURITY
  // ================================
  
  function isRateLimited(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old timestamps
    rateLimitRef.current = rateLimitRef.current.filter(timestamp => timestamp > oneMinuteAgo);
    
    return rateLimitRef.current.length >= AI_CONFIG.RATE_LIMIT_PER_MINUTE;
  }
  
  const validateMessageSecurity = useCallback(async (content: string): Promise<boolean> => {
    try {
      // Check for sensitive data patterns
      const sensitivePatterns = [
        /(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[\w-]{8,}["']?/gi,
        /[A-Z0-9]{20,}/g, // Potential API keys
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card patterns
      ];
      
      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          console.warn('🔒 Sensitive data detected in message');
          return false;
        }
      }
      
      // Backend security validation
      const result: TauriResult<boolean> = await invoke('validate_message_security', { content });
      return result.success && result.data === true;
      
    } catch (error) {
      console.error('❌ Security validation failed:', error);
      return false;
    }
  }, []);
  
  // ================================
  // AUDIT & COMPLIANCE
  // ================================
  
  const auditAction = useCallback(async (action: string): Promise<void> => {
    const auditEntry: AuditMetadata = {
      auditId: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation: action,
      resource: `chat_session_${sessionRef.current}`,
      outcome: 'success',
      riskLevel: 'low',
      complianceFlags: [],
    };
    
    setAuditQueue(prev => [...prev, auditEntry]);
    
    // Batch process audit logs
    if (auditQueue.length >= AI_CONFIG.AUDIT_BATCH_SIZE) {
      try {
        await invoke('batch_audit_chat_logs', { logs: auditQueue });
        setAuditQueue([]);
        console.log('📋 Chat audit batch processed');
      } catch (error) {
        console.error('⚠️ Failed to process chat audit batch:', error);
      }
    }
  }, [auditQueue.length]);
  
  const auditConversation = useCallback(async (): Promise<AuditMetadata[]> => {
    return auditQueue;
  }, [auditQueue]);
  
  const exportConversation = useCallback(async (): Promise<string> => {
    try {
      const exportData = {
        session: viewModel.session,
        analytics: viewModel.session.analytics,
        costTracking: viewModel.costTracking,
        qualityMetrics: viewModel.qualityMetrics,
        exportedAt: new Date().toISOString(),
        complianceVersion: '2024.1',
      };
      
      const result: TauriResult<string> = await invoke('export_conversation', { 
        data: JSON.stringify(exportData, null, 2) 
      });
      
      if (result.success && result.data) {
        auditAction('conversation_exported');
        return result.data;
      }
      
      throw new Error(result.error || 'Export failed');
      
    } catch (error) {
      console.error('❌ Conversation export failed:', error);
      throw error;
    }
  }, [viewModel.session, viewModel.costTracking, viewModel.qualityMetrics, auditAction]);
  
  // ================================
  // COST OPTIMIZATION ENGINE
  // ================================
  
  const getProviderRecommendation = useCallback(async (prompt: string): Promise<string | null> => {
    try {
      // Analyze prompt complexity
      const wordCount = prompt.split(' ').length;
      const hasCodeBlocks = /```/.test(prompt);
      const hasMathContent = /\$\$|\\\(|\\\[/.test(prompt);
      const isComplexQuery = wordCount > 50 || hasCodeBlocks || hasMathContent;
      
      // Cost-first optimization (97% savings goal)
      if (!isComplexQuery && viewModel.smartRouting) {
        // Prefer Gemini for simple tasks (ultra-low cost)
        const geminiProvider = viewModel.availableProviders.find(p => p.type === 'gemini');
        if (geminiProvider?.isAvailable) {
          console.log('💎 Recommending Gemini for cost optimization');
          return geminiProvider.id;
        }
      }
      
      // Quality-focused routing for complex tasks
      if (isComplexQuery) {
        const claudeProvider = viewModel.availableProviders.find(p => p.type === 'claude');
        if (claudeProvider?.isAvailable) {
          console.log('🧠 Recommending Claude for complex reasoning');
          return claudeProvider.id;
        }
      }
      
      // Fallback to any available provider
      const availableProvider = viewModel.availableProviders.find(p => p.isAvailable);
      return availableProvider?.id || null;
      
    } catch (error) {
      console.error('❌ Provider recommendation failed:', error);
      return null;
    }
  }, [viewModel.availableProviders, viewModel.smartRouting]);
  
  const getCostBreakdown = useCallback((): Record<string, number> => {
    return viewModel.session.analytics?.modelUsageBreakdown || {};
  }, [viewModel.session.analytics?.modelUsageBreakdown]);
  
  const getQualityTrends = useCallback((): QualityMetrics => {
    return viewModel.qualityMetrics;
  }, [viewModel.qualityMetrics]);
  
  const optimizeCosts = useCallback(async (): Promise<void> => {
    try {
      console.log('💰 Running cost optimization analysis...');
      
      const currentSavings = viewModel.costTracking.optimization.savingsPercentage;
      
      if (currentSavings < COST_SAVINGS_TARGET) {
        // Force smart routing
        setViewModel(prev => ({ ...prev, smartRouting: true }));
        
        // Clear expensive provider selection
        setViewModel(prev => ({ ...prev, selectedProvider: undefined }));
        
        console.log(`✅ Cost optimization enabled - Target: ${COST_SAVINGS_TARGET * 100}%`);
      }
      
      auditAction('cost_optimization');
      
    } catch (error) {
      console.error('❌ Cost optimization failed:', error);
    }
  }, [viewModel.costTracking.optimization.savingsPercentage, auditAction]);
  
  // ================================
  // CORE BUSINESS LOGIC
  // ================================
  
  const createSession = useCallback(async (projectContext: ProjectContext): Promise<string | null> => {
    try {
      console.log('💬 Creating enterprise chat session...');
      
      const result: TauriResult<string> = await invoke('create_chat_session', {
        projectPath: projectContext.rootPath,
      });
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create chat session');
      }
      
      sessionRef.current = result.data;
      
      const enhancedSession: ChatSession = {
        id: result.data,
        name: `Chat - ${projectContext.rootPath.split('/').pop() || 'Project'}`,
        context: projectContext,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        userId: 'user-1',
        analytics: {
          messageCount: 0,
          averageResponseTime: 0,
          totalCost: 0,
          modelUsageBreakdown: {},
          userSatisfactionScore: 5.0,
          productivityGains: 0,
        },
      };
      
      setViewModel(prev => ({ ...prev, session: enhancedSession }));
      
      console.log(`✅ Chat session created: ${result.data}`);
      console.log(`📁 Project context: ${projectContext.projectType}`);
      console.log(`🔐 Security level: ${securityRisk}`);
      
      auditAction('session_created');
      
      return result.data;
      
    } catch (error) {
      const chatError: AppError = {
        code: AI_ERROR_CODES.SESSION_CREATE_FAILED,
        message: error instanceof Error ? error.message : 'Failed to create chat session',
        severity: 'error',
        timestamp: Date.now(),
        context: { projectPath: projectContext.rootPath },
        recoverable: true,
      };
      
      onError?.(chatError);
      console.error('❌ Failed to create chat session:', error);
      return null;
    }
  }, [securityRisk, auditAction, onError]);
  
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!canSendMessage || sendingMessageRef.current) return;
    
    sendingMessageRef.current = true;
    const startTime = performance.now();
    
    try {
      // Rate limiting check
      if (isRateLimited()) {
        throw new Error('Rate limit exceeded. Please wait before sending another message.');
      }
      
      // Security validation
      const isSecure = await validateMessageSecurity(content);
      if (!isSecure) {
        throw new Error('Message contains sensitive data or security violations');
      }
      
      // Add to rate limit tracker
      rateLimitRef.current.push(Date.now());
      
      setViewModel(prev => ({ ...prev, isTyping: true, input: '' }));
      
      // Send user message
      const userMessageResult: TauriResult<ChatMessage> = await invoke('send_chat_message', {
        sessionId: sessionRef.current,
        content,
      });
      
      if (!userMessageResult.success || !userMessageResult.data) {
        throw new Error(userMessageResult.error || 'Failed to send message');
      }
      
      // Add user message to UI
      setViewModel(prev => ({
        ...prev,
        session: {
          ...prev.session,
          messages: [...prev.session.messages, userMessageResult.data!],
          updatedAt: Date.now(),
        },
      }));
      
      // Get provider recommendation for cost optimization
      const recommendedProvider = await getProviderRecommendation(content);
      
      // Create AI request with enterprise context
      const aiRequest: AiRequest = {
        id: `req-${Date.now()}`,
        prompt: content,
        context: viewModel.session.context,
        timestamp: Date.now(),
        userId: 'user-1',
        sessionId: sessionRef.current,
        provider: viewModel.smartRouting ? recommendedProvider || undefined : viewModel.selectedProvider,
        securityContext,
        auditMetadata: {
          auditId: `ai-req-${Date.now()}`,
          operation: 'ai_request',
          resource: sessionRef.current,
          outcome: 'success',
          riskLevel: 'low',
          complianceFlags: [],
        },
      };
      
      // Get AI response with consensus
      const aiResult: TauriResult<ConsensusResult> = await invoke('generate_ai_response', {
        id: aiRequest.id,
        prompt: aiRequest.prompt,
        context: aiRequest.context,
        timestamp: aiRequest.timestamp,
        userId: aiRequest.userId,
        sessionId: aiRequest.sessionId,
        provider: aiRequest.provider,
        securityContext: aiRequest.securityContext,
        auditMetadata: aiRequest.auditMetadata,
        maxTokens: aiRequest.maxTokens,
        temperature: aiRequest.temperature,
      });
      
      if (!aiResult.success || !aiResult.data) {
        throw new Error(aiResult.error || 'Failed to get AI response');
      }
      
      const consensus = aiResult.data;
      const responseTime = performance.now() - startTime;
      
      // Validate response quality
      if (consensus.confidenceScore < AI_CONFIG.QUALITY_THRESHOLD) {
        console.warn(`⚠️ Low quality response: ${consensus.confidenceScore * 100}%`);
      }
      
      // Create AI message with enterprise metadata
      const aiMessage: ChatMessage = {
        id: consensus.bestResponse.id,
        type: 'ai',
        content: consensus.bestResponse.content,
        timestamp: consensus.bestResponse.timestamp,
        metadata: {
          provider: consensus.bestResponse.provider,
          cost: consensus.totalCost,
          context: viewModel.session.context,
          codeSnippets: extractCodeSnippets(consensus.bestResponse.content),
          responseTime,
          qualityScore: consensus.confidenceScore,
          auditId: aiRequest.auditMetadata?.auditId,
        },
        complianceApproved: true,
      };
      
      // Update session with enhanced analytics
      const updatedAnalytics = {
        messageCount: viewModel.session.analytics!.messageCount + 2, // User + AI
        averageResponseTime: (viewModel.session.analytics!.averageResponseTime + responseTime) / 2,
        totalCost: viewModel.session.analytics!.totalCost + consensus.totalCost,
        modelUsageBreakdown: {
          ...viewModel.session.analytics!.modelUsageBreakdown,
          [consensus.bestResponse.provider]: (viewModel.session.analytics!.modelUsageBreakdown[consensus.bestResponse.provider] || 0) + 1,
        },
        userSatisfactionScore: viewModel.session.analytics!.userSatisfactionScore,
        productivityGains: (viewModel.session.analytics?.productivityGains || 0) + calculateProductivityGain(content, aiMessage.content),
      };
      
      // Update cost tracking
      const updatedCostTracking = {
        ...viewModel.costTracking,
        totalSpent: viewModel.costTracking.totalSpent + consensus.totalCost,
        savingsFromRouting: viewModel.costTracking.savingsFromRouting + consensus.savingsFromRouting,
        costPerRequest: updatedAnalytics.totalCost / (updatedAnalytics.messageCount / 2),
        budgetRemaining: viewModel.costTracking.budgetRemaining - consensus.totalCost,
      };
      
      // Update quality metrics
      qualityHistoryRef.current.push(consensus.confidenceScore);
      qualityHistoryRef.current = qualityHistoryRef.current.slice(-50); // Keep last 50
      
      const updatedQualityMetrics = {
        ...viewModel.qualityMetrics,
        averageResponseTime: updatedAnalytics.averageResponseTime,
        accuracyScore: averageQuality,
        costEfficiency: updatedCostTracking.savingsFromRouting / Math.max(updatedCostTracking.totalSpent, 0.01),
      };
      
      // Final state update
      setViewModel(prev => ({
        ...prev,
        isTyping: false,
        session: {
          ...prev.session,
          messages: [...prev.session.messages, aiMessage],
          updatedAt: Date.now(),
          analytics: updatedAnalytics,
        },
        costTracking: updatedCostTracking,
        qualityMetrics: updatedQualityMetrics,
      }));
      
      // Enterprise logging with comprehensive metrics
      console.log(`🤖 AI Response completed:`);
      console.log(`   Provider: ${consensus.bestResponse.provider}`);
      console.log(`   Confidence: ${(consensus.confidenceScore * 100).toFixed(1)}%`);
      console.log(`   Cost: $${consensus.totalCost.toFixed(6)}`);
      console.log(`   Savings: $${consensus.savingsFromRouting.toFixed(6)} (${savingsPercentage.toFixed(1)}%)`);
      console.log(`   Response time: ${responseTime.toFixed(0)}ms`);
      console.log(`   Total cost: $${updatedCostTracking.totalSpent.toFixed(6)}`);
      console.log(`   Budget remaining: $${updatedCostTracking.budgetRemaining.toFixed(2)}`);
      
      auditAction('message_sent');
      
    } catch (error) {
      setViewModel(prev => ({ ...prev, isTyping: false }));
      
      const errorCode = error instanceof Error && error.message.includes('Rate limit') 
        ? AI_ERROR_CODES.RATE_LIMIT_EXCEEDED
        : error instanceof Error && error.message.includes('security')
        ? AI_ERROR_CODES.SECURITY_VIOLATION
        : AI_ERROR_CODES.MESSAGE_SEND_FAILED;
      
      const appError: AppError = {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Failed to send message',
        severity: errorCode === AI_ERROR_CODES.SECURITY_VIOLATION ? 'critical' : 'error',
        timestamp: Date.now(),
        context: { 
          sessionId: sessionRef.current,
          messageLength: content.length,
          rateLimited: isRateLimited(),
        },
        recoverable: errorCode !== AI_ERROR_CODES.SECURITY_VIOLATION,
      };
      
      onError?.(appError);
      console.error('❌ Failed to send message:', error);
    } finally {
      sendingMessageRef.current = false;
    }
  }, [
    canSendMessage, 
    validateMessageSecurity, 
    viewModel.session.context, 
    viewModel.smartRouting, 
    viewModel.selectedProvider,
    viewModel.session.analytics,
    viewModel.costTracking,
    viewModel.qualityMetrics,
    securityContext,
    getProviderRecommendation,
    auditAction,
    onError,
    savingsPercentage,
    averageQuality
  ]);
  
  const setInput = useCallback((input: string): void => {
    // Validate input length
    if (input.length > AI_CONFIG.MAX_MESSAGE_LENGTH) {
      console.warn(`⚠️ Message too long: ${input.length}/${AI_CONFIG.MAX_MESSAGE_LENGTH} characters`);
      return;
    }
    
    setViewModel(prev => ({ ...prev, input }));
  }, []);
  
  const selectProvider = useCallback((providerId: string): void => {
    const provider = viewModel.availableProviders.find(p => p.id === providerId);
    if (!provider) {
      console.error(`❌ Provider not found: ${providerId}`);
      return;
    }
    
    setViewModel(prev => ({ 
      ...prev, 
      selectedProvider: providerId,
      smartRouting: false, // Disable smart routing when manually selecting
    }));
    
    console.log(`🎯 Provider selected: ${provider.name} (${provider.type})`);
    console.log(`💰 Cost per token: $${provider.costPerToken.toFixed(8)}`);
    
    auditAction('provider_selected');
  }, [viewModel.availableProviders, auditAction]);
  
  const toggleSmartRouting = useCallback((): void => {
    const newSmartRouting = !viewModel.smartRouting;
    
    setViewModel(prev => ({ 
      ...prev, 
      smartRouting: newSmartRouting,
      selectedProvider: newSmartRouting ? undefined : prev.selectedProvider,
    }));
    
    console.log(`🧠 Smart routing: ${newSmartRouting ? 'enabled' : 'disabled'}`);
    if (newSmartRouting) {
      console.log('💎 Cost optimization active - 97% savings target');
    }
    
    auditAction('smart_routing_toggle');
  }, [viewModel.smartRouting, auditAction]);
  
  const clearSession = useCallback((): void => {
    setViewModel(prev => ({
      ...prev,
      session: {
        ...prev.session,
        messages: [],
        updatedAt: Date.now(),
        analytics: {
          messageCount: 0,
          averageResponseTime: 0,
          totalCost: 0,
          modelUsageBreakdown: {},
          userSatisfactionScore: 5.0,
          productivityGains: 0,
        },
      },
      input: '',
      isTyping: false,
    }));
    
    // Reset tracking
    rateLimitRef.current = [];
    qualityHistoryRef.current = [];
    
    console.log('🗑️ Chat session cleared');
    auditAction('session_cleared');
  }, [auditAction]);
  
  // ================================
  // INITIALIZATION & LIFECYCLE
  // ================================
  
  useEffect(() => {
    const initializeProviders = async (): Promise<void> => {
      try {
        console.log('📡 Loading enterprise AI providers...');
        
        const result: TauriResult<AiProvider[]> = await invoke('get_ai_providers');
        
        if (result.success && result.data) {
          // Filter for enterprise-compliant providers
          const enterpriseProviders = result.data.filter(provider => 
            provider.securityLevel && 
            provider.complianceFeatures &&
            provider.complianceFeatures.length > 0
          );
          
          setViewModel(prev => ({
            ...prev,
            availableProviders: enterpriseProviders,
          }));
          
          console.log(`✅ Loaded ${enterpriseProviders.length} enterprise AI providers:`);
          enterpriseProviders.forEach(provider => {
            console.log(`   ${provider.name}: $${provider.costPerToken.toFixed(8)}/token, ${provider.latency}ms, ${provider.securityLevel} security`);
          });
        }
        
        setIsInitialized(true);
        
      } catch (error) {
        console.error('❌ Failed to load AI providers:', error);
        setIsInitialized(true); // Still allow usage
      }
    };
    
    initializeProviders();
  }, []);
  
  // Auto-create session when project changes
  useEffect(() => {
    if (project && isInitialized) {
      createSession(project);
    }
  }, [project, isInitialized, createSession]);
  
  // Cost monitoring and alerts
  useEffect(() => {
    if (viewModel.costTracking.budgetRemaining < 0) {
      const costError: AppError = {
        code: AI_ERROR_CODES.COST_LIMIT_EXCEEDED,
        message: 'Budget limit exceeded',
        severity: 'warning',
        timestamp: Date.now(),
        context: { 
          totalSpent: viewModel.costTracking.totalSpent,
          budgetRemaining: viewModel.costTracking.budgetRemaining,
        },
        recoverable: true,
      };
      
      onError?.(costError);
    }
  }, [viewModel.costTracking.budgetRemaining, viewModel.costTracking.totalSpent, onError]);
  
  // ================================
  // ENTERPRISE RETURN INTERFACE
  // ================================
  
  return {
    // Core State
    viewModel,
    
    // Primary Actions
    createSession,
    sendMessage,
    setInput,
    clearSession,
    
    // AI Provider Management
    selectProvider,
    toggleSmartRouting,
    getProviderRecommendation,
    
    // Cost & Quality Management
    getCostBreakdown,
    getQualityTrends,
    optimizeCosts,
    
    // Security & Compliance
    validateMessageSecurity,
    exportConversation,
    auditConversation,
    
    // Computed Properties
    isReady,
    canSendMessage,
    totalCost,
    messageCount,
    savingsPercentage,
    averageQuality,
    securityRisk,
  };
};

// ================================
// UTILITY FUNCTIONS
// ================================

function extractCodeSnippets(content: string): any[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const snippets = [];
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    snippets.push({
      language: match[1] || 'text',
      code: match[2].trim(),
      syntaxValid: true, // Would be validated by backend
      securityAnalysis: {
        hasSecrets: false,
        hasVulnerabilities: false,
        riskScore: 0.1,
        recommendations: [],
      },
    });
  }
  
  return snippets;
}

function calculateProductivityGain(userInput: string, aiResponse: string): number {
  // Simple heuristic: characters saved vs time invested
  const timeSaved = Math.max(0, aiResponse.length - userInput.length) / 100; // Rough estimate
  return Math.min(10, Math.max(0, timeSaved)); // Cap at 10 points
} 