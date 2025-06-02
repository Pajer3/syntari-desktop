// Syntari AI IDE - Chat Provider Management Hook
// Thin React wrapper around ChatService for provider management

import { useState, useCallback, useRef } from 'react';
import type { AiProvider, AppError } from '../../types/core';
import { ChatService } from '../../services/chatService';

interface UseChatProviderReturn {
  readonly availableProviders: readonly AiProvider[];
  readonly selectedProvider?: string;
  readonly smartRouting: boolean;
  readonly selectProvider: (providerId: string) => void;
  readonly toggleSmartRouting: () => void;
  readonly getProviderRecommendation: (prompt: string, options?: {
    preferCostOptimization?: boolean;
    maxBudget?: number;
    excludeProviders?: readonly string[];
  }) => Promise<string | null>;
  readonly initializeProviders: () => Promise<void>;
  readonly getProvider: (providerId: string) => AiProvider | undefined;
  readonly getProvidersByType: (type: AiProvider['type']) => readonly AiProvider[];
}

export const useChatProvider = (
  onError?: (error: AppError) => void
): UseChatProviderReturn => {
  const [availableProviders, setAvailableProviders] = useState<readonly AiProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>();
  const [smartRouting, setSmartRouting] = useState(true);
  const initializeRef = useRef(false);
  
  // Get centralized service instance
  const chatService = ChatService.getInstance();

  const selectProvider = useCallback((providerId: string) => {
    const provider = chatService.getProvider(providerId);
    if (!provider) {
      const error: AppError = {
        code: 'PROVIDER_NOT_FOUND',
        message: `Provider not found: ${providerId}`,
        severity: 'error',
        timestamp: Date.now(),
        context: { providerId },
        recoverable: true,
      };
      onError?.(error);
      return;
    }

    setSelectedProvider(providerId);
    setSmartRouting(false); // Disable smart routing when manually selecting
    
    console.log(`🎯 Provider selected: ${provider.name} (${provider.type})`);
    console.log(`💰 Cost per token: $${provider.costPerToken.toFixed(8)}`);
  }, [chatService, onError]);

  const toggleSmartRouting = useCallback(() => {
    setSmartRouting(prev => {
      const newSmartRouting = !prev;
      
      if (newSmartRouting) {
        setSelectedProvider(undefined); // Clear manual selection when enabling smart routing
        console.log('🧠 Smart routing enabled - AI will choose optimal providers');
        console.log('💎 Cost optimization active - targeting 97% savings');
      } else {
        console.log('🧠 Smart routing disabled - manual provider selection');
      }
      
      return newSmartRouting;
    });
  }, []);

  const getProviderRecommendation = useCallback(async (
    prompt: string, 
    options: {
      preferCostOptimization?: boolean;
      maxBudget?: number;
      excludeProviders?: readonly string[];
    } = {}
  ): Promise<string | null> => {
    if (!smartRouting) {
      return selectedProvider || null;
    }

    try {
      // Delegate to centralized service logic
      return chatService.getProviderRecommendation(prompt, options);
    } catch (error) {
      console.error('Error in provider recommendation:', error);
      const appError: AppError = {
        code: 'PROVIDER_RECOMMENDATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get provider recommendation',
        severity: 'warning',
        timestamp: Date.now(),
        context: { 
          smartRouting, 
          selectedProvider,
          promptLength: prompt.length,
          options 
        },
        recoverable: true,
      };
      onError?.(appError);
      
      // Fallback to any available provider
      return availableProviders.find(p => p.isAvailable)?.id || null;
    }
  }, [smartRouting, selectedProvider, availableProviders, chatService, onError]);

  const initializeProviders = useCallback(async (): Promise<void> => {
    if (initializeRef.current) return;
    initializeRef.current = true;

    try {
      console.log('📡 Initializing AI providers via ChatService...');
      
      // Delegate to centralized service
      const providers = await chatService.initializeProviders();
      setAvailableProviders(providers);
      
      // Auto-select the cheapest provider initially if smart routing is enabled
      if (smartRouting && providers.length > 0) {
        const cheapest = providers
          .filter(p => p.isAvailable)
          .sort((a, b) => a.costPerToken - b.costPerToken)[0];
        
        if (cheapest) {
          setSelectedProvider(cheapest.id);
          console.log(`💰 Auto-selected cheapest provider: ${cheapest.name} ($${cheapest.costPerToken.toFixed(8)}/token)`);
        }
      }

      console.log(`✅ Loaded ${providers.length} AI providers`);

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
      console.error('❌ Failed to initialize providers:', error);
    }
  }, [smartRouting, chatService, onError]);

  // Thin wrappers around service methods
  const getProvider = useCallback((providerId: string): AiProvider | undefined => {
    return chatService.getProvider(providerId);
  }, [chatService]);

  const getProvidersByType = useCallback((type: AiProvider['type']): readonly AiProvider[] => {
    return chatService.getProvidersByType(type);
  }, [chatService]);

  return {
    availableProviders,
    selectedProvider,
    smartRouting,
    selectProvider,
    toggleSmartRouting,
    getProviderRecommendation,
    initializeProviders,
    getProvider,
    getProvidersByType,
  };
}; 