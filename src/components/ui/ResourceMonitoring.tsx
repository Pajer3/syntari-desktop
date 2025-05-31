// Syntari AI IDE - Resource Monitoring Component
// Extracted from WelcomeScreen.tsx for better maintainability

import React from 'react';

interface ResourceMetric {
  name: string;
  current: string;
  max?: string;
  percentage: number;
  color: 'blue' | 'green' | 'orange' | 'red';
}

interface ResourceMonitoringProps {
  metrics?: ResourceMetric[];
}

const defaultMetrics: ResourceMetric[] = [
  {
    name: 'Memory Usage',
    current: '2.1 GB',
    max: '8 GB',
    percentage: 26,
    color: 'blue',
  },
  {
    name: 'CPU Usage',
    current: '15%',
    percentage: 15,
    color: 'green',
  },
];

export const ResourceMonitoring: React.FC<ResourceMonitoringProps> = ({
  metrics = defaultMetrics,
}) => {
  const getColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTextColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-400';
      case 'green': return 'text-green-400';
      case 'orange': return 'text-orange-400';
      case 'red': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-red-400">Resource Monitoring</h3>
      <div className="grid grid-cols-2 gap-6">
        {metrics.map((metric, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{metric.name}</span>
              <span className={`text-xs ${getTextColorClass(metric.color)}`}>
                {metric.max ? `${metric.current} / ${metric.max}` : metric.current}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getColorClass(metric.color)}`}
                style={{ width: `${metric.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 