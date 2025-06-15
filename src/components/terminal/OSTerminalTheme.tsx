import React from 'react';

export interface TerminalTheme {
  backgroundColor: string;
  textColor: string;
  promptColor: string;
  commandColor: string;
  outputColor: string;
  errorColor: string;
  successColor: string;
  borderColor: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  cursorColor: string;
  selectionColor: string;
}

export interface OSTerminalInfo {
  os: string;
  shell: string;
  username: string;
  hostname: string;
}

// OS-specific terminal themes
export const getTerminalTheme = (osInfo: OSTerminalInfo): TerminalTheme => {
  const { os } = osInfo;
  
  switch (os.toLowerCase()) {
    case 'windows':
      return {
        backgroundColor: '#0c0c0c',
        textColor: '#cccccc',
        promptColor: '#ffffff',
        commandColor: '#ffffff',
        outputColor: '#cccccc',
        errorColor: '#ff6b6b',
        successColor: '#51cf66',
        borderColor: '#404040',
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        lineHeight: '1.4',
        cursorColor: '#ffffff',
        selectionColor: 'rgba(255, 255, 255, 0.2)',
      };
      
    case 'macos':
    case 'darwin':
      return {
        backgroundColor: '#1d1d1d',
        textColor: '#ffffff',
        promptColor: '#ffffff',
        commandColor: '#ffffff',
        outputColor: '#ffffff',
        errorColor: '#ff453a',
        successColor: '#32d74b',
        borderColor: '#2d2d2d',
        fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
        fontSize: '13px',
        lineHeight: '1.5',
        cursorColor: '#ffffff',
        selectionColor: 'rgba(255, 255, 255, 0.2)',
      };
      
    case 'linux':
    default:
      return {
        backgroundColor: '#300a24',
        textColor: '#ffffff',
        promptColor: '#8ae234',
        commandColor: '#ffffff',
        outputColor: '#ffffff',
        errorColor: '#ff6c6b',
        successColor: '#98fb98',
        borderColor: '#4a4a4a',
        fontFamily: '"Ubuntu Mono", "DejaVu Sans Mono", "Liberation Mono", "Consolas", "Courier New", monospace',
        fontSize: '14px',
        lineHeight: '1.4',
        cursorColor: '#ffffff',
        selectionColor: 'rgba(255, 255, 255, 0.2)',
      };
  }
};

// Generate OS-specific prompt
export const generatePrompt = (osInfo: OSTerminalInfo, workingDirectory: string): string => {
  const { os, shell, username, hostname } = osInfo;
  const currentDir = workingDirectory.split('/').pop() || workingDirectory.split('\\').pop() || '~';
  
  switch (os.toLowerCase()) {
    case 'windows':
      if (shell.toLowerCase().includes('powershell')) {
        return `PS ${workingDirectory}>`;
      } else {
        return `${workingDirectory}>`;
      }
      
    case 'macos':
    case 'darwin':
      return `${username}@${hostname} ${currentDir} %`;
      
    case 'linux':
    default:
      return `${username}@${hostname}:${currentDir}$`;
  }
};

// Get OS-specific shell commands
export const getOSCommands = (os: string): string[] => {
  switch (os.toLowerCase()) {
    case 'windows':
      return ['dir', 'cd', 'cls', 'type', 'copy', 'move', 'del', 'mkdir', 'rmdir', 'echo', 'set', 'where'];
      
    case 'macos':
    case 'darwin':
      return ['ls', 'cd', 'pwd', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'echo', 'grep', 'find', 'which', 'brew'];
      
    case 'linux':
    default:
      return ['ls', 'cd', 'pwd', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'echo', 'grep', 'find', 'which', 'apt', 'yum', 'dnf'];
  }
};

// Terminal window decorations component
interface TerminalWindowProps {
  osInfo: OSTerminalInfo;
  title: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  children: React.ReactNode;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  osInfo,
  title,
  onClose,
  onMinimize,
  onMaximize,
  children,
}) => {
  const theme = getTerminalTheme(osInfo);
  
  const renderWindowControls = () => {
    switch (osInfo.os.toLowerCase()) {
      case 'macos':
      case 'darwin':
        return (
          <div className="flex items-center space-x-2 px-4 py-2">
            <button
              onClick={onClose}
              className="w-3 h-3 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
              title="Close"
            />
            <button
              onClick={onMinimize}
              className="w-3 h-3 bg-yellow-500 hover:bg-yellow-600 rounded-full transition-colors"
              title="Minimize"
            />
            <button
              onClick={onMaximize}
              className="w-3 h-3 bg-green-500 hover:bg-green-600 rounded-full transition-colors"
              title="Maximize"
            />
            <span className="ml-4 text-sm text-gray-400 font-medium">{title}</span>
          </div>
        );
        
      case 'windows':
        return (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
            <span className="text-sm text-gray-300 font-medium">{title}</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={onMinimize}
                className="w-8 h-6 bg-transparent hover:bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                title="Minimize"
              >
                <span className="text-xs">−</span>
              </button>
              <button
                onClick={onMaximize}
                className="w-8 h-6 bg-transparent hover:bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                title="Maximize"
              >
                <span className="text-xs">□</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-6 bg-transparent hover:bg-red-600 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                title="Close"
              >
                <span className="text-xs">×</span>
              </button>
            </div>
          </div>
        );
        
      case 'linux':
      default:
        return (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-700">
            <span className="text-sm text-gray-200 font-medium">{title}</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={onMinimize}
                className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center text-gray-200 hover:text-white transition-colors"
                title="Minimize"
              >
                <span className="text-xs">−</span>
              </button>
              <button
                onClick={onMaximize}
                className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center text-gray-200 hover:text-white transition-colors"
                title="Maximize"
              >
                <span className="text-xs">□</span>
              </button>
              <button
                onClick={onClose}
                className="w-6 h-6 bg-red-600 hover:bg-red-500 rounded flex items-center justify-center text-white transition-colors"
                title="Close"
              >
                <span className="text-xs">×</span>
              </button>
            </div>
          </div>
        );
    }
  };
  
  return (
    <div 
      className="flex flex-col h-full rounded-lg overflow-hidden shadow-2xl"
      style={{ 
        backgroundColor: theme.backgroundColor,
        border: `1px solid ${theme.borderColor}`,
        fontFamily: theme.fontFamily,
      }}
    >
      {renderWindowControls()}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

// Blinking cursor component
export const BlinkingCursor: React.FC<{ theme: TerminalTheme }> = ({ theme }) => {
  const cursorStyle: React.CSSProperties = {
    width: '8px',
    height: '20px',
    backgroundColor: theme.cursorColor,
    display: 'inline-block',
    animation: 'blink 1s infinite',
  };

  return (
    <>
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
      <span style={cursorStyle} />
    </>
  );
}; 