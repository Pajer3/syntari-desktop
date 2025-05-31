// Syntari AI IDE - App ViewModel (MVVM Business Logic Layer)
// Simplified version compatible with current Tauri backend

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { 
  AppViewModel, 
  ProjectContext, 
  AiProvider, 
  AppError,
  TauriResult,
  UserProfile,
  PerformanceMetrics
} from '../types';

// ================================
// BACKEND TYPE INTERFACES (Tauri)
// ================================

interface BackendAiProvider {
  id: string;
  name: string;
  provider_type: string;
  is_available: boolean;
  cost_per_token: number;
  latency: number;
  specialties: string[];
}

interface BackendFileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  last_modified: number;
  content?: string;
  language?: string;
}

interface BackendProjectContext {
  root_path: string;
  project_type: string;
  open_files: BackendFileInfo[];
  dependencies: string[];
  git_branch?: string;
  active_framework?: string;
}

// ================================
// SIMPLIFIED CONSTANTS & CONFIG
// ================================

const CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  PERFORMANCE_THRESHOLD_MS: 100,
} as const;

const ERROR_CODES = {
  INIT_FAILED: 'INIT_FAILED',
  PROJECT_OPEN_FAILED: 'PROJECT_OPEN_FAILED',
  PROVIDER_LOAD_FAILED: 'PROVIDER_LOAD_FAILED',
} as const;

// ================================
// BUSINESS LOGIC INTERFACE
// ================================

interface UseAppViewModelReturn {
  // Core State
  readonly viewModel: AppViewModel;
  
  // Primary Actions
  readonly initializeApp: () => Promise<void>;
  readonly setCurrentView: (view: AppViewModel['currentView']) => void;
  readonly openProject: (path: string) => Promise<boolean>;
  readonly closeProject: () => void;
  readonly togglePerformanceMode: () => void;
  
  // Error Management
  readonly handleError: (error: AppError) => void;
  readonly clearError: () => void;
  readonly getErrorHistory: () => readonly AppError[];
  
  // Performance Monitoring
  readonly getPerformanceMetrics: () => PerformanceMetrics;
  
  // Computed Properties
  readonly isReady: boolean;
  readonly hasProject: boolean;
  readonly performanceMode: boolean;
}

// ================================
// SIMPLIFIED APP VIEW MODEL HOOK
// ================================

