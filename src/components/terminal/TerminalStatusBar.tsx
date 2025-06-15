// Syntari AI IDE - Enhanced Terminal Status Bar
// Modern status bar with system info and performance metrics

import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Clock, 
  User,
  Folder,
  Terminal
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

export const TerminalStatusBar: React.FC<TerminalStatusBarProps> = ({
  osInfo,
  workingDirectory = '~',
  commandCount = 0,
  isConnected = true,
  className = '',
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getShortPath = (path: string) => {
    if (path.length <= 40) return path;
    const parts = path.split('/');
    if (parts.length <= 3) return path;
    return `.../${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  };

  return (
    <div className={`flex items-center justify-between px-4 py-2 text-xs bg-[#2d2d30] border-t border-[#3c3c3c] text-[#cccccc] ${className}`}>
      {/* Left Section - Connection & Path */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <div 
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500 opacity-50'}`}
          />
          <span className="text-[#cccccc]">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {osInfo && (
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3 text-[#007acc]" />
            <span className="text-[#cccccc]">
              {osInfo.username}@{osInfo.hostname}
            </span>
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          <Folder className="w-3 h-3 text-[#007acc]" />
          <span 
            className="text-[#cccccc]"
            title={workingDirectory}
          >
            {getShortPath(workingDirectory)}
          </span>
        </div>
      </div>

      {/* Center Section - Session Info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Terminal className="w-3 h-3 text-[#007acc]" />
          <span className="text-[#cccccc]">
            {commandCount} session{commandCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <Wifi className={`w-3 h-3 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
          <span className="text-[#cccccc]">
            {isConnected ? 'Active' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Right Section - Time */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3 text-[#858585]" />
          <span className="font-mono text-[#cccccc]">
            {formatTime(currentTime)}
          </span>
        </div>

        {osInfo && (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#007acc]/20 text-[#007acc] border border-[#007acc]/30">
            {osInfo.os.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}; 