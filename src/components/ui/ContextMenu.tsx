// Syntari AI IDE - Context Menu System
// Professional right-click menus for files, tabs, and editor actions

import React, { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
  danger?: boolean;
}

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuContextType {
  showMenu: (items: ContextMenuItem[], position: ContextMenuPosition) => void;
  hideMenu: () => void;
  isVisible: boolean;
}

const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider');
  }
  return context;
};

interface ContextMenuProviderProps {
  children: React.ReactNode;
}

export const ContextMenuProvider: React.FC<ContextMenuProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [items, setItems] = useState<ContextMenuItem[]>([]);
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number>();

  const showMenu = useCallback((newItems: ContextMenuItem[], newPosition: ContextMenuPosition) => {
    // Adjust position to keep menu on screen
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const menuSize = {
      width: 200, // Estimated menu width
      height: newItems.length * 32 + 16 // Estimated menu height
    };

    const adjustedPosition = {
      x: newPosition.x + menuSize.width > viewport.width 
        ? newPosition.x - menuSize.width 
        : newPosition.x,
      y: newPosition.y + menuSize.height > viewport.height 
        ? newPosition.y - menuSize.height 
        : newPosition.y
    };

    setItems(newItems);
    setPosition(adjustedPosition);
    setIsVisible(true);
    setSubmenuOpen(null);
  }, []);

  const hideMenu = useCallback(() => {
    setIsVisible(false);
    setSubmenuOpen(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.disabled || item.submenu) return;
    
    item.action?.();
    hideMenu();
  }, [hideMenu]);

  const handleSubmenuToggle = useCallback((itemId: string) => {
    setSubmenuOpen(prev => prev === itemId ? null : itemId);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenu();
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isVisible, hideMenu]);

  // Disable browser context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (isVisible) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [isVisible]);

  const renderMenuItem = useCallback((item: ContextMenuItem, depth: number = 0) => {
    if (item.separator) {
      return (
        <div key={item.id} className="h-px bg-vscode-border my-1" />
      );
    }

    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isSubmenuOpen = submenuOpen === item.id;

    return (
      <div key={item.id} className="relative">
        <button
          onClick={() => hasSubmenu ? handleSubmenuToggle(item.id) : handleItemClick(item)}
          onMouseEnter={() => hasSubmenu && handleSubmenuToggle(item.id)}
          disabled={item.disabled}
          className={`
            w-full px-3 py-2 text-left text-sm flex items-center justify-between
            transition-colors duration-150
            ${item.disabled 
              ? 'text-vscode-fg-muted cursor-not-allowed' 
              : item.danger
                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                : 'text-vscode-fg hover:bg-vscode-list-hover'
            }
            ${depth > 0 ? 'pl-6' : ''}
          `}
        >
          <div className="flex items-center flex-1">
            {item.icon && (
              <span className="w-4 h-4 mr-3 flex items-center justify-center text-xs">
                {item.icon}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-vscode-fg-muted ml-4">
                {item.shortcut}
              </span>
            )}
          </div>
          {hasSubmenu && (
            <span className="ml-2 text-xs">▶</span>
          )}
        </button>

        {/* Submenu */}
        {hasSubmenu && isSubmenuOpen && (
          <div 
            className="
              absolute left-full top-0 ml-1 min-w-48
              bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg
              py-1 z-50
            "
          >
            {item.submenu!.map(subItem => renderMenuItem(subItem, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [submenuOpen, handleItemClick, handleSubmenuToggle]);

  const contextValue: ContextMenuContextType = {
    showMenu,
    hideMenu,
    isVisible
  };

  return (
    <ContextMenuContext.Provider value={contextValue}>
      {children}
      {isVisible && createPortal(
        <div
          ref={menuRef}
          className="
            fixed min-w-48 bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg
            py-1 z-[9999] animate-in fade-in-0 zoom-in-95 duration-200
          "
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`
          }}
        >
          {items.map(item => renderMenuItem(item))}
        </div>,
        document.body
      )}
    </ContextMenuContext.Provider>
  );
};

// Pre-built context menu configurations
export const fileContextMenu = (filePath: string, isDirectory: boolean) => {
  const baseItems: ContextMenuItem[] = [
    {
      id: 'open',
      label: isDirectory ? 'Open Folder' : 'Open File',
      icon: isDirectory ? '📂' : '📄',
      action: () => console.log('Open:', filePath)
    },
    {
      id: 'separator1',
      label: '',
      separator: true
    },
    {
      id: 'cut',
      label: 'Cut',
      icon: '✂️',
      shortcut: 'Ctrl+X',
      action: () => console.log('Cut:', filePath)
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: '📋',
      shortcut: 'Ctrl+C',
      action: () => console.log('Copy:', filePath)
    },
    {
      id: 'paste',
      label: 'Paste',
      icon: '📄',
      shortcut: 'Ctrl+V',
      action: () => console.log('Paste in:', filePath)
    },
    {
      id: 'separator2',
      separator: true
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: '✏️',
      shortcut: 'F2',
      action: () => console.log('Rename:', filePath)
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      shortcut: 'Delete',
      danger: true,
      action: () => console.log('Delete:', filePath)
    },
    {
      id: 'separator3',
      separator: true
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: '⚙️',
      action: () => console.log('Properties:', filePath)
    }
  ];

  if (!isDirectory) {
    baseItems.splice(3, 0, {
      id: 'openWith',
      label: 'Open With',
      icon: '🔧',
      submenu: [
        {
          id: 'textEditor',
          label: 'Text Editor',
          icon: '📝',
          action: () => console.log('Open with text editor:', filePath)
        },
        {
          id: 'codeEditor',
          label: 'Code Editor',
          icon: '💻',
          action: () => console.log('Open with code editor:', filePath)
        },
        {
          id: 'systemDefault',
          label: 'System Default',
          icon: '🖥️',
          action: () => console.log('Open with system default:', filePath)
        }
      ]
    });
  }

  return baseItems;
};

export const tabContextMenu = (tabIndex: number, isPinned: boolean) => {
  return [
    {
      id: 'close',
      label: 'Close Tab',
      icon: '✕',
      shortcut: 'Ctrl+W',
      action: () => console.log('Close tab:', tabIndex)
    },
    {
      id: 'closeOthers',
      label: 'Close Others',
      icon: '📋',
      action: () => console.log('Close other tabs:', tabIndex)
    },
    {
      id: 'closeToRight',
      label: 'Close to Right',
      icon: '➡️',
      action: () => console.log('Close tabs to right:', tabIndex)
    },
    {
      id: 'separator1',
      separator: true
    },
    {
      id: 'pin',
      label: isPinned ? 'Unpin Tab' : 'Pin Tab',
      icon: '📌',
      action: () => console.log('Toggle pin:', tabIndex)
    },
    {
      id: 'separator2',
      separator: true
    },
    {
      id: 'splitRight',
      label: 'Split Right',
      icon: '↔️',
      action: () => console.log('Split right:', tabIndex)
    },
    {
      id: 'splitDown',
      label: 'Split Down',
      icon: '↕️',
      action: () => console.log('Split down:', tabIndex)
    }
  ];
};

export const editorContextMenu = (hasSelection: boolean) => {
  return [
    {
      id: 'cut',
      label: 'Cut',
      icon: '✂️',
      shortcut: 'Ctrl+X',
      disabled: !hasSelection,
      action: () => console.log('Cut selection')
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: '📋',
      shortcut: 'Ctrl+C',
      disabled: !hasSelection,
      action: () => console.log('Copy selection')
    },
    {
      id: 'paste',
      label: 'Paste',
      icon: '📄',
      shortcut: 'Ctrl+V',
      action: () => console.log('Paste')
    },
    {
      id: 'separator1',
      separator: true
    },
    {
      id: 'selectAll',
      label: 'Select All',
      icon: '🔄',
      shortcut: 'Ctrl+A',
      action: () => console.log('Select all')
    },
    {
      id: 'separator2',
      separator: true
    },
    {
      id: 'find',
      label: 'Find',
      icon: '🔍',
      shortcut: 'Ctrl+F',
      action: () => console.log('Open find')
    },
    {
      id: 'replace',
      label: 'Replace',
      icon: '🔄',
      shortcut: 'Ctrl+H',
      action: () => console.log('Open replace')
    },
    {
      id: 'separator3',
      separator: true
    },
    {
      id: 'format',
      label: 'Format Document',
      icon: '✨',
      shortcut: 'Shift+Alt+F',
      action: () => console.log('Format document')
    },
    {
      id: 'ai',
      label: 'Ask AI Assistant',
      icon: '🤖',
      shortcut: 'Ctrl+K',
      action: () => console.log('Ask AI')
    }
  ];
};

// Utility hook for easy context menu integration
export const useContextMenuHandler = () => {
  const { showMenu } = useContextMenu();

  return useCallback((
    e: React.MouseEvent,
    items: ContextMenuItem[]
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    showMenu(items, { x: e.clientX, y: e.clientY });
  }, [showMenu]);
}; 