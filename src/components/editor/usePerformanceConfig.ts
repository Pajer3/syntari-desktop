// Syntari AI IDE - Performance Configuration Hook
// Extracted from CodeEditor.tsx for better maintainability

import { useState, useMemo, useCallback } from 'react';

export interface PerformanceConfig {
  enableVirtualization: boolean;
  chunkSize: number;
  debounceMs: number;
  maxFileSize: number; // in bytes
  enableLinting: boolean;
  enableMinimap: boolean;
}

interface PerformanceConfigHookResult {
  performanceMode: boolean;
  perfConfig: PerformanceConfig;
  togglePerformanceMode: () => void;
  setPerformanceMode: (enabled: boolean) => void;
}

export const usePerformanceConfig = (): PerformanceConfigHookResult => {
  const [performanceMode, setPerformanceModeState] = useState(false);

  // Performance configuration based on mode
  const perfConfig: PerformanceConfig = useMemo(() => ({
    enableVirtualization: true,
    chunkSize: performanceMode ? 25 : 50,
    debounceMs: performanceMode ? 100 : 300,
    maxFileSize: performanceMode ? 1024 * 1024 : 5 * 1024 * 1024, // 1MB vs 5MB
    enableLinting: !performanceMode,
    enableMinimap: !performanceMode,
  }), [performanceMode]);

  const togglePerformanceMode = useCallback(() => {
    setPerformanceModeState(prev => !prev);
  }, []);

  const setPerformanceMode = useCallback((enabled: boolean) => {
    setPerformanceModeState(enabled);
  }, []);

  return {
    performanceMode,
    perfConfig,
    togglePerformanceMode,
    setPerformanceMode,
  };
}; 