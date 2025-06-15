// Syntari AI IDE - Enhanced Terminal Status Bar
// Modern status bar with system info and performance metrics

import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Wifi, 
  Activity, 
  Clock, 
  User,
  Folder,
  Hash,
  Zap
} from 'lucide-react';

interface TerminalStatusBarProps {
  osInfo?: {
    os: string;
    shell: string;
    username: string;
    hostname: string;
  };
  workingDirectory?: string;
  commandCount?: number;
  isConnected?: boolean;
  className?: string;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkActivity: boolean;
}

export const TerminalStatusBar: React.FC<TerminalStatusBarProps> = ({
  osInfo,
  workingDirectory = '~',
  commandCount = 0,
  isConnected = true,
  className = '',
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkActivity: false,
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simulate system metrics (in a real app, this would come from system APIs)
  useEffect(() => {
    const metricsTimer = setInterval(() => {
      setMetrics({
        cpuUsage: Math.random() * 100,
        memoryUsage: 45 + Math.random() * 30,
        diskUsage: 60 + Math.random() * 20,
        networkActivity: Math.random() > 0.7,
      });
    }, 2000);

    return () => clearInterval(metricsTimer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getMetricColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'var(--terminal-success)';
    if (value < thresholds[1]) return 'var(--terminal-warning)';
    return 'var(--terminal-error)';
  };

  const getShortPath = (path: string) => {
    if (path.length <= 30) return path;
    const parts = path.split('/');
    if (parts.length <= 3) return path;
    return `.../${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  };

  return (
    <div 
      className={`flex items-center justify-between px-4 py-2 text-xs border-t backdrop-blur-md ${className}`}
      style={{
        backgroundColor: 'var(--terminal-glass-bg)',
        borderColor: 'var(--terminal-border)',
        backdropFilter: 'var(--terminal-backdrop-blur)',
        WebkitBackdropFilter: 'var(--terminal-backdrop-blur)',
        fontFamily: 'var(--terminal-font-family)',
      }}
    >
      {/* Left Section - System Info */}
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          <div 
            className={`w-2 h-2 rounded-full ${isConnected ? 'animate-pulse' : 'opacity-50'}`}
            style={{ 
              backgroundColor: isConnected ? 'var(--terminal-success)' : 'var(--terminal-error)' 
            }}
          />
          <span style={{ color: 'var(--terminal-output)' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* OS & Shell Info */}
        {osInfo && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" style={{ color: 'var(--terminal-info)' }} />
              <span style={{ color: 'var(--terminal-output)' }}>
                {osInfo.username}@{osInfo.hostname}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Folder className="w-3 h-3" style={{ color: 'var(--terminal-accent)' }} />
              <span 
                style={{ color: 'var(--terminal-prompt)' }}
                title={workingDirectory}
              >
                {getShortPath(workingDirectory)}
              </span>
            </div>
          </div>
        )}

        {/* Command Counter */}
        <div className="flex items-center space-x-1">
          <Hash className="w-3 h-3" style={{ color: 'var(--terminal-warning)' }} />
          <span style={{ color: 'var(--terminal-output)' }}>
            {commandCount} commands
          </span>
        </div>
      </div>

      {/* Center Section - System Metrics */}
      <div className="flex items-center space-x-4">
        {/* CPU Usage */}
        <div className="flex items-center space-x-1">
          <Cpu className="w-3 h-3" style={{ color: 'var(--terminal-info)' }} />
          <span style={{ color: getMetricColor(metrics.cpuUsage, [50, 80]) }}>
            {metrics.cpuUsage.toFixed(0)}%
          </span>
        </div>

        {/* Memory Usage */}
        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3" style={{ color: 'var(--terminal-accent)' }} />
          <span style={{ color: getMetricColor(metrics.memoryUsage, [60, 85]) }}>
            {metrics.memoryUsage.toFixed(0)}%
          </span>
        </div>

        {/* Disk Usage */}
        <div className="flex items-center space-x-1">
          <HardDrive className="w-3 h-3" style={{ color: 'var(--terminal-warning)' }} />
          <span style={{ color: getMetricColor(metrics.diskUsage, [70, 90]) }}>
            {metrics.diskUsage.toFixed(0)}%
          </span>
        </div>

        {/* Network Activity */}
        <div className="flex items-center space-x-1">
          <Wifi 
            className={`w-3 h-3 ${metrics.networkActivity ? 'animate-pulse' : ''}`}
            style={{ color: metrics.networkActivity ? 'var(--terminal-success)' : 'var(--terminal-timestamp)' }} 
          />
          <span style={{ color: 'var(--terminal-output)' }}>
            {metrics.networkActivity ? 'Active' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Right Section - Time & Performance */}
      <div className="flex items-center space-x-4">
        {/* Performance Indicator */}
        <div className="flex items-center space-x-1">
          <Zap className="w-3 h-3 animate-pulse" style={{ color: 'var(--terminal-accent)' }} />
          <span style={{ color: 'var(--terminal-success)' }}>
            High Performance
          </span>
        </div>

        {/* Current Time */}
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" style={{ color: 'var(--terminal-timestamp)' }} />
          <span 
            className="font-mono"
            style={{ color: 'var(--terminal-output)' }}
          >
            {formatTime(currentTime)}
          </span>
        </div>

        {/* OS Badge */}
        {osInfo && (
          <div 
            className="px-2 py-0.5 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: 'var(--terminal-prompt-bg)',
              color: 'var(--terminal-prompt)',
              borderColor: 'var(--terminal-prompt-border)',
            }}
          >
            {osInfo.os.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}; 