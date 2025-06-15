import React, { useState, useCallback } from 'react';
import { 
  Terminal, 
  AlertCircle, 
  FileText, 
  ChevronDown,
  Maximize2, 
  Minimize2,
} from 'lucide-react';
import { XTerminalPanel } from '../terminal/XTerminalPanel';
import { ProblemsPanel } from '../ui/ProblemsPanel';
import { OutputPanel } from '../ui/OutputPanel';

interface EditorFooterProps {
  projectPath: string;
  isVisible: boolean;
  activePanel: 'terminal' | 'problems' | 'output' | 'debug' | null;
  height: number;
  onToggleVisibility: () => void;
  onPanelChange: (panel: 'terminal' | 'problems' | 'output' | 'debug' | null) => void;
  onHeightChange: (height: number) => void;
  onAIRequest?: (context: string) => void;
  className?: string;
}

export const EditorFooter: React.FC<EditorFooterProps> = ({
  projectPath,
  isVisible,
  activePanel,
  height,
  onToggleVisibility,
  onPanelChange,
  onHeightChange,
  onAIRequest,
  className = '',
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const handlePanelClick = useCallback((panel: 'terminal' | 'problems' | 'output' | 'debug') => {
    if (activePanel === panel && isVisible) {
      // If clicking the active panel, toggle visibility
      onToggleVisibility();
    } else {
      // Switch to the clicked panel and ensure footer is visible
      onPanelChange(panel);
      if (!isVisible) {
        onToggleVisibility();
      }
    }
  }, [activePanel, isVisible, onToggleVisibility, onPanelChange]);

  const handleToggleMaximize = useCallback(() => {
    setIsMaximized(prev => {
      const newMaximized = !prev;
      onHeightChange(newMaximized ? 600 : 300);
      return newMaximized;
    });
  }, [onHeightChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startY = e.clientY;
    const startHeight = height;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY;
      const newHeight = Math.max(200, Math.min(800, startHeight + deltaY));
      onHeightChange(newHeight);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height, onHeightChange]);

  if (!isVisible) {
    return (
      <div className={`bg-vscode-sidebar border-t border-gray-700/40 ${className}`}>
        <div className="flex items-center h-8 px-3 text-xs">
          <button
            onClick={() => handlePanelClick('terminal')}
            className="flex items-center gap-2 px-2 py-1 text-vscode-fg-muted hover:text-vscode-fg hover:bg-gray-700/30 rounded transition-colors"
          >
            <Terminal size={14} />
            <span>Terminal</span>
          </button>
          <button
            onClick={() => handlePanelClick('problems')}
            className="flex items-center gap-2 px-2 py-1 text-vscode-fg-muted hover:text-vscode-fg hover:bg-gray-700/30 rounded transition-colors ml-1"
          >
            <AlertCircle size={14} />
            <span>Problems</span>
          </button>
          <button
            onClick={() => handlePanelClick('output')}
            className="flex items-center gap-2 px-2 py-1 text-vscode-fg-muted hover:text-vscode-fg hover:bg-gray-700/30 rounded transition-colors ml-1"
          >
            <FileText size={14} />
            <span>Output</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-vscode-sidebar border-t border-gray-700/40 flex flex-col ${className}`}
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        className={`h-1 bg-transparent hover:bg-vscode-accent cursor-row-resize transition-colors ${
          isResizing ? 'bg-vscode-accent' : ''
        }`}
        onMouseDown={handleMouseDown}
      />
      
      {/* Header with tabs */}
      <div className="flex items-center justify-between h-8 px-3 border-b border-gray-700/30 bg-vscode-sidebar">
        <div className="flex items-center">
          <button
            onClick={() => handlePanelClick('terminal')}
            className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors ${
              activePanel === 'terminal'
                ? 'bg-vscode-editor text-vscode-fg border-b-2 border-vscode-accent'
                : 'text-vscode-fg-muted hover:text-vscode-fg hover:bg-gray-700/30'
            }`}
          >
            <Terminal size={14} />
            <span>Terminal</span>
          </button>
          
          <button
            onClick={() => handlePanelClick('problems')}
            className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors ml-1 ${
              activePanel === 'problems'
                ? 'bg-vscode-editor text-vscode-fg border-b-2 border-vscode-accent'
                : 'text-vscode-fg-muted hover:text-vscode-fg hover:bg-gray-700/30'
            }`}
          >
            <AlertCircle size={14} />
            <span>Problems</span>
          </button>
          
          <button
            onClick={() => handlePanelClick('output')}
            className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-colors ml-1 ${
              activePanel === 'output'
                ? 'bg-vscode-editor text-vscode-fg border-b-2 border-vscode-accent'
                : 'text-vscode-fg-muted hover:text-vscode-fg hover:bg-gray-700/30'
            }`}
          >
            <FileText size={14} />
            <span>Output</span>
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleMaximize}
            className="p-1 text-vscode-fg-muted hover:text-vscode-fg hover:bg-gray-700/30 rounded transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          
          <button
            onClick={onToggleVisibility}
            className="p-1 text-vscode-fg-muted hover:text-vscode-fg hover:bg-gray-700/30 rounded transition-colors"
            title="Hide Panel"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      
      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === 'terminal' && (
          <XTerminalPanel
            projectPath={projectPath}
            isVisible={true}
            onToggleVisibility={() => {}} // Handled by footer
            height={height - 40} // Subtract header height
            className="border-none enhanced-terminal-ui"
            onAIRequest={onAIRequest}
            showHeader={true}
          />
        )}
        
        {activePanel === 'problems' && (
          <ProblemsPanel
            problems={[]} // You can pass actual problems here
            className="h-full"
          />
        )}
        
        {activePanel === 'output' && (
          <OutputPanel
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}; 