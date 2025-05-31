// Syntari AI IDE - Cost Tracking Service
// Extracted from useChatViewModel.ts for better separation of concerns

import type { 
  CostTracker, 
  CostOptimizationMetrics, 
  AiResponse, 
  AiProvider 
} from '../types';

interface CostHistoryEntry {
  timestamp: number;
  cost: number;
  provider: string;
  wasOptimal: boolean;
  savings: number;
}

export class CostTrackingService {
  private static instance: CostTrackingService;
  private costHistory: CostHistoryEntry[] = [];
  private totalSpent = 0;
  private totalSavings = 0;
  private budget = 1000; // Default $1000 budget

  static getInstance(): CostTrackingService {
    if (!CostTrackingService.instance) {
      CostTrackingService.instance = new CostTrackingService();
    }
    return CostTrackingService.instance;
  }

  // Track a new cost entry
  trackCost(
    response: AiResponse, 
    providers: readonly AiProvider[], 
    wasSmartRouted: boolean
  ): void {
    this.totalSpent += response.cost;

    // Calculate potential savings
    const mostExpensive = providers
      .filter(p => p.isAvailable)
      .sort((a, b) => b.costPerToken - a.costPerToken)[0];
    
    const potentialCost = mostExpensive 
      ? response.tokenUsage.total * mostExpensive.costPerToken 
      : response.cost;
    
    const savings = wasSmartRouted ? Math.max(0, potentialCost - response.cost) : 0;
    this.totalSavings += savings;

    // Add to history
    this.costHistory.push({
      timestamp: response.timestamp,
      cost: response.cost,
      provider: response.provider,
      wasOptimal: savings > 0,
      savings,
    });

    // Keep only last 1000 entries
    if (this.costHistory.length > 1000) {
      this.costHistory = this.costHistory.slice(-1000);
    }
  }

  // Get current cost tracker state
  getCostTracker(): CostTracker {
    const monthlyProjection = this.calculateMonthlyProjection();
    const optimization = this.calculateOptimizationMetrics();

    return {
      totalSpent: this.totalSpent,
      savingsFromRouting: this.totalSavings,
      costPerRequest: this.calculateAverageCostPerRequest(),
      budgetRemaining: Math.max(0, this.budget - this.totalSpent),
      monthlyProjection,
      optimization,
    };
  }

  // Calculate optimization metrics
  private calculateOptimizationMetrics(): CostOptimizationMetrics {
    if (this.costHistory.length === 0) {
      return {
        routingAccuracy: 0.95,
        cheapestModelUsage: 0.8,
        expensiveModelAvoidance: 0.9,
        savingsPercentage: 0.97,
      };
    }

    const recentEntries = this.costHistory.slice(-100); // Last 100 entries
    const optimalChoices = recentEntries.filter(entry => entry.wasOptimal).length;
    const routingAccuracy = optimalChoices / recentEntries.length;

    // Count usage of different model types
    const providerCounts = recentEntries.reduce((acc, entry) => {
      acc[entry.provider] = (acc[entry.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const geminiUsage = (providerCounts['gemini-pro'] || 0) / recentEntries.length;
    const expensiveModels = ['gpt-4', 'claude-3'];
    const expensiveUsage = expensiveModels.reduce((sum, model) => {
      return sum + (providerCounts[model] || 0);
    }, 0) / recentEntries.length;

    const totalPotentialCost = this.totalSpent + this.totalSavings;
    const savingsPercentage = totalPotentialCost > 0 
      ? this.totalSavings / totalPotentialCost 
      : 0;

    return {
      routingAccuracy,
      cheapestModelUsage: geminiUsage,
      expensiveModelAvoidance: 1 - expensiveUsage,
      savingsPercentage,
    };
  }

  // Calculate monthly projection based on usage trends
  private calculateMonthlyProjection(): number {
    if (this.costHistory.length < 2) return this.totalSpent * 30;

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentCosts = this.costHistory
      .filter(entry => entry.timestamp > dayAgo)
      .reduce((sum, entry) => sum + entry.cost, 0);

    // Project daily cost over a month
    return recentCosts * 30;
  }

  // Calculate average cost per request
  private calculateAverageCostPerRequest(): number {
    if (this.costHistory.length === 0) return 0;
    return this.totalSpent / this.costHistory.length;
  }

  // Get cost breakdown by provider
  getCostBreakdown(): Record<string, number> {
    return this.costHistory.reduce((acc, entry) => {
      acc[entry.provider] = (acc[entry.provider] || 0) + entry.cost;
      return acc;
    }, {} as Record<string, number>);
  }

  // Set budget
  setBudget(amount: number): void {
    this.budget = amount;
  }

  // Get budget
  getBudget(): number {
    return this.budget;
  }

  // Check if over budget
  isOverBudget(): boolean {
    return this.totalSpent > this.budget;
  }

  // Get budget utilization percentage
  getBudgetUtilization(): number {
    return this.budget > 0 ? (this.totalSpent / this.budget) * 100 : 0;
  }

  // Reset cost tracking
  reset(): void {
    this.costHistory = [];
    this.totalSpent = 0;
    this.totalSavings = 0;
  }

  // Export cost data
  exportCostData(): string {
    const data = {
      totalSpent: this.totalSpent,
      totalSavings: this.totalSavings,
      budget: this.budget,
      costHistory: this.costHistory,
      breakdown: this.getCostBreakdown(),
      optimization: this.calculateOptimizationMetrics(),
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }
} 