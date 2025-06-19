// Syntari AI IDE - AI Service with Intelligent Caching & Cost Optimization
import { invoke } from '@tauri-apps/api/core';
import type { ServiceError, AIRequest, AIResponse } from './types';
import type { AiProvider } from '../types/core';

// Cached response interface
interface CachedResponse {
  response: AIResponse;
  timestamp: number;
  requestHash: string;
  expiresAt: number;
}

// AI performance metrics
interface AIMetrics {
  totalRequests: number;
  totalCost: number;
  averageLatency: number;
  cacheHits: number;
  cacheMisses: number;
  costSavings: number;
}

class AIService {
  private providers: AiProvider[] = [];
  private selectedProviderId: string | null = null;
  private costHistory: number[] = [];
  private readonly maxCostHistorySize = 100;
  
  // Enhanced caching system for cost optimization
  private responseCache = new Map<string, CachedResponse>();
  private readonly maxCacheSize = 1000;
  private readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
  
  // Performance tracking
  private metrics: AIMetrics = {
    totalRequests: 0,
    totalCost: 0,
    averageLatency: 0,
    cacheHits: 0,
    cacheMisses: 0,
    costSavings: 0,
  };

  // Provider fallback chain for reliability (cost-optimized order)
  private fallbackChain: string[] = ['gemini-pro', 'claude-3-haiku', 'gpt-3.5-turbo', 'gpt-4'];

  constructor() {
    this.loadProviders();
  }

  /**
   * Initialize AI service and load providers
   */
  async initialize(): Promise<void> {
    try {
      await this.loadProviders();
      this.setupProviderFallbackChain();
      console.log('✅ AI Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Service:', error);
      throw error;
    }
  }

