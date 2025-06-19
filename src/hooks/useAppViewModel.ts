// Syntari AI IDE - App ViewModel (MVVM Business Logic Layer)
// Simplified version compatible with current Tauri backend

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { 
  AppViewModel, 
  UserProfile,
  PerformanceMetrics,
  ProjectContext,
  AiProvider,
  AppError,
  TauriResult
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
// STATE PERSISTENCE UTILITIES
// ================================

interface PersistedState {
  lastProjectPath?: string;
  preferredProvider?: string;
  performanceMode?: boolean;
  windowState?: {
    view: AppViewModel['currentView'];
    splitViews?: string[];
  };
  userPreferences?: {
    theme?: string;
    fontSize?: number;
    autoSave?: boolean;
  };
}

class StateManager {
  private static readonly STORAGE_KEY = 'syntari-app-state';
  
  static save(state: Partial<PersistedState>): void {
    try {
      const existing = this.load();
      const merged = { ...existing, ...state };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
    } catch (error) {
      console.warn('Failed to save app state:', error);
    }
  }
  
  static load(): PersistedState {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load app state:', error);
      return {};
    }
  }
  
  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// ================================
// PERFORMANCE MONITORING
// ================================

class PerformanceTracker {
  private metrics: PerformanceMetrics = {
    responseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0,
    errorRate: 0,
    throughput: 0,
  };
  
  private measurements: number[] = [];
  private errorCount = 0;
  private requestCount = 0;
  
  startMeasurement(): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMeasurement(duration);
      return duration;
    };
  }
  
  recordMeasurement(duration: number): void {
    this.measurements.push(duration);
    if (this.measurements.length > 100) {
      this.measurements.shift(); // Keep only last 100 measurements
    }
    
    const responseTime = this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length;
    this.metrics = { ...this.metrics, responseTime };
    this.requestCount++;
  }
  
  recordError(): void {
    this.errorCount++;
    const errorRate = (this.errorCount / Math.max(this.requestCount, 1)) * 100;
    this.metrics = { ...this.metrics, errorRate };
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const memoryUsage = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
      this.metrics = { ...this.metrics, memoryUsage };
    }
  }
}

// ================================
// SIMPLIFIED CONSTANTS & CONFIG
// ================================

const CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  PERFORMANCE_THRESHOLD_MS: 100,
  STATE_SAVE_INTERVAL_MS: 30000, // Save state every 30 seconds
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
  readonly startOperation: () => () => number;
  
  // State Management
  readonly saveState: () => void;
  readonly loadState: () => void;
  
  // Computed Properties
  readonly isReady: boolean;
  readonly hasProject: boolean;
  readonly performanceMode: boolean;
  readonly connectionStatus: 'connected' | 'disconnected' | 'checking';
}

// ================================
// SIMPLIFIED APP VIEW MODEL HOOK
// ================================

