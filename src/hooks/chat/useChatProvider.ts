// Syntari AI IDE - Chat Provider Management Hook
// Extracted from useChatViewModel.ts for better separation of concerns

import { useState, useCallback, useRef } from 'react';
import type { AiProvider, AppError } from '../../types/core';

interface UseChatProviderReturn {
  readonly availableProviders: readonly AiProvider[];
  readonly selectedProvider?: string;
  readonly smartRouting: boolean;
  readonly selectProvider: (providerId: string) => void;
  readonly toggleSmartRouting: () => void;
  readonly getProviderRecommendation: (prompt: string) => Promise<string | null>;
  readonly initializeProviders: () => Promise<void>;
}

export const useChatProvider = (
  onError?: (error: AppError) => void
): UseChatProviderReturn => {
  const [availableProviders, setAvailableProviders] = useState<readonly AiProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>();
  const [smartRouting, setSmartRouting] = useState(true);
  const initializeRef = useRef(false);

  const selectProvider = useCallback((providerId: string) => {
    setSelectedProvider(providerId);
    setSmartRouting(false); // Disable smart routing when manually selecting
  }, []);

  const toggleSmartRouting = useCallback(() => {
    setSmartRouting(prev => {
      if (!prev) {
        setSelectedProvider(undefined); // Clear manual selection when enabling smart routing
      }
      return !prev;
    });
  }, []);

  const getProviderRecommendation = useCallback(async (prompt: string): Promise<string | null> => {
    if (!smartRouting || availableProviders.length === 0) {
      return selectedProvider || null;
    }

    try {
      // Simple heuristic-based routing
      const promptLower = prompt.toLowerCase();
      
      // For code-related queries, prefer Claude
      if (promptLower.includes('code') || promptLower.includes('function') || promptLower.includes('debug')) {
        const claude = availableProviders.find(p => p.type === 'claude' && p.isAvailable);
        if (claude) return claude.id;
      }
      
      // For creative tasks, prefer GPT-4
      if (promptLower.includes('creative') || promptLower.includes('story') || promptLower.includes('design')) {
        const openai = availableProviders.find(p => p.type === 'openai' && p.isAvailable);
        if (openai) return openai.id;
      }
      
      // For quick questions, prefer Gemini (cost-effective)
      if (prompt.length < 100) {
        const gemini = availableProviders.find(p => p.type === 'gemini' && p.isAvailable);
        if (gemini) return gemini.id;
      }
      
      // Default: cheapest available provider
      const cheapestProvider = availableProviders
        .filter(p => p.isAvailable)
        .sort((a, b) => a.costPerToken - b.costPerToken)[0];
      
      return cheapestProvider?.id || null;
    } catch (error) {
      console.error('Error in provider recommendation:', error);
      return selectedProvider || availableProviders.find(p => p.isAvailable)?.id || null;
    }
  }, [smartRouting, availableProviders, selectedProvider]);

  const initializeProviders = useCallback(async (): Promise<void> => {
    if (initializeRef.current) return;
    initializeRef.current = true;

    try {
      // Mock providers for demo
      const mockProviders: AiProvider[] = [
        {
          id: 'claude-3',
          name: 'Claude 3 Sonnet',
          type: 'claude',
          isAvailable: true,
          costPerToken: 0.00001102,
          latency: 1200,
          specialties: ['reasoning', 'code', 'analysis'],
          securityLevel: 'enterprise',
          complianceFeatures: ['SOC2', 'GDPR'],
          rateLimit: {
            requestsPerMinute: 50,
            tokensPerMinute: 40000,
          },
        },
        {
          id: 'gpt-4',
          name: 'GPT-4 Turbo',
          type: 'openai',
          isAvailable: true,
          costPerToken: 0.00003000,
          latency: 1800,
          specialties: ['general', 'creative', 'reasoning'],
          securityLevel: 'enterprise',
          complianceFeatures: ['SOC2'],
          rateLimit: {
            requestsPerMinute: 40,
            tokensPerMinute: 30000,
          },
        },
        {
          id: 'gemini-pro',
          name: 'Gemini Pro',
          type: 'gemini',
          isAvailable: true,
          costPerToken: 0.00000037,
          latency: 800,
          specialties: ['fast', 'cost-effective', 'multimodal'],
          securityLevel: 'basic',
          complianceFeatures: [],
          rateLimit: {
            requestsPerMinute: 60,
            tokensPerMinute: 50000,
          },
        },
      ];

      setAvailableProviders(mockProviders);
      
      // Auto-select the cheapest provider initially
      const cheapest = mockProviders
        .filter(p => p.isAvailable)
        .sort((a, b) => a.costPerToken - b.costPerToken)[0];
      
      if (cheapest && smartRouting) {
        setSelectedProvider(cheapest.id);
      }

    } catch (error) {
      const appError: AppError = {
        code: 'PROVIDER_INIT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to initialize providers',
        severity: 'error',
        timestamp: Date.now(),
        context: { step: 'provider_initialization' },
        recoverable: true,
      };
      
      onError?.(appError);
    }
  }, [smartRouting, onError]);

  return {
    availableProviders,
    selectedProvider,
    smartRouting,
    selectProvider,
    toggleSmartRouting,
    getProviderRecommendation,
    initializeProviders,
  };
}; 