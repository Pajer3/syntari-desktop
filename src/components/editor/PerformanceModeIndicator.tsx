// Syntari AI IDE - Performance Mode Indicator Component
// Extracted from CodeEditor.tsx for better maintainability

import React from 'react';

interface PerformanceModeIndicatorProps {
  isActive: boolean;
  onDisable: () => void;
}

export const PerformanceModeIndicator: React.FC<PerformanceModeIndicatorProps> = ({
  isActive,
  onDisable,
}) => {
  if (!isActive) return null;

  return (
    <div className="h-6 px-3 bg-orange-600/20 border-b border-orange-600/30 text-orange-300 text-xs flex items-center">
      ⚡ Performance Mode Active - Some features disabled for better performance
      <button 
        onClick={onDisable}
        className="ml-auto text-orange-300 hover:text-white transition-colors"
        title="Disable Performance Mode"
      >
        ×
      </button>
    </div>
  );
}; 