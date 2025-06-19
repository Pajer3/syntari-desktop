// Syntari AI IDE - Enterprise Chat Service
// Professional chat service with AI routing and enterprise features

import type {
  ChatSession,
  AiProvider,
  AiResponse,
  ProjectContext,
  SecurityContext,
} from '../types';

// Configuration
const AI_CONFIG = {
  MAX_MESSAGE_LENGTH: 8000,
  MAX_CONVERSATION_LENGTH: 100,
  COST_OPTIMIZATION_THRESHOLD: 0.01,
  QUALITY_THRESHOLD: 0.8,
  RESPONSE_TIMEOUT_MS: 30000,
  RATE_LIMIT_PER_MINUTE: 60,
  SECURITY_SCAN_TIMEOUT: 5000,
} as const;

// Backend types that come from Tauri commands
interface BackendConsensusResult {
  readonly id: string;
  readonly response: string;
  readonly confidence: number;
  readonly provider_results: readonly BackendProviderResponse[];
  readonly total_cost: number;
  readonly processing_time_ms: number;
  readonly routing_decision: string;
  readonly quality_metrics: {
    readonly accuracy_score: number;
    readonly coherence_score: number;
    readonly relevance_score: number;
    readonly cost_efficiency: number;
  };
}

interface BackendProviderResponse {
  readonly provider_id: string;
  readonly response: string;
  readonly confidence: number;
  readonly cost: number;
  readonly latency_ms: number;
  readonly tokens_used: number;
}

interface ProviderRecommendationOptions {
  readonly preferCostOptimization?: boolean;
  readonly minimumQuality?: number;
  readonly maxBudget?: number;
  readonly excludeProviders?: readonly string[];
}

export class ChatService {
  private static instance: ChatService;
  private providers: readonly AiProvider[] = [];
  private rateLimit: number[] = [];
  private providerCache = new Map<string, AiProvider>();
  private isInitialized = false;

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // ================================
  // PROVIDER MANAGEMENT (CENTRALIZED)
  // ================================

