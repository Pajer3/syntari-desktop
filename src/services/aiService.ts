// Syntari AI IDE - AI Service
// Bridges UI components with Tauri backend AI capabilities

import { invoke } from '@tauri-apps/api/core';
import type { 
  AIRequest, 
  AIResponse, 
  ServiceError 
} from './types';
import type { AiProvider } from '../types/core';

class AIService {
  private providers: AiProvider[] = [];
  private selectedProviderId: string | null = null;
  private costHistory: number[] = [];
  private readonly maxCostHistorySize = 100;

  /**
   * Initialize AI service and load providers
   */
  async initialize(): Promise<void> {
    try {
      await this.loadProviders();
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
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
        model: provider.model,
        enabled: provider.enabled,
        costPerToken: provider.cost_per_token || 0.0001,
        maxTokens: provider.max_tokens || 4096,
      }));

      // Set default provider if none selected
      if (!this.selectedProviderId && this.providers.length > 0) {
        this.selectedProviderId = this.providers[0].id;
      }

      return this.providers;
    } catch (error) {
      throw this.handleError('LOAD_PROVIDERS_FAILED', 'Failed to load AI providers', error);
    }
  }

  /**
   * Generate AI response
   */
  async generateResponse(request: AIRequest): Promise<AIResponse> {
    try {
      const startTime = Date.now();
      
      // Use specified provider or default
      const providerId = request.provider || this.selectedProviderId;
      if (!providerId) {
        throw this.handleError('NO_PROVIDER_SELECTED', 'No AI provider selected');
      }

      const provider = this.providers.find(p => p.id === providerId);
      if (!provider) {
        throw this.handleError('PROVIDER_NOT_FOUND', `Provider ${providerId} not found`);
      }

      // Call Tauri backend
      const result = await invoke<{success: boolean; data?: any; error?: string}>('generate_ai_response', {
        prompt: request.prompt,
        provider: providerId,
        model: request.model || provider.model,
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || provider.maxTokens,
        stream: request.stream || false,
      });
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate AI response');
      }
      
      const response = result.data;

      const endTime = Date.now();
      const latency = endTime - startTime;

      const aiResponse: AIResponse = {
        content: response.content,
        provider: response.provider || providerId,
        model: response.model || provider.model,
        tokensUsed: response.tokens_used || 0,
        cost: response.cost || 0,
        latency,
      };

      // Track cost
      this.addToCostHistory(aiResponse.cost);

      return aiResponse;
    } catch (error) {
      throw this.handleError('GENERATE_RESPONSE_FAILED', 'Failed to generate AI response', error);
    }
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
      // Fallback: Use regular response and simulate streaming
      const response = await this.generateResponse(request);
      
      // Simulate streaming by chunking the response
      const content = response.content;
      const chunkSize = Math.max(1, Math.floor(content.length / 10)); // 10 chunks
      
      for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.slice(i, i + chunkSize);
        onChunk(chunk);
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      onComplete(response);
    } catch (error) {
      onError(this.handleError('GENERATE_STREAMING_FAILED', 'Failed to generate streaming response', error));
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
    try {
      const prompt = `
Given this ${language} code and cursor position, provide relevant code completion suggestions:

Code:
\`\`\`${language}
${code}
\`\`\`

Cursor at line ${position.line}, column ${position.column}.
Provide 3-5 relevant completion suggestions as a JSON array of strings.
`;

      const response = await this.generateResponse({
        prompt,
        temperature: 0.3, // Lower temperature for more consistent suggestions
        maxTokens: 500,
      });

      try {
        // Try to parse JSON response
        const suggestions = JSON.parse(response.content);
        return Array.isArray(suggestions) ? suggestions : [];
      } catch {
        // Fallback: extract suggestions from text
        return this.extractSuggestionsFromText(response.content);
      }
    } catch (error) {
      console.error('Failed to get code suggestions:', error);
      return [];
    }
  }

  /**
   * Explain code with AI
   */
  async explainCode(code: string, language: string): Promise<string> {
    try {
      const prompt = `
Explain this ${language} code in a clear and concise way:

\`\`\`${language}
${code}
\`\`\`

Provide an explanation that covers:
1. What the code does
2. Key concepts or patterns used
3. Any potential improvements or concerns
`;

      const response = await this.generateResponse({
        prompt,
        temperature: 0.5,
        maxTokens: 1000,
      });

      return response.content;
    } catch (error) {
      throw this.handleError('EXPLAIN_CODE_FAILED', 'Failed to explain code', error);
    }
  }

  /**
   * Generate code based on description
   */
  async generateCode(description: string, language: string, context?: string): Promise<string> {
    try {
      let prompt = `Generate ${language} code for: ${description}`;
      
      if (context) {
        prompt += `\n\nContext:\n${context}`;
      }

      prompt += `\n\nProvide clean, well-commented code that follows best practices.`;

      const response = await this.generateResponse({
        prompt,
        temperature: 0.7,
        maxTokens: 2000,
      });

      return response.content;
    } catch (error) {
      throw this.handleError('GENERATE_CODE_FAILED', 'Failed to generate code', error);
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
    return this.selectedProviderId ? 
      this.providers.find(p => p.id === this.selectedProviderId) || null : 
      null;
  }

  /**
   * Get total cost spent
   */
  getTotalCost(): number {
    return this.costHistory.reduce((sum, cost) => sum + cost, 0);
  }

  /**
   * Get recent cost history
   */
  getCostHistory(): number[] {
    return [...this.costHistory];
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(request: AIRequest): number {
    const provider = request.provider ? 
      this.providers.find(p => p.id === request.provider) :
      this.getSelectedProvider();
    
    if (!provider) return 0;

    // Rough estimation based on prompt length
    const estimatedTokens = Math.ceil(request.prompt.length / 4) + (request.maxTokens || 500);
    return estimatedTokens * provider.costPerToken;
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.providers.length > 0 && this.selectedProviderId !== null;
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: string }> {
    try {
      // Basic connectivity test
      // const testResponse = await this.generateResponse({  // Removed unused variable
      await this.generateResponse({
        prompt: 'Hello',
        maxTokens: 5,
      });
      
      return {
        status: 'healthy',
        details: 'All AI providers responsive'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: `AI services unavailable: ${error}`
      };
    }
  }

  // Private helper methods
  private addToCostHistory(cost: number): void {
    this.costHistory.push(cost);
    if (this.costHistory.length > this.maxCostHistorySize) {
      this.costHistory = this.costHistory.slice(-this.maxCostHistorySize);
    }
  }

  private extractSuggestionsFromText(text: string): string[] {
    // Simple extraction of suggestions from text response
    const lines = text.split('\n').filter(line => line.trim());
    const suggestions: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < 100) {
        // Remove common prefixes
        const cleaned = trimmed
          .replace(/^[-*•]\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .replace(/^[`"']|[`"']$/g, '');
        
        if (cleaned.length > 2) {
          suggestions.push(cleaned);
        }
      }
    }
    
    return suggestions.slice(0, 5);
  }

  private handleError(code: string, message: string, originalError?: any): ServiceError {
    console.error(`[AIService] ${code}: ${message}`, originalError);
    return {
      code,
      message,
      details: originalError,
    };
  }
}

// Export singleton instance
export const aiService = new AIService(); 