export const useAppViewModel = (): UseAppViewModelReturn => {
  // ================================
  // STATE MANAGEMENT (IMMUTABLE)
  // ================================
  
  const [viewModel, setViewModel] = useState<AppViewModel>({
    currentView: 'welcome',
    isLoading: true,
    error: undefined,
    project: undefined,
    user: undefined,
    performanceMode: true,
    securityContext: undefined,
    complianceMode: false,
  });
  
  const [aiProviders, setAiProviders] = useState<readonly AiProvider[]>([]);
  const [errorHistory, setErrorHistory] = useState<readonly AppError[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    responseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0,
    errorRate: 0,
    throughput: 0,
  });
  
  // State Management
  const initializeRef = useRef<boolean>(false);
  const errorCountRef = useRef<number>(0);
  const performanceStartTimeRef = useRef<number>(0);
  
  // ================================
  // COMPUTED PROPERTIES
  // ================================
  
  const isReady = !viewModel.isLoading && !viewModel.error;
  const hasProject = viewModel.project !== undefined;
  const performanceMode = viewModel.performanceMode;
  
  // ================================
  // TYPE CONVERSION UTILITIES
  // ================================
  
  const convertBackendProvider = (backendProvider: BackendAiProvider): AiProvider => ({
    id: backendProvider.id,
    name: backendProvider.name,
    type: backendProvider.provider_type as 'claude' | 'openai' | 'gemini' | 'local',
    isAvailable: backendProvider.is_available,
    costPerToken: backendProvider.cost_per_token,
    latency: backendProvider.latency,
    specialties: backendProvider.specialties,
    securityLevel: 'basic' as const,
    complianceFeatures: [],
    rateLimit: {
      requestsPerMinute: 60,
      tokensPerMinute: 10000,
    },
  });
  
  const convertBackendProject = (backendProject: BackendProjectContext): ProjectContext => ({
    rootPath: backendProject.root_path,
    projectType: backendProject.project_type as 'rust' | 'typescript' | 'python' | 'mixed' | 'unknown',
    openFiles: backendProject.open_files.map(file => ({
      path: file.path,
      name: file.name,
      extension: file.extension,
      size: file.size,
      lastModified: file.last_modified,
      content: file.content,
      language: file.language,
    })),
    dependencies: backendProject.dependencies,
    gitBranch: backendProject.git_branch,
    activeFramework: backendProject.active_framework,
    lastAnalyzed: Date.now(),
  });
  
  // ================================
  // ERROR MANAGEMENT SYSTEM
  // ================================
  
  const handleErrorInternal = useCallback((error: AppError): void => {
    errorCountRef.current += 1;
    
    const enhancedError: AppError = {
      ...error,
      errorId: error.errorId || `err-${Date.now()}`,
      stackTrace: error.stackTrace || new Error().stack,
      userNotified: false,
      escalated: false,
    };
    
    setErrorHistory(prev => [...prev, enhancedError].slice(-10)); // Keep last 10 errors
    setViewModel(prev => ({ ...prev, error: enhancedError }));
    
    // Enhanced error logging
    console.error(`🚨 [${enhancedError.severity.toUpperCase()}] ${enhancedError.code}:`, {
      message: enhancedError.message,
      errorId: enhancedError.errorId,
      context: enhancedError.context,
      timestamp: new Date(enhancedError.timestamp).toISOString(),
      recoverable: enhancedError.recoverable,
    });
  }, []);
  
  const handleError = useCallback((error: AppError): void => {
    handleErrorInternal(error);
  }, [handleErrorInternal]);
  
  const clearError = useCallback((): void => {
    setViewModel(prev => ({ ...prev, error: undefined }));
    console.log('✅ Error cleared from UI');
  }, []);
  
  const getErrorHistory = useCallback((): readonly AppError[] => {
    return errorHistory;
  }, [errorHistory]);
  
  // ================================
  // PERFORMANCE MONITORING
  // ================================
  
  const updatePerformanceMetrics = useCallback((): void => {
    const endTime = performance.now();
    const responseTime = endTime - performanceStartTimeRef.current;
    
    setPerformanceMetrics(prev => ({
      ...prev,
      responseTime,
      errorRate: errorHistory.length > 0 ? (errorHistory.length / 100) * 100 : 0,
    }));
    
    if (responseTime > CONFIG.PERFORMANCE_THRESHOLD_MS) {
      console.warn(`⚠️ Performance warning: ${responseTime}ms`);
    }
  }, [errorHistory.length]);
  
  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    return performanceMetrics;
  }, [performanceMetrics]);
  
  // ================================
  // CORE BUSINESS ACTIONS
  // ================================
  
  const initializeApp = useCallback(async (): Promise<void> => {
    if (initializeRef.current) return; // Prevent multiple initializations
    initializeRef.current = true;
    performanceStartTimeRef.current = performance.now();
    
    try {
      setViewModel(prev => ({ ...prev, isLoading: true, error: undefined }));
      console.log('🚀 Initializing Syntari AI IDE...');
      
      // Step 1: Initialize backend
      console.log('📡 Connecting to Tauri backend...');
      
      let backendInitialized = false;
      let providers: AiProvider[] = [];
      
      try {
        const initResult: TauriResult<string> = await invoke('initialize_app');
        if (initResult.success) {
          console.log('✅ Backend initialized successfully');
          backendInitialized = true;
          
          // Step 2: Load AI providers
          console.log('🤖 Loading AI providers...');
          const providersResult: TauriResult<BackendAiProvider[]> = await invoke('get_ai_providers');
          if (providersResult.success && providersResult.data) {
            providers = providersResult.data.map(convertBackendProvider);
            console.log(`✅ Loaded ${providers.length} AI providers from backend:`);
            providers.forEach(provider => {
              console.log(`   ${provider.name}: $${provider.costPerToken.toFixed(8)}/token`);
            });
          }
        } else {
          throw new Error(initResult.error || 'Backend initialization failed');
        }
      } catch (error) {
        console.warn('⚠️ Backend unavailable, using demo mode:', error);
        
        // Fallback: Demo mode with mock providers
        providers = [
          {
            id: 'claude-demo',
            name: 'Claude (Demo Mode)',
            type: 'claude',
            isAvailable: true,
            costPerToken: 0.00001102,
            latency: 1500,
            specialties: ['reasoning', 'code', 'analysis'],
            securityLevel: 'basic',
            complianceFeatures: [],
            rateLimit: { requestsPerMinute: 60, tokensPerMinute: 10000 },
          },
          {
            id: 'openai-demo',
            name: 'GPT-4 (Demo Mode)',
            type: 'openai',
            isAvailable: true,
            costPerToken: 0.00003000,
            latency: 2000,
            specialties: ['general', 'creative'],
            securityLevel: 'basic',
            complianceFeatures: [],
            rateLimit: { requestsPerMinute: 60, tokensPerMinute: 10000 },
          },
          {
            id: 'gemini-demo',
            name: 'Gemini Pro (Demo Mode)',
            type: 'gemini',
            isAvailable: true,
            costPerToken: 0.00000037,
            latency: 800,
            specialties: ['fast', 'cost-effective'],
            securityLevel: 'basic',
            complianceFeatures: [],
            rateLimit: { requestsPerMinute: 60, tokensPerMinute: 10000 },
          },
        ];
        
        console.log(`✅ Loaded ${providers.length} demo AI providers:`);
        providers.forEach(provider => {
          console.log(`   ${provider.name}: $${provider.costPerToken.toFixed(8)}/token`);
        });
      }
      
      setAiProviders(providers);
      
      // Step 3: Set up user profile
      const mockUser: UserProfile = {
        id: 'user-1',
        name: 'Developer',
        email: 'dev@syntari.ai',
        preferences: {
          theme: 'dark',
          aiProvider: 'auto',
          costOptimization: true,
          autoSave: true,
          performanceMode: true,
          keyboardShortcuts: {},
          securityLevel: 'standard',
          complianceMode: false,
        },
        subscription: {
          plan: backendInitialized ? 'pro' : 'free',
          features: backendInitialized 
            ? ['multi-model', 'cost-optimization']
            : ['demo-mode'],
          limits: {
            requestsPerDay: backendInitialized ? 1000 : 10,
            tokensPerMonth: backendInitialized ? 100000 : 1000,
            storageGB: backendInitialized ? 10 : 1,
            collaborators: backendInitialized ? 5 : 1,
          },
        },
      };
      
      // Step 4: Finalize initialization
      setViewModel(prev => ({
        ...prev,
        isLoading: false,
        user: mockUser,
        currentView: 'welcome',
      }));
      
      updatePerformanceMetrics();
      
      // Success logging
      console.log('🎉 Syntari AI IDE initialized successfully');
      console.log(`📊 Status:`);
      console.log(`   Mode: ${backendInitialized ? 'Full' : 'Demo'}`);
      console.log(`   Available AI providers: ${providers.length}`);
      console.log(`   💰 Cost optimization: enabled`);
      console.log(`   ⚡ Performance mode: ${performanceMode ? 'enabled' : 'disabled'}`);
      
      if (!backendInitialized) {
        console.log('');
        console.log('🔔 Note: Running in demo mode. For full functionality, ensure Tauri backend is properly configured.');
      }
      
    } catch (error) {
      const appError: AppError = {
        code: ERROR_CODES.INIT_FAILED,
        message: error instanceof Error ? error.message : 'Unknown initialization error',
        severity: 'critical',
        timestamp: Date.now(),
        context: { 
          step: 'app_initialization',
          performanceMode: performanceMode,
        },
        recoverable: true,
      };
      
      handleErrorInternal(appError);
      updatePerformanceMetrics();
    }
  }, [performanceMode, aiProviders.length, updatePerformanceMetrics, handleErrorInternal, convertBackendProvider]);
  
  const setCurrentView = useCallback((view: AppViewModel['currentView']): void => {
    performanceStartTimeRef.current = performance.now();
    
    setViewModel(prev => ({ ...prev, currentView: view }));
    updatePerformanceMetrics();
    
    console.log(`🔄 View transition: ${view}`);
  }, [updatePerformanceMetrics]);
  
  const openProject = useCallback(async (path: string): Promise<boolean> => {
    performanceStartTimeRef.current = performance.now();
    
    try {
      setViewModel(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      // Security validation for project path
      if (!path || path.includes('..') || path.includes('~')) {
        throw new Error('Invalid project path');
      }
      
      let project: ProjectContext;
      
      try {
        // Try to use backend
        const result: TauriResult<BackendProjectContext> = await invoke('open_project', { path });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to open project');
        }
        
        if (!result.data) {
          throw new Error('No project data returned');
        }
        
        // Convert backend format to frontend format
        project = convertBackendProject(result.data);
        
      } catch (error) {
        console.warn('⚠️ Backend unavailable for project opening, using demo analysis:', error);
        
        // Fallback: Demo project analysis
        const pathParts = path.split('/');
        const projectName = pathParts[pathParts.length - 1] || 'Unknown Project';
        
        // Simple project type detection based on path
        let projectType: 'rust' | 'typescript' | 'python' | 'mixed' | 'unknown' = 'unknown';
        if (path.includes('rust') || path.includes('cargo')) projectType = 'rust';
        else if (path.includes('node') || path.includes('typescript') || path.includes('react')) projectType = 'typescript';
        else if (path.includes('python') || path.includes('py')) projectType = 'python';
        
        project = {
          rootPath: path,
          projectType,
          openFiles: [
            {
              path: `${path}/README.md`,
              name: 'README.md',
              extension: 'md',
              size: 1024,
              lastModified: Date.now(),
              content: `# ${projectName}\n\nDemo project loaded in Syntari AI IDE.`,
              language: 'markdown',
            },
          ],
          dependencies: ['demo-dependency'],
          gitBranch: 'main',
          activeFramework: undefined,
          lastAnalyzed: Date.now(),
        };
      }
      
      setViewModel(prev => ({
        ...prev,
        isLoading: false,
        project,
        currentView: 'editor',
      }));
      
      updatePerformanceMetrics();
      
      // Success logging
      console.log(`📁 Project opened successfully:`);
      console.log(`   Path: ${project.rootPath}`);
      console.log(`   Type: ${project.projectType}`);
      console.log(`   Dependencies: ${project.dependencies.length}`);
      console.log(`   Files: ${project.openFiles.length}`);
      
      return true;
      
    } catch (error) {
      const appError: AppError = {
        code: ERROR_CODES.PROJECT_OPEN_FAILED,
        message: error instanceof Error ? error.message : 'Failed to open project',
        severity: 'error',
        timestamp: Date.now(),
        context: { projectPath: path },
        recoverable: true,
      };
      
      setViewModel(prev => ({ ...prev, isLoading: false }));
      handleErrorInternal(appError);
      updatePerformanceMetrics();
      return false;
    }
  }, [updatePerformanceMetrics, handleErrorInternal, convertBackendProject]);
  
  const closeProject = useCallback((): void => {
    setViewModel(prev => ({
      ...prev,
      project: undefined,
      currentView: 'welcome',
    }));
    
    console.log('📁 Project closed');
  }, []);
  
  const togglePerformanceMode = useCallback((): void => {
    const newPerformanceMode = !viewModel.performanceMode;
    
    setViewModel(prev => ({
      ...prev,
      performanceMode: newPerformanceMode,
      user: prev.user ? {
        ...prev.user,
        preferences: {
          ...prev.user.preferences,
          performanceMode: newPerformanceMode,
        },
      } : prev.user,
    }));
    
    console.log(`⚡ Performance mode: ${newPerformanceMode ? 'enabled' : 'disabled'}`);
  }, [viewModel.performanceMode]);
  
  // ================================
  // LIFECYCLE & AUTO-RECOVERY
  // ================================
  
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);
  
  // Auto-recovery system
  useEffect(() => {
    if (viewModel.error && viewModel.error.recoverable) {
      const timer = setTimeout(() => {
        console.log('🔄 Attempting auto-recovery...');
        clearError();
        
        // Recovery strategies based on error type
        switch (viewModel.error?.code) {
          case ERROR_CODES.INIT_FAILED:
            console.log('🔄 Retrying application initialization...');
            initializeApp();
            break;
          default:
            console.log('🔄 Generic recovery attempt...');
            break;
        }
      }, CONFIG.RETRY_DELAY_MS);
      
      return () => clearTimeout(timer);
    }
  }, [viewModel.error, clearError, initializeApp]);
  
  // ================================
  // RETURN INTERFACE
  // ================================
  
  return {
    // Core State
    viewModel,
    
    // Primary Actions
    initializeApp,
    setCurrentView,
    openProject,
    closeProject,
    togglePerformanceMode,
    
    // Error Management
    handleError,
    clearError,
    getErrorHistory,
    
    // Performance Monitoring
    getPerformanceMetrics,
    
    // Computed Properties
    isReady,
    hasProject,
    performanceMode,
  };
}; 