// Syntari AI IDE - Getting Started Section Component
// Extracted from WelcomeScreen.tsx for better maintainability

import React from 'react';
import type { GettingStartedStep } from '../../constants/welcomeData';

interface GettingStartedSectionProps {
  steps: readonly GettingStartedStep[];
}

export const GettingStartedSection: React.FC<GettingStartedSectionProps> = ({ steps }) => {
  return (
    <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-yellow-400">Getting Started</h3>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700/20 rounded-lg">
            <div className={`w-8 h-8 bg-${step.color}-600/10 border border-${step.color}-600/20 rounded-lg flex items-center justify-center`}>
              <span className="text-lg">{step.icon}</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-white mb-1">{step.title}</h4>
              <p className="text-xs text-gray-400">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 