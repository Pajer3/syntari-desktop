// Syntari AI IDE - Chat ViewModel (AI Conversation Management)
// Handles real-time AI interactions with multi-model routing

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { 
  ChatViewModel, 
  ChatSession, 
  ChatMessage, 
  AiProvider,
  AiRequest,
  ConsensusResult,
  ProjectContext,
  TauriResult,
  AppError
} from '../types';

interface UseChatViewModelReturn {
  // State
  viewModel: ChatViewModel;
  
  // Actions
  createSession: (project: ProjectContext) => Promise<string | null>;
  sendMessage: (content: string) => Promise<void>;
  setInput: (input: string) => void;
  selectProvider: (providerId: string) => void;
  toggleSmartRouting: () => void;
  clearSession: () => void;
  
  // Computed properties
  isReady: boolean;
  canSendMessage: boolean;
  totalCost: number;
  messageCount: number;
}

export const useChatViewModel = (
  project?: ProjectContext,
  onError?: (error: AppError) => void
): UseChatViewModelReturn => {
  // ================================
  // STATE MANAGEMENT
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
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    input: '',
    isTyping: false,
    availableProviders: [],
    selectedProvider: undefined,
    smartRouting: true,
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  const sendingMessageRef = useRef<boolean>(false);
  const sessionRef = useRef<string>('');
  
  // ================================
  // COMPUTED PROPERTIES
  // ================================
  
  const isReady = isInitialized && sessionRef.current !== '';
  const canSendMessage = isReady && viewModel.input.trim() !== '' && !viewModel.isTyping;
  const totalCost = viewModel.session.messages.reduce((total, msg) => {
    return total + (msg.metadata?.cost || 0);
  }, 0);
  const messageCount = viewModel.session.messages.length;
  
  // ================================
  // BUSINESS LOGIC ACTIONS
  // ================================
  
  const createSession = useCallback(async (projectContext: ProjectContext): Promise<string | null> => {
    try {
      const result: TauriResult<string> = await invoke('create_chat_session', {
        projectPath: projectContext.rootPath,
      });
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create chat session');
      }
      
      sessionRef.current = result.data;
      
      setViewModel(prev => ({
        ...prev,
        session: {
          ...prev.session,
          id: result.data,
          name: `Chat - ${projectContext.rootPath.split('/').pop() || 'Project'}`,
          context: projectContext,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        },
      }));
      
      console.log(`💬 Chat session created: ${result.data}`);
      console.log(`📁 Project context: ${projectContext.projectType}`);
      
      return result.data;
      
    } catch (error) {
      const appError: AppError = {
        code: 'CHAT_SESSION_CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create chat session',
        severity: 'error',
        timestamp: Date.now(),
        context: { projectPath: projectContext.rootPath },
        recoverable: true,
      };
      
      onError?.(appError);
      console.error('❌ Failed to create chat session:', error);
      return null;
    }
  }, [onError]);
  
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!canSendMessage || sendingMessageRef.current) return;
    
    sendingMessageRef.current = true;
    
    try {
      setViewModel(prev => ({ ...prev, isTyping: true, input: '' }));
      
      // Send user message to backend
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
      
      // Create AI request with project context
      const aiRequest: AiRequest = {
        id: `req-${Date.now()}`,
        prompt: content,
        context: viewModel.session.context,
        timestamp: Date.now(),
        provider: viewModel.smartRouting ? undefined : viewModel.selectedProvider,
      };
      
      // Get AI response with smart routing
      const aiResult: TauriResult<ConsensusResult> = await invoke('generate_ai_response', aiRequest);
      
      if (!aiResult.success || !aiResult.data) {
        throw new Error(aiResult.error || 'Failed to get AI response');
      }
      
      const consensus = aiResult.data;
      
      // Create AI message
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
        },
      };
      
      // Add AI message and update session
      const aiMessageResult: TauriResult<ChatMessage> = await invoke('send_chat_message', {
        sessionId: sessionRef.current,
        content: aiMessage.content,
      });
      
      setViewModel(prev => ({
        ...prev,
        isTyping: false,
        session: {
          ...prev.session,
          messages: [...prev.session.messages, aiMessage],
          updatedAt: Date.now(),
        },
      }));
      
      // Log performance and cost metrics
      console.log(`🤖 AI Response received:`);
      console.log(`   Provider: ${consensus.bestResponse.provider}`);
      console.log(`   Confidence: ${(consensus.confidenceScore * 100).toFixed(1)}%`);
      console.log(`   Cost: $${consensus.totalCost.toFixed(6)}`);
      console.log(`   Response time: ${consensus.bestResponse.responseTime}ms`);
      console.log(`   Reasoning: ${consensus.reasoning}`);
      
    } catch (error) {
      setViewModel(prev => ({ ...prev, isTyping: false }));
      
      const appError: AppError = {
        code: 'AI_MESSAGE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to send message',
        severity: 'error',
        timestamp: Date.now(),
        context: { 
          sessionId: sessionRef.current,
          messageContent: content.substring(0, 100) + '...',
        },
        recoverable: true,
      };
      
      onError?.(appError);
      console.error('❌ Failed to send message:', error);
    } finally {
      sendingMessageRef.current = false;
    }
  }, [canSendMessage, viewModel.session.context, viewModel.smartRouting, viewModel.selectedProvider, onError]);
  
  const setInput = useCallback((input: string): void => {
    setViewModel(prev => ({ ...prev, input }));
  }, []);
  
  const selectProvider = useCallback((providerId: string): void => {
    setViewModel(prev => ({ 
      ...prev, 
      selectedProvider: providerId,
      smartRouting: false, // Disable smart routing when manually selecting
    }));
    
    console.log(`🎯 Provider selected: ${providerId}`);
  }, []);
  
  const toggleSmartRouting = useCallback((): void => {
    setViewModel(prev => ({ 
      ...prev, 
      smartRouting: !prev.smartRouting,
      selectedProvider: prev.smartRouting ? prev.selectedProvider : undefined,
    }));
    
    console.log(`🧠 Smart routing: ${!viewModel.smartRouting ? 'enabled' : 'disabled'}`);
  }, [viewModel.smartRouting]);
  
  const clearSession = useCallback((): void => {
    setViewModel(prev => ({
      ...prev,
      session: {
        ...prev.session,
        messages: [],
        updatedAt: Date.now(),
      },
      input: '',
      isTyping: false,
    }));
    
    console.log('🗑️  Chat session cleared');
  }, []);
  
  // ================================
  // INITIALIZATION EFFECTS
  // ================================
  
  useEffect(() => {
    const initializeProviders = async (): Promise<void> => {
      try {
        const result: TauriResult<AiProvider[]> = await invoke('get_ai_providers');
        
        if (result.success && result.data) {
          setViewModel(prev => ({
            ...prev,
            availableProviders: result.data!,
          }));
          
          console.log(`📡 Loaded ${result.data.length} AI providers`);
          result.data.forEach(provider => {
            console.log(`   ${provider.name}: $${provider.costPerToken.toFixed(8)}/token, ${provider.latency}ms latency`);
          });
        }
        
        setIsInitialized(true);
        
      } catch (error) {
        console.error('Failed to load AI providers:', error);
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
  
  // ================================
  // PERFORMANCE MONITORING
  // ================================
  
  useEffect(() => {
    // Log cost and usage statistics periodically
    if (messageCount > 0 && messageCount % 10 === 0) {
      console.log(`📊 Chat Statistics:`);
      console.log(`   Messages: ${messageCount}`);
      console.log(`   Total cost: $${totalCost.toFixed(6)}`);
      console.log(`   Avg cost per message: $${(totalCost / (messageCount / 2)).toFixed(6)}`);
    }
  }, [messageCount, totalCost]);
  
  // ================================
  // RETURN INTERFACE
  // ================================
  
  return {
    // State
    viewModel,
    
    // Actions
    createSession,
    sendMessage,
    setInput,
    selectProvider,
    toggleSmartRouting,
    clearSession,
    
    // Computed
    isReady,
    canSendMessage,
    totalCost,
    messageCount,
  };
};

// ================================
// UTILITY FUNCTIONS
// ================================

function extractCodeSnippets(content: string): any[] {
  // Extract code blocks from AI response
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const snippets = [];
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    snippets.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    });
  }
  
  return snippets;
} 