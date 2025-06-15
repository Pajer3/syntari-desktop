import React, { useState, useCallback } from 'react';
import { getFileIcon } from '../../config/fileIconMap';
import { EnhancedFileIcon } from '../ui/EnhancedFileIcon';

interface FileTab {
  file: {
    path: string;
    name: string;
    extension: string;
  };
  content: string;
  isModified: boolean;
  isPinned: boolean;
}

interface FileTabBarProps {
  tabs: FileTab[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onClose: (index: number) => void;
  onTabMove?: (fromIndex: number, toIndex: number) => void;
  onContextMenu?: (index: number, event: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
  onDragEnter?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, dropIndex: number) => void;
  draggedIndex?: number | null;
  dragOverIndex?: number | null;
  className?: string;
}

export const FileTabBar: React.FC<FileTabBarProps> = ({
  tabs,
  activeIndex,
  onSelect,
  onClose,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  draggedIndex,
  dragOverIndex,
  className = '',
}) => {
  const [hoveredTab, setHoveredTab] = useState<number | null>(null);
  const [closingTab, setClosingTab] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    onDragStart?.(e, index);
    
    // Cool drag effect
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(0.95) rotate(2deg)';
    target.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    
    setTimeout(() => {
      target.style.opacity = '0.6';
    }, 100);
  }, [onDragStart]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    onDragEnd?.();
    
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.style.transform = 'scale(1) rotate(0deg)';
  }, [onDragEnd]);

  const handleTabCloseClick = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    
    // Cool closing animation
    setClosingTab(index);
    
    setTimeout(() => {
      onClose(index);
      setClosingTab(null);
    }, 200);
  }, [onClose]);

  const handleTabContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    onContextMenu?.(index, e);
  }, [onContextMenu]);

  const handleMiddleClick = useCallback((e: React.MouseEvent, index: number) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      handleTabCloseClick(e, index);
    }
  }, [handleTabCloseClick]);

  return (
    <div className={`
      relative flex bg-gradient-to-r from-vscode-sidebar to-vscode-sidebar/95
      border-b border-gray-700/20 overflow-hidden
      backdrop-blur-sm
      ${className}
    `}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none" />
      
      <div className="relative flex overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-vscode-scrollbar/50 hover:scrollbar-thumb-vscode-scrollbar">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const isDraggedOver = dragOverIndex === index;
          const isBeingDragged = draggedIndex === index;
          const isHovered = hoveredTab === index;
          const isClosing = closingTab === index;

          return (
            <div
              key={`${tab.file.path}-${index}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragEnter={(e) => onDragEnter?.(e, index)}
              onDragOver={(e) => onDragOver?.(e, index)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop?.(e, index)}
              onContextMenu={(e) => handleTabContextMenu(e, index)}
              onClick={() => onSelect(index)}
              onMouseDown={(e) => handleMiddleClick(e, index)}
              onMouseEnter={() => setHoveredTab(index)}
              onMouseLeave={() => setHoveredTab(null)}
              className={`
                group relative flex items-center min-w-0 max-w-xs
                px-4 py-2.5 cursor-pointer select-none
                border-r border-gray-700/20
                transition-all duration-200 ease-out modern-tab
                ${isActive 
                  ? `modern-tab active bg-vscode-editor text-white z-10` 
                  : `text-vscode-fg hover:text-white`
                }
                ${isDraggedOver ? 'bg-vscode-list-active ring-1 ring-blue-500/30' : ''}
                ${isBeingDragged ? 'opacity-60 scale-95' : ''}
                ${isHovered && !isActive ? 'shadow-lg' : ''}
                ${isClosing ? 'animate-pulse scale-90 opacity-0' : ''}
              `}
              title={tab.file.path}
              style={{
                transform: isActive ? 'translateY(-1px)' : undefined,
              }}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-vscode-accent/10 via-transparent to-vscode-accent/10 rounded-t-lg" />
              )}
              <div className={`
                flex-shrink-0 mr-3 transition-all duration-200
                ${isActive ? 'scale-110' : 'group-hover:scale-105'}
              `}>
                <EnhancedFileIcon 
                  fileName={tab.file.name}
                  size={16}
                  className="file-tab-icon"
                />
              </div>

              <span className={`
                flex-1 truncate text-sm font-medium transition-all duration-200
                ${isActive ? 'font-semibold' : 'group-hover:font-medium'}
                ${tab.isModified ? 'text-yellow-100' : ''}
              `}>
                {tab.isModified ? '● ' : ''}{tab.file.name}
              </span>

              {tab.isModified && (
                <div className={`
                  flex-shrink-0 ml-2 flex items-center
                `} title="File has unsaved changes">
                  {/* Professional unsaved indicator */}
                  <div className={`
                    w-2.5 h-2.5 rounded-full
                    bg-gradient-to-r from-yellow-400 to-orange-500
                    shadow-lg shadow-yellow-400/40
                    ring-1 ring-yellow-300/30
                    ${isActive ? 'animate-pulse' : 'animate-pulse'}
                  `} />
                </div>
              )}

              {tab.isPinned && (
                <div className={`
                  flex-shrink-0 ml-2 text-xs transition-all duration-200
                  ${isActive ? 'text-vscode-accent' : 'text-vscode-fg-muted group-hover:text-vscode-fg'}
                `}>
                  📌
                </div>
              )}

              <button
                onClick={(e) => handleTabCloseClick(e, index)}
                className={`
                  flex-shrink-0 ml-3 p-1.5 rounded-full
                  text-vscode-fg-muted hover:text-white
                  bg-transparent hover:bg-red-500/80
                  backdrop-blur-sm
                  opacity-0 group-hover:opacity-100
                  transition-all duration-200 ease-out
                  transform hover:scale-110 active:scale-95
                  ${isActive ? 'opacity-70' : ''}
                  focus:opacity-100 focus:outline-none 
                  focus:ring-1 focus:ring-red-400/30
                  shadow-lg shadow-black/20 hover:shadow-red-500/30
                `}
                title="Close tab (Ctrl+W)"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" className="transition-transform duration-200">
                  <path d="M6 4.586L10.293.293a1 1 0 111.414 1.414L7.414 6l4.293 4.293a1 1 0 01-1.414 1.414L6 7.414l-4.293 4.293a1 1 0 01-1.414-1.414L4.586 6 .293 1.707A1 1 0 011.707.293L6 4.586z" />
                </svg>
              </button>

              {isDraggedOver && (
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-vscode-accent to-vscode-accent/50 shadow-lg shadow-vscode-accent/50 animate-pulse" />
              )}

              {isHovered && !isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-vscode-accent/50 to-transparent" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 flex items-center">
        {tabs.length > 0 && (
          <div className={`
            px-4 py-2 text-xs font-medium
            bg-gradient-to-r from-vscode-sidebar/80 to-vscode-sidebar/60
            backdrop-blur-md border-l border-gray-700/20
            text-vscode-fg-muted
            transition-all duration-200
          `}>
            <span className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-vscode-accent animate-pulse" />
              {tabs.length} {tabs.length === 1 ? 'file' : 'files'}
            </span>
          </div>
        )}
      </div>

      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-vscode-sidebar to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-vscode-sidebar to-transparent pointer-events-none" />
    </div>
  );
}; 