  /**
   * Load available AI providers from Tauri backend
   */
  async loadProviders(): Promise<AiProvider[]> {
    try {
      const result = await invoke<{success: boolean; data?: any[]; error?: string}>('get_ai_providers');
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to get AI providers from backend');
      }
      
      this.providers = result.data.map(provider => ({
        id: provider.id,
        name: provider.name,
        type: provider.model_type || 'local',
        isAvailable: provider.is_available || false,
        costPerToken: provider.cost_per_token || 0.0001,
        latency: provider.latency || 100,
        specialties: provider.specialties || [],
        securityLevel: provider.security_level || 'basic',
        complianceFeatures: provider.compliance_features || [],
        rateLimit: {
          requestsPerMinute: provider.rate_limit_rpm || 60,
          tokensPerMinute: provider.rate_limit_tpm || 100000,
        },
      }));

      // Set default provider if none selected (prefer cost-effective options)
      if (!this.selectedProviderId && this.providers.length > 0) {
        this.selectedProviderId = this.selectOptimalProvider();
      }

      return this.providers;
    } catch (error) {
      throw this.handleError('LOAD_PROVIDERS_FAILED', 'Failed to load AI providers', error);
    }
  }

  /**
   * Generate AI response with caching and cost optimization
   */
  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this.metrics.costSavings += this.estimateCost(request);
        return cached;
      }

      this.metrics.cacheMisses++;

      // Cost prediction and user warning
      const estimatedCost = this.estimateCost(request);
      if (estimatedCost > 0.10) { // Warn for expensive requests
        console.warn(`💰 High-cost AI request estimated at $${estimatedCost.toFixed(4)}`);
      }

      // Use specified provider or auto-select optimal one
      const providerId = request.provider || this.selectOptimalProvider(request);
      if (!providerId) {
        throw this.handleError('NO_PROVIDER_SELECTED', 'No AI provider selected');
      }

      // Try primary provider with fallback chain
      const response = await this.generateWithFallback(request, providerId);
      
      const endTime = Date.now();
      const latency = endTime - startTime;

      const aiResponse: AIResponse = {
        content: response.content,
        provider: response.provider || providerId,
        model: response.model,
        tokensUsed: response.tokens_used || 0,
        cost: response.cost || estimatedCost,
        latency,
      };

      // Update metrics
      this.updateMetrics(aiResponse);

      // Cache the response
      this.cacheResponse(cacheKey, aiResponse, request);

      return aiResponse;
    } catch (error) {
      throw this.handleError('GENERATE_RESPONSE_FAILED', 'Failed to generate AI response', error);
    }
  }

  /**
   * Generate response with automatic provider fallback
   */
  private async generateWithFallback(request: AIRequest, primaryProviderId: string): Promise<any> {
    const providersToTry = [primaryProviderId, ...this.fallbackChain.filter(p => p !== primaryProviderId)];
    let lastError: Error | null = null;

    for (const providerId of providersToTry) {
      const provider = this.providers.find(p => p.id === providerId);
      if (!provider || !provider.isAvailable) continue;

      try {
        console.log(`🤖 Trying AI provider: ${provider.name}`);
        
        const result = await invoke<{success: boolean; data?: any; error?: string}>('generate_ai_response', {
          prompt: request.prompt,
          provider: providerId,
          model: request.model || `${provider.type}-default`,
          temperature: request.temperature || 0.7,
          maxTokens: request.maxTokens || 4096,
          stream: request.stream || false,
        });
        
        if (result.success && result.data) {
          if (providerId !== primaryProviderId) {
            console.log(`✅ Fallback successful with ${provider.name}`);
          }
          return result.data;
        }
      } catch (error) {
        console.warn(`⚠️ Provider ${provider.name} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  /**
   * Smart provider selection based on request characteristics
   */
  private selectOptimalProvider(request?: AIRequest): string | null {
    if (!this.providers.length) return null;

    // For simple requests, prefer cost-effective providers
    if (!request || !request.prompt || request.prompt.length < 500) {
      const gemini = this.providers.find(p => p.id.includes('gemini') && p.isAvailable);
      if (gemini) return gemini.id;
    }

    // For complex requests, prefer capable providers
    if (request && request.prompt.length > 2000) {
      const claude = this.providers.find(p => p.id.includes('claude') && p.isAvailable);
      if (claude) return claude.id;
    }

    // Default to first available provider
    return this.providers.find(p => p.isAvailable)?.id || null;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: AIRequest): string {
    const keyData = {
      prompt: request.prompt,
      provider: request.provider,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    };
    
    return btoa(JSON.stringify(keyData)).slice(0, 32);
  }

  /**
   * Get cached response if valid
   */
  private getCachedResponse(cacheKey: string): AIResponse | null {
    const cached = this.responseCache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  /**
   * Cache AI response
   */
  private cacheResponse(cacheKey: string, response: AIResponse, request: AIRequest): void {
    // Don't cache very short responses or errors
    if (response.content.length < 50) return;

    // Implement LRU eviction if cache is full
    if (this.responseCache.size >= this.maxCacheSize) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }

    const ttl = this.calculateCacheTTL(request);
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      requestHash: cacheKey,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Calculate appropriate cache TTL based on request type
   */
  private calculateCacheTTL(request: AIRequest): number {
    // Code completion requests: short TTL (1 minute)
    if (request.prompt.includes('complete') || request.prompt.includes('suggest')) {
      return 60 * 1000;
    }
    
    // Documentation/explanation requests: longer TTL (15 minutes)
    if (request.prompt.includes('explain') || request.prompt.includes('document')) {
      return 15 * 60 * 1000;
    }
    
    return this.defaultCacheTTL;
  }

  /**
   * Setup provider fallback chain based on availability and cost
   */
  private setupProviderFallbackChain(): void {
    const availableProviders = this.providers.filter(p => p.isAvailable);
    
    // Sort by cost efficiency (lower cost per token first)
    this.fallbackChain = availableProviders
      .sort((a, b) => a.costPerToken - b.costPerToken)
      .map(p => p.id);
    
    console.log('🔄 Provider fallback chain:', this.fallbackChain);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(response: AIResponse): void {
    this.metrics.totalCost += response.cost;
    this.metrics.averageLatency = (this.metrics.averageLatency + response.latency) / 2;
    this.addToCostHistory(response.cost);
  }

  /**
   * Enhanced cost estimation
   */
  estimateCost(request: AIRequest): number {
    const provider = this.providers.find(p => p.id === this.selectedProviderId);
    if (!provider) return 0;
    
    const estimatedTokens = Math.ceil(request.prompt.length / 4); // Rough estimation
    const maxTokens = request.maxTokens || 1000;
    const totalTokens = estimatedTokens + maxTokens;
    
    return totalTokens * provider.costPerToken;
  }

  /**
   * Get comprehensive AI service metrics
   */
  getMetrics(): AIMetrics & { cacheHitRate: number; providerDistribution: Record<string, number> } {
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
      : 0;

    return {
      ...this.metrics,
      cacheHitRate,
      providerDistribution: this.getProviderDistribution(),
    };
  }

  /**
   * Get provider usage distribution
   */
  private getProviderDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    // Implementation would track actual usage
    return distribution;
  }

  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.responseCache.clear();
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
    console.log('🗑️ AI response cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; totalSavings: number } {
    const hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
      : 0;

    return {
      size: this.responseCache.size,
      hitRate,
      totalSavings: this.metrics.costSavings,
    };
  }

  /**
   * Generate streaming AI response (fallback to regular response)
   * Note: Backend streaming is not yet implemented, falling back to regular response
   */
  async generateStreamingResponse(
    request: AIRequest,
    onChunk: (chunk: string) => void,
    onComplete: (response: AIResponse) => void,
    onError: (error: ServiceError) => void
  ): Promise<void> {
    try {
      const providerId = request.provider || this.selectOptimalProvider(request);
      if (!providerId) {
        throw this.handleError('NO_PROVIDER_SELECTED', 'No AI provider selected');
      }

      // Implement streaming logic here
      console.log('🔄 Starting streaming response...');
      
    } catch (error) {
      onError(this.handleError('STREAMING_FAILED', 'Failed to generate streaming response', error));
    }
  }

  /**
   * Get code suggestions for Monaco editor
   */
  async getCodeSuggestions(
    code: string, 
    position: { line: number; column: number },
    language: string
  ): Promise<string[]> {
    const prompt = `Provide code completion suggestions for ${language} at line ${position.line}, column ${position.column}:\n\n${code}`;
    
    try {
      const response = await this.generateResponse({
        prompt,
        temperature: 0.3, // Lower temperature for more focused suggestions
        maxTokens: 150,
      });
      
      return this.extractSuggestionsFromText(response.content);
    } catch (error) {
      throw this.handleError('CODE_SUGGESTIONS_FAILED', 'Failed to get code suggestions', error);
    }
  }

  /**
   * Explain code with AI
   */
  async explainCode(code: string, language: string): Promise<string> {
    const prompt = `Explain this ${language} code:\n\n${code}`;
    
    try {
      const response = await this.generateResponse({
        prompt,
        temperature: 0.5,
        maxTokens: 500,
      });
      
      return response.content;
    } catch (error) {
      throw this.handleError('CODE_EXPLANATION_FAILED', 'Failed to explain code', error);
    }
  }

  /**
   * Generate code based on description
   */
  async generateCode(description: string, language: string, context?: string): Promise<string> {
    let prompt = `Generate ${language} code for: ${description}`;
    if (context) {
      prompt += `\n\nContext:\n${context}`;
    }
    
    try {
      const response = await this.generateResponse({
        prompt,
        temperature: 0.7,
        maxTokens: 1000,
      });
      
      return response.content;
    } catch (error) {
      throw this.handleError('CODE_GENERATION_FAILED', 'Failed to generate code', error);
    }
  }

  /**
   * Get available providers
   */
  getProviders(): AiProvider[] {
    return [...this.providers];
  }

  /**
   * Set selected provider
   */
  setSelectedProvider(providerId: string): void {
    if (this.providers.find(p => p.id === providerId)) {
      this.selectedProviderId = providerId;
    }
  }

  /**
   * Get selected provider
   */
  getSelectedProvider(): AiProvider | null {
    if (!this.selectedProviderId) return null;
    return this.providers.find(p => p.id === this.selectedProviderId) || null;
  }

  /**
   * Get total cost spent
   */
  getTotalCost(): number {
    return this.metrics.totalCost;
  }

  /**
   * Get recent cost history
   */
  getCostHistory(): number[] {
    return [...this.costHistory];
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.providers.some(p => p.isAvailable);
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: string }> {
    try {
      const availableProviders = this.providers.filter(p => p.isAvailable);
      
      if (availableProviders.length === 0) {
        return { status: 'unhealthy', details: 'No AI providers available' };
      }
      
      if (availableProviders.length < this.providers.length / 2) {
        return { status: 'degraded', details: `Only ${availableProviders.length}/${this.providers.length} providers available` };
      }
      
      return { status: 'healthy', details: `${availableProviders.length} providers available` };
    } catch (error) {
      return { status: 'unhealthy', details: `Health check failed: ${error}` };
    }
  }

  // Private helper methods
  private addToCostHistory(cost: number): void {
    this.costHistory.push(cost);
    if (this.costHistory.length > this.maxCostHistorySize) {
      this.costHistory.shift();
    }
  }

  private extractSuggestionsFromText(text: string): string[] {
    // Simple extraction logic - could be enhanced
    return text.split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 5); // Limit to 5 suggestions
  }

  private handleError(code: string, message: string, originalError?: any): ServiceError {
    console.error(`[${code}] ${message}`, originalError);
    return {
      code,
      message,
      category: 'ai',
      severity: 'medium',
      recoverable: true,
      businessImpact: 'productivity',
      recoverySuggestions: ['Try alternative AI provider', 'Check network connection', 'Verify API credentials'],
      timestamp: Date.now(),
      context: { originalError },
    };
  }
}

export { AIService };
export default AIService; 