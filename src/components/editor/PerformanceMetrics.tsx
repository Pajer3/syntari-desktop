// Syntari AI IDE - Performance Metrics Component
// Extracted from CodeEditor.tsx for better maintainability

import React from 'react';
import type { PerformanceConfig } from './usePerformanceConfig';

interface PerformanceMetricsProps {
  isVisible: boolean;
  cacheSize: number;
  perfConfig: PerformanceConfig;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  isVisible,
  cacheSize,
  perfConfig,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded border">
      <div>Cache: {cacheSize} files</div>
      <div>Mode: Performance</div>
      <div>Chunk: {perfConfig.chunkSize}</div>
      <div>Debounce: {perfConfig.debounceMs}ms</div>
      <div>Max Size: {Math.round(perfConfig.maxFileSize / 1024 / 1024)}MB</div>
    </div>
  );
}; 