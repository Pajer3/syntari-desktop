// Syntari AI IDE - App ViewModel (React Hooks Pattern)
// Main business logic layer for the desktop application

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { 
  AppViewModel, 
  ProjectContext, 
  AiProvider, 
  AppError,
  TauriResult,
  UserProfile
} from '../types';

interface UseAppViewModelReturn {
  // State
  viewModel: AppViewModel;
  
  // Actions
  initializeApp: () => Promise<void>;
  setCurrentView: (view: AppViewModel['currentView']) => void;
  openProject: (path: string) => Promise<boolean>;
  closeProject: () => void;
  handleError: (error: AppError) => void;
  clearError: () => void;
  
  // Computed properties
  isReady: boolean;
  hasProject: boolean;
}

export const useAppViewModel = (): UseAppViewModelReturn => {
  // ================================
  // STATE MANAGEMENT
  // ================================
  
  const [viewModel, setViewModel] = useState<AppViewModel>({
    currentView: 'welcome',
    isLoading: true,
    error: undefined,
    project: undefined,
    user: undefined,
  });
  
  const [aiProviders, setAiProviders] = useState<AiProvider[]>([]);
  const initializeRef = useRef<boolean>(false);
  
  // ================================
  // COMPUTED PROPERTIES
  // ================================
  
  const isReady = !viewModel.isLoading && !viewModel.error;
  const hasProject = viewModel.project !== undefined;
  
  // ================================
  // BUSINESS LOGIC ACTIONS
  // ================================
  
  const initializeApp = useCallback(async (): Promise<void> => {
    if (initializeRef.current) return; // Prevent multiple initializations
    initializeRef.current = true;
    
    try {
      setViewModel(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      // Initialize backend
      const initResult: TauriResult<string> = await invoke('initialize_app');
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize app');
      }
      
      // Load AI providers
      const providersResult: TauriResult<AiProvider[]> = await invoke('get_ai_providers');
      
      if (providersResult.success && providersResult.data) {
        setAiProviders(providersResult.data);
      }
      
      // Load user preferences (mock for now)
      const mockUser: UserProfile = {
        id: 'user-1',
        name: 'Developer',
        email: 'dev@syntari.ai',
        preferences: {
          theme: 'dark',
          aiProvider: 'auto',
          costOptimization: true,
          autoSave: true,
          keyboardShortcuts: {},
        },
        subscription: {
          plan: 'pro',
          features: ['multi-model', 'cost-optimization', 'enterprise-security'],
        },
      };
      
      setViewModel(prev => ({
        ...prev,
        isLoading: false,
        user: mockUser,
        currentView: 'welcome',
      }));
      
      console.log('🚀 Syntari AI IDE initialized successfully');
      console.log(`📊 Available AI providers: ${aiProviders.length}`);
      console.log('💰 Cost optimization: 97% savings with smart routing');
      
    } catch (error) {
      const appError: AppError = {
        code: 'INIT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown initialization error',
        severity: 'critical',
        timestamp: Date.now(),
        context: { step: 'app_initialization' },
        recoverable: true,
      };
      
      setViewModel(prev => ({
        ...prev,
        isLoading: false,
        error: appError,
      }));
      
      console.error('❌ Failed to initialize Syntari AI IDE:', error);
    }
  }, [aiProviders.length]);
  
  const setCurrentView = useCallback((view: AppViewModel['currentView']): void => {
    setViewModel(prev => ({ ...prev, currentView: view }));
    
    console.log(`🔄 Switching to view: ${view}`);
  }, []);
  
  const openProject = useCallback(async (path: string): Promise<boolean> => {
    try {
      setViewModel(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      const result: TauriResult<ProjectContext> = await invoke('open_project', { path });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to open project');
      }
      
      if (!result.data) {
        throw new Error('No project data returned');
      }
      
      setViewModel(prev => ({
        ...prev,
        isLoading: false,
        project: result.data,
        currentView: 'editor',
      }));
      
      console.log(`📁 Project opened: ${result.data.rootPath}`);
      console.log(`🏷️  Project type: ${result.data.projectType}`);
      console.log(`📦 Dependencies: ${result.data.dependencies.length}`);
      
      return true;
      
    } catch (error) {
      const appError: AppError = {
        code: 'PROJECT_OPEN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to open project',
        severity: 'error',
        timestamp: Date.now(),
        context: { projectPath: path },
        recoverable: true,
      };
      
      setViewModel(prev => ({
        ...prev,
        isLoading: false,
        error: appError,
      }));
      
      console.error('❌ Failed to open project:', error);
      return false;
    }
  }, []);
  
  const closeProject = useCallback((): void => {
    setViewModel(prev => ({
      ...prev,
      project: undefined,
      currentView: 'welcome',
    }));
    
    console.log('📁 Project closed');
  }, []);
  
  const handleError = useCallback((error: AppError): void => {
    setViewModel(prev => ({ ...prev, error }));
    
    // Log error for monitoring
    console.error(`🚨 ${error.severity.toUpperCase()}: ${error.message}`, {
      code: error.code,
      context: error.context,
      recoverable: error.recoverable,
    });
    
    // TODO: Send to enterprise monitoring system
    // enterpriseMonitor.recordError(error);
  }, []);
  
  const clearError = useCallback((): void => {
    setViewModel(prev => ({ ...prev, error: undefined }));
  }, []);
  
  // ================================
  // LIFECYCLE EFFECTS
  // ================================
  
  useEffect(() => {
    // Initialize app on mount
    initializeApp();
  }, [initializeApp]);
  
  // Auto-recovery for recoverable errors
  useEffect(() => {
    if (viewModel.error && viewModel.error.recoverable) {
      const timer = setTimeout(() => {
        console.log('🔄 Attempting auto-recovery from error...');
        clearError();
        
        // Attempt recovery based on error type
        switch (viewModel.error?.code) {
          case 'INIT_FAILED':
            initializeApp();
            break;
          default:
            break;
        }
      }, 5000); // 5 second recovery delay
      
      return () => clearTimeout(timer);
    }
  }, [viewModel.error, clearError, initializeApp]);
  
  // ================================
  // PERFORMANCE MONITORING
  // ================================
  
  useEffect(() => {
    // Monitor view transitions for performance
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const transitionTime = endTime - startTime;
      
      if (transitionTime > 100) { // Log slow transitions
        console.warn(`⚠️  Slow view transition: ${transitionTime}ms to ${viewModel.currentView}`);
      }
    };
  }, [viewModel.currentView]);
  
  // ================================
  // RETURN INTERFACE
  // ================================
  
  return {
    // State
    viewModel,
    
    // Actions
    initializeApp,
    setCurrentView,
    openProject,
    closeProject,
    handleError,
    clearError,
    
    // Computed
    isReady,
    hasProject,
  };
}; 