  async initializeProviders(): Promise<readonly AiProvider[]> {
    if (this.isInitialized && this.providers.length > 0) {
      return this.providers;
    }

    try {
      // Use real backend providers instead of mocks
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{
        success: boolean;
        data?: AiProvider[];
        error?: string;
      }>('get_ai_providers');

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to get providers from backend');
      }

      this.providers = result.data;
      this.rebuildProviderCache();
      this.isInitialized = true;
      
      console.log(`✅ Loaded ${this.providers.length} AI providers:`, 
        this.providers.map(p => `${p.name} (${p.type})`));
      
      return this.providers;
    } catch (error) {
      console.error('Error initializing providers:', error);
      
      // Fallback to basic providers if backend unavailable
      const fallbackProviders: AiProvider[] = [
        {
          id: 'syntari-consensus',
          name: 'Syntari AI Consensus',
          type: 'consensus',
          isAvailable: true,
          costPerToken: 0.00000037,
          latency: 800,
          specialties: ['consensus', 'cost-effective', 'quality-assured'],
          securityLevel: 'enterprise',
          complianceFeatures: ['SOC2', 'GDPR'],
          rateLimit: {
            requestsPerMinute: 60,
            tokensPerMinute: 50000,
          },
        },
      ];

      this.providers = fallbackProviders;
      this.rebuildProviderCache();
      this.isInitialized = true;
      
      return this.providers;
    }
  }

  // Rebuild provider cache for fast lookups
  private rebuildProviderCache(): void {
    this.providerCache.clear();
    this.providers.forEach(provider => {
      this.providerCache.set(provider.id, provider);
    });
  }

  // Get provider by ID (cached lookup)
  getProvider(providerId: string): AiProvider | undefined {
    return this.providerCache.get(providerId);
  }

  // Get available providers
  getAvailableProviders(): readonly AiProvider[] {
    return this.providers.filter(p => p.isAvailable);
  }

  // Get providers by type
  getProvidersByType(type: AiProvider['type']): readonly AiProvider[] {
    return this.providers.filter(p => p.type === type && p.isAvailable);
  }

  // ================================
  // SMART PROVIDER ROUTING (UNIFIED)
  // ================================

  getProviderRecommendation(
    prompt: string, 
    options: ProviderRecommendationOptions = {}
  ): string | null {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) return null;

    // Filter excluded providers
    const candidateProviders = options.excludeProviders 
      ? availableProviders.filter(p => !options.excludeProviders!.includes(p.id))
      : availableProviders;

    if (candidateProviders.length === 0) return null;

    const promptLower = prompt.toLowerCase();
    const promptLength = prompt.length;
    const hasCodeBlocks = /```/.test(prompt);
    const hasMathContent = /\$\$|\\\(|\\\[/.test(prompt);
    const isComplexQuery = promptLength > 100 || hasCodeBlocks || hasMathContent;

    // Apply recommendation logic with unified strategy
    const recommendation = this.selectOptimalProvider(
      candidateProviders,
      promptLower,
      isComplexQuery,
      options
    );

    if (recommendation) {
      console.log(`🎯 Provider recommendation: ${recommendation.name} for "${prompt.substring(0, 50)}..."`);
      console.log(`   Reason: ${this.getRecommendationReason(recommendation, promptLower, isComplexQuery, options)}`);
    }

    return recommendation?.id || null;
  }

  private selectOptimalProvider(
    providers: readonly AiProvider[],
    promptLower: string,
    isComplexQuery: boolean,
    options: ProviderRecommendationOptions
  ): AiProvider | null {
    // Priority 1: Cost optimization for simple queries
    if (!isComplexQuery && options.preferCostOptimization !== false) {
      const gemini = providers.find(p => p.type === 'gemini');
      if (gemini) return gemini;
      
      const consensus = providers.find(p => p.type === 'consensus');
      if (consensus) return consensus;
    }

    // Priority 2: Code-related queries -> Claude
    if (this.isCodeRelated(promptLower)) {
      const claude = providers.find(p => p.type === 'claude');
      if (claude && this.meetsBudgetRequirements(claude, options)) return claude;
    }
    
    // Priority 3: Creative tasks -> GPT-4
    if (this.isCreativeTask(promptLower)) {
      const openai = providers.find(p => p.type === 'openai');
      if (openai && this.meetsBudgetRequirements(openai, options)) return openai;
    }
    
    // Priority 4: Complex queries -> best available
    if (isComplexQuery) {
      const bestForComplex = providers
        .filter(p => this.meetsBudgetRequirements(p, options))
        .sort((a, b) => this.calculateComplexityScore(b) - this.calculateComplexityScore(a))[0];
      
      if (bestForComplex) return bestForComplex;
    }
    
    // Fallback: cheapest available provider that meets requirements
    const cheapest = providers
      .filter(p => this.meetsBudgetRequirements(p, options))
      .sort((a, b) => a.costPerToken - b.costPerToken)[0];
    
    return cheapest || null;
  }

  private isCodeRelated(promptLower: string): boolean {
    const codeKeywords = ['code', 'function', 'debug', 'implement', 'refactor', 'class', 'method', 'variable', 'syntax'];
    return codeKeywords.some(keyword => promptLower.includes(keyword));
  }

  private isCreativeTask(promptLower: string): boolean {
    const creativeKeywords = ['creative', 'story', 'design', 'write', 'generate', 'brainstorm', 'idea'];
    return creativeKeywords.some(keyword => promptLower.includes(keyword));
  }

  private calculateComplexityScore(provider: AiProvider): number {
    // Higher score = better for complex tasks
    let score = 0;
    
    if (provider.type === 'claude') score += 3; // Excellent for reasoning
    if (provider.type === 'openai') score += 2; // Good general capability
    if (provider.specialties.includes('reasoning')) score += 2;
    if (provider.specialties.includes('code')) score += 1;
    if (provider.securityLevel === 'enterprise') score += 1;
    
    return score;
  }

  private meetsBudgetRequirements(provider: AiProvider, options: ProviderRecommendationOptions): boolean {
    if (!options.maxBudget) return true;
    
    // Estimate cost for typical query (1000 tokens)
    const estimatedCost = provider.costPerToken * 1000;
    return estimatedCost <= options.maxBudget;
  }

  private getRecommendationReason(
    provider: AiProvider,
    promptLower: string,
    isComplexQuery: boolean,
    _options: ProviderRecommendationOptions
  ): string {
    if (this.isCodeRelated(promptLower) && provider.type === 'claude') {
      return 'Claude optimized for code tasks';
    }
    if (this.isCreativeTask(promptLower) && provider.type === 'openai') {
      return 'GPT-4 optimized for creative tasks';
    }
    if (!isComplexQuery && (provider.type === 'gemini' || provider.type === 'consensus')) {
      return 'Cost optimization for simple query';
    }
    if (isComplexQuery) {
      return 'Best available for complex reasoning';
    }
    return 'Cheapest available option';
  }

  // ================================
  // SESSION MANAGEMENT
  // ================================

  async createSession(project: ProjectContext): Promise<string> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In real app, this would create session in backend
      console.log('Creating chat session:', sessionId, 'for project:', project.rootPath);
      
      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create chat session');
    }
  }

  // ================================
  // MESSAGE SENDING
  // ================================

  async sendMessage(
    sessionId: string,
    content: string,
    context: ProjectContext,
    providerId?: string,
    securityContext?: SecurityContext
  ): Promise<AiResponse> {
    // Rate limiting check
    if (this.isRateLimited()) {
      throw new Error('Rate limit exceeded. Please wait before sending another message.');
    }

    // Security validation
    if (!this.validateMessageSecurity(content)) {
      throw new Error('Message contains potentially sensitive information.');
    }

    // Add to rate limit tracking
    this.addToRateLimit();

    try {
      // Create AI request for the backend
      const request = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        prompt: content,
        context: {
          current_file: context.openFiles[0] || null,
          language: this.detectLanguage(context),
          selected_text: null, // Could be enhanced later
        },
        timestamp: Date.now(),
        sessionId,
        securityContext,
        provider: providerId,
        maxTokens: 4000,
        temperature: 0.7,
      };

      // Call the real AI backend that integrates with the CLI system
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{
        success: boolean;
        data?: BackendConsensusResult;
        error?: string;
      }>('generate_ai_response', { request });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'AI response generation failed');
      }

      const consensusResult = result.data;

      // Convert backend response to frontend format
      const aiResponse: AiResponse = {
        id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requestId: request.id,
        provider: consensusResult.provider_results[0]?.provider_id || 'unknown',
        content: consensusResult.response,
        confidence: consensusResult.confidence,
        cost: consensusResult.total_cost,
        responseTime: consensusResult.processing_time_ms,
        timestamp: Date.now(),
        tokenUsage: {
          prompt: consensusResult.provider_results[0]?.tokens_used || 0,
          completion: Math.ceil(consensusResult.response.length / 4), // Estimate
          total: (consensusResult.provider_results[0]?.tokens_used || 0) + Math.ceil(consensusResult.response.length / 4),
        },
        qualityScore: consensusResult.quality_metrics.accuracy_score,
      };

      return aiResponse;

    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error instanceof Error ? error : new Error('Failed to send message');
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  // Helper function to detect language from project context
  private detectLanguage(context: ProjectContext): string {
    if (context.openFiles.length > 0) {
      const file = context.openFiles[0];
      const extension = file.path.split('.').pop()?.toLowerCase();
      
      const languageMap: Record<string, string> = {
        'ts': 'typescript',
        'tsx': 'tsx', 
        'js': 'javascript',
        'jsx': 'jsx',
        'rs': 'rust',
        'py': 'python',
        'go': 'go',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cs': 'csharp',
        'html': 'html',
        'css': 'css',
        'md': 'markdown',
        'json': 'json',
      };
      
      return languageMap[extension || ''] || 'text';
    }
    
    return 'text';
  }

  // Security validation
  private validateMessageSecurity(content: string): boolean {
    const securityPatterns = [
      /api[_-]?key/i,
      /password/i,
      /secret/i,
      /token/i,
      /credential/i,
      /private[_-]?key/i,
    ];

    return !securityPatterns.some(pattern => pattern.test(content));
  }

  // Rate limiting
  private isRateLimited(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old entries
    this.rateLimit = this.rateLimit.filter(timestamp => timestamp > oneMinuteAgo);
    
    return this.rateLimit.length >= AI_CONFIG.RATE_LIMIT_PER_MINUTE;
  }

  private addToRateLimit(): void {
    this.rateLimit.push(Date.now());
  }

  // Cost calculation
  calculateCost(content: string, provider: AiProvider): number {
    const estimatedTokens = Math.ceil(content.length / 4) * 2; // Input + output estimation
    return estimatedTokens * provider.costPerToken;
  }

  // Export conversation
  async exportConversation(session: ChatSession): Promise<string> {
    try {
      const exportData = {
        sessionId: session.id,
        name: session.name,
        createdAt: new Date(session.createdAt).toISOString(),
        messages: session.messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: new Date(msg.timestamp).toISOString(),
          metadata: msg.metadata,
        })),
        analytics: session.analytics,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting conversation:', error);
      throw new Error('Failed to export conversation');
    }
  }

  // ================================
  // PROVIDER ANALYTICS
  // ================================

  getProviderStats(): Record<string, { usage: number; cost: number; avgLatency: number }> {
    // TODO: Implement usage tracking with backend integration
    // Would track: request counts, total costs, average latencies per provider
    return {};
  }

  getCostBreakdown(): Record<string, number> {
    // TODO: Implement cost analysis with backend data
    // Would return: total costs by provider for budgeting
    return {};
  }

  getUsageMetrics(): ChatUsageMetrics {
    return {
      totalConversations: this.conversations.length,
      totalMessages: this.getTotalMessageCount(),
      averageResponseTime: this.calculateAverageResponseTime(),
      totalCost: this.getTotalCost(),
    };
  }

  getCostAnalysis(): ChatCostAnalysis {
    const metrics = this.getUsageMetrics();
    const averageCostPerMessage = metrics.totalMessages > 0 ? metrics.totalCost / metrics.totalMessages : 0;
    
    return {
      totalCost: metrics.totalCost,
      averageCostPerMessage,
      costByProvider: this.getCostByProvider(),
      dailyCosts: this.getDailyCosts(),
    };
  }
} 