export const useAppViewModel = (): UseAppViewModelReturn => {
  // ================================
  // STATE MANAGEMENT (IMMUTABLE)
  // ================================
  
  const [viewModel, setViewModel] = useState<AppViewModel>(() => {
    const persistedState = StateManager.load();
    return {
      currentView: 'welcome', // Always start with welcome screen
      isLoading: false, // Start with loading false - we'll set it true during init only if needed
      error: undefined,
      project: undefined,
      user: undefined,
      performanceMode: persistedState.performanceMode ?? true,
      securityContext: undefined,
      complianceMode: false,
      availableProviders: [],
      smartRouting: true,
      selectedProvider: persistedState.preferredProvider,
      currentProject: undefined,
      session: undefined,
    };
  });
  
  const [aiProviders, setAiProviders] = useState<readonly AiProvider[]>([]);
  const [errorHistory, setErrorHistory] = useState<readonly AppError[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  
  // Performance tracking
  const performanceTracker = useRef(new PerformanceTracker());
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(() => 
    performanceTracker.current.getMetrics()
  );
  
  // State Management
  const initializeRef = useRef<boolean>(false);
  const errorCountRef = useRef<number>(0);
  const performanceStartTimeRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const stateUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  
  // ================================
  // FAILSAFE: Ensure app never stuck in loading
  // ================================
  
  useEffect(() => {
    // Failsafe: If app is stuck in loading for more than 10 seconds, force it to show welcome screen
    const failsafeTimer = setTimeout(() => {
      if (viewModel.isLoading) {
        console.warn('⚠️ App stuck in loading state, forcing to welcome screen');
        setViewModel(prev => ({ 
          ...prev, 
          isLoading: false, 
          currentView: 'welcome' 
        }));
      }
    }, 10000); // 10 seconds max loading time

    return () => clearTimeout(failsafeTimer);
  }, [viewModel.isLoading]);
  
  // ================================
  // MEMOIZED COMPUTED PROPERTIES
  // ================================
  
  const isReady = useMemo(() => 
    !viewModel.isLoading && !viewModel.error, 
    [viewModel.isLoading, viewModel.error]
  );
  
  const hasProject = useMemo(() => 
    viewModel.project !== undefined, 
    [viewModel.project]
  );
  
  const performanceMode = useMemo(() => 
    viewModel.performanceMode, 
    [viewModel.performanceMode]
  );
  
  // Memoized provider selection for expensive computations
  const optimalProvider = useMemo(() => {
    if (!aiProviders.length) return null;
    
    // Sort by performance and cost efficiency
    const sortedProviders = [...aiProviders].sort((a, b) => {
      const aCostEfficiency = a.latency * a.costPerToken;
      const bCostEfficiency = b.latency * b.costPerToken;
      return aCostEfficiency - bCostEfficiency;
    });
    
    return sortedProviders.find(p => p.isAvailable) || null;
  }, [aiProviders]);
  
  // ================================
  // PERFORMANCE MONITORING HOOKS
  // ================================
  
  const startOperation = useCallback(() => {
    return performanceTracker.current.startMeasurement();
  }, []);
  
  const getPerformanceMetrics = useCallback(() => {
    performanceTracker.current.updateMemoryUsage();
    return performanceTracker.current.getMetrics();
  }, []);
  
  // ================================
  // STATE PERSISTENCE HOOKS
  // ================================
  
  const saveState = useCallback(() => {
    const stateToSave: PersistedState = {
      lastProjectPath: viewModel.project?.rootPath,
      preferredProvider: viewModel.selectedProvider,
      performanceMode: viewModel.performanceMode,
      windowState: {
        view: viewModel.currentView,
      },
    };
    
    StateManager.save(stateToSave);
  }, [viewModel]);
  
  const loadState = useCallback(() => {
    const persistedState = StateManager.load();
    
    if (persistedState.lastProjectPath && persistedState.windowState?.view !== 'welcome') {
      // Auto-restore last project if available
      openProject(persistedState.lastProjectPath).catch(error => {
        console.warn('Failed to restore last project:', error);
      });
    }
  }, []);
  
  // ================================
  // AUTO-SAVE STATE CHANGES
  // ================================
  
  useEffect(() => {
    // Debounced state saving
    if (stateUpdateTimeoutRef.current) {
      clearTimeout(stateUpdateTimeoutRef.current);
    }
    
    stateUpdateTimeoutRef.current = setTimeout(() => {
      saveState();
    }, 1000); // Save 1 second after last change
    
    return () => {
      if (stateUpdateTimeoutRef.current) {
        clearTimeout(stateUpdateTimeoutRef.current);
      }
    };
  }, [saveState]);
  
  // ================================
  // PERFORMANCE METRICS UPDATES
  // ================================
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceMetrics(getPerformanceMetrics());
    }, 5000); // Update metrics every 5 seconds
    
    return () => clearInterval(interval);
  }, [getPerformanceMetrics]);
  
  // ================================
  // CONNECTION STATUS MONITORING
  // ================================
  
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await invoke<{success: boolean}>('get_app_stats');
        setConnectionStatus(result.success ? 'connected' : 'disconnected');
      } catch {
        setConnectionStatus('disconnected');
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // ================================
  // TYPE CONVERSION UTILITIES
  // ================================
  
  const convertBackendProvider = useCallback((backendProvider: BackendAiProvider): AiProvider => ({
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
  }), []);
  
  const convertBackendProject = useCallback((backendProject: BackendProjectContext): ProjectContext => ({
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
  }), []);
  
  // ================================
  // ERROR MANAGEMENT SYSTEM
  // ================================
  
  const handleErrorInternal = useCallback((error: AppError): void => {
    const endMeasurement = startOperation();
    errorCountRef.current += 1;
    performanceTracker.current.recordError();
    
    const enhancedError: AppError = {
      ...error,
      errorId: error.errorId || `err-${Date.now()}`,
      stackTrace: error.stackTrace || new Error().stack,
      userNotified: false,
      escalated: false,
    };
    
    setErrorHistory(prev => [...prev, enhancedError].slice(-10)); // Keep last 10 errors
    setViewModel(prev => ({ ...prev, error: enhancedError }));
    
    endMeasurement(); // Record error handling time
    
    // Enhanced error logging with performance context
    console.error('App Error:', {
      error: enhancedError,
      performanceMetrics: getPerformanceMetrics(),
      connectionStatus,
      timestamp: new Date().toISOString(),
    });
  }, [startOperation, getPerformanceMetrics, connectionStatus]);

  // ================================
  // CORE ACTIONS (MEMOIZED)
  // ================================

  const initializeApp = useCallback(async (): Promise<void> => {
    if (initializeRef.current) return;
    initializeRef.current = true;

    const endMeasurement = startOperation();
    
    try {
      console.log('🔄 Starting background app initialization...');
      
      // Don't set loading to true - let the welcome screen show immediately
      // setViewModel(prev => ({ ...prev, isLoading: true, error: undefined }));

      // Load providers with performance tracking and timeout (in background)
      let providers: AiProvider[] = [];
      try {
        console.log('🔄 Loading AI providers in background...');
        
        // Add timeout to prevent hanging
        const providerPromise = loadProviders();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Provider loading timeout')), 3000) // Reduced to 3s
        );
        
        providers = await Promise.race([providerPromise, timeoutPromise]);
        setAiProviders(providers);
        console.log(`✅ Loaded ${providers.length} AI providers successfully`);
      } catch (error) {
        console.warn('⚠️ Failed to load AI providers, continuing with empty list:', error);
        // Continue with empty providers list - app should still be usable
        setAiProviders([]);
      }

      // Set optimal provider if none selected and providers are available
      let selectedProvider = viewModel.selectedProvider;
      if (!selectedProvider && providers.length > 0) {
        // Find the first available provider
        const availableProvider = providers.find(p => p.isAvailable);
        if (availableProvider) {
          selectedProvider = availableProvider.id;
        }
      }

      // Load persisted state (in background)
      try {
        console.log('🔄 Loading persisted state in background...');
        loadState();
        console.log('✅ Persisted state loaded successfully');
      } catch (error) {
        console.warn('⚠️ Failed to load persisted state:', error);
      }

      // Update with loaded data without changing the view or loading state
      setViewModel(prev => ({ 
        ...prev, 
        availableProviders: providers,
        selectedProvider,
        // Keep currentView as is (welcome screen)
        // Keep isLoading as false
      }));

      console.log(`✅ Background app initialization completed in ${endMeasurement()}ms with ${providers.length} providers`);
    } catch (error) {
      endMeasurement();
      console.error('❌ Background app initialization failed:', error);
      
      // Don't change the view or loading state - let welcome screen continue showing
      handleErrorInternal({
        errorId: `init-${Date.now()}`,
        code: 'INIT_FAILED',
        message: 'Background initialization failed',
        category: 'system',
        severity: 'warning', // Reduced from error to warning since it's background
        recoverable: true,
        originalError: error,
        context: { initializationAttempt: 1 },
        timestamp: Date.now(),
        stackTrace: new Error().stack,
        userNotified: false,
        escalated: false,
      });
    }
  }, [startOperation, viewModel.selectedProvider, loadState]);

  // Additional memoized actions...
  const setCurrentView = useCallback((view: AppViewModel['currentView']) => {
    setViewModel(prev => ({ ...prev, currentView: view }));
  }, []);

  const openProject = useCallback(async (path: string): Promise<boolean> => {
    const endMeasurement = startOperation();
    
    try {
      setViewModel(prev => ({ ...prev, isLoading: true }));

      const result = await invoke<TauriResult<BackendProjectContext>>('open_project', { path });
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to open project');
      }

      const project = convertBackendProject(result.data);
      setViewModel(prev => ({ 
        ...prev, 
        project, 
        currentProject: project, 
        isLoading: false,
        currentView: 'editor' 
      }));

      console.log(`✅ Project opened successfully in ${endMeasurement()}ms`);
      return true;
    } catch (error) {
      endMeasurement();
      handleErrorInternal({
        errorId: `project-${Date.now()}`,
        code: 'PROJECT_OPEN_FAILED',
        message: `Failed to open project: ${path}`,
        category: 'system',
        severity: 'error',
        recoverable: true,
        originalError: error,
        context: { projectPath: path },
        timestamp: Date.now(),
        stackTrace: new Error().stack,
        userNotified: false,
        escalated: false,
      });
      return false;
    }
  }, [startOperation, convertBackendProject]);

  const closeProject = useCallback(() => {
    setViewModel(prev => ({ 
      ...prev, 
      project: undefined, 
      currentProject: undefined,
      currentView: 'welcome' 
    }));
  }, []);

  const togglePerformanceMode = useCallback(() => {
    setViewModel(prev => ({ ...prev, performanceMode: !prev.performanceMode }));
  }, []);

  const clearError = useCallback(() => {
    setViewModel(prev => ({ ...prev, error: undefined }));
  }, []);

  const getErrorHistory = useCallback(() => errorHistory, [errorHistory]);

  // ================================
  // PROVIDER LOADING WITH CACHING
  // ================================

  const loadProviders = useCallback(async (): Promise<AiProvider[]> => {
    const endMeasurement = startOperation();
    
    try {
      const result = await invoke<TauriResult<BackendAiProvider[]>>('get_ai_providers');
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to get AI providers from backend');
      }
      
      const providers = result.data.map(convertBackendProvider);
      
      console.log(`✅ Loaded ${providers.length} AI providers in ${endMeasurement()}ms`);
      return providers;
    } catch (error) {
      endMeasurement();
      throw error;
    }
  }, [startOperation, convertBackendProvider]);

  // ================================
  // CLEANUP ON UNMOUNT
  // ================================

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      saveState(); // Save state on unmount
      
      if (stateUpdateTimeoutRef.current) {
        clearTimeout(stateUpdateTimeoutRef.current);
      }
    };
  }, [saveState]);

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
    handleError: handleErrorInternal,
    clearError,
    getErrorHistory,
    
    // Performance Monitoring
    getPerformanceMetrics,
    startOperation,
    
    // State Management
    saveState,
    loadState,
    
    // Computed Properties
    isReady,
    hasProject,
    performanceMode,
    connectionStatus,
  };
}; 