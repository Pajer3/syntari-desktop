// Syntari AI IDE - Chat Utility Functions
// Extracted from useChatViewModel.ts for better maintainability

export function extractCodeSnippets(content: string): any[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const snippets = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    snippets.push({
      language: match[1] || 'text',
      code: match[2].trim(),
      syntaxValid: true, // Note: Syntax validation to be implemented
    });
  }

  return snippets;
}

export function calculateProductivityGain(userInput: string, aiResponse: string): number {
  // Simple heuristic: lines of code generated vs. input length
  const inputComplexity = userInput.length;
  const outputValue = aiResponse.length;
  
  if (inputComplexity === 0) return 0;
  
  // Estimate productivity gain as a ratio
  const gain = Math.min((outputValue / inputComplexity) * 10, 100);
  return Math.round(gain);
}

export function validatePromptSecurity(prompt: string): boolean {
  // Check for potential security issues
  const securityPatterns = [
    /api[_-]?key/i,
    /password/i,
    /secret/i,
    /token/i,
    /credential/i,
    /private[_-]?key/i,
  ];

  return !securityPatterns.some(pattern => pattern.test(prompt));
}

export function formatCost(cost: number): string {
  if (cost < 0.000001) return '<$0.000001';
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function calculateSavingsPercentage(actualCost: number, expensiveCost: number): number {
  if (expensiveCost === 0) return 0;
  return Math.round(((expensiveCost - actualCost) / expensiveCost) * 100);
} 