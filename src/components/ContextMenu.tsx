// Syntari AI IDE - Professional Context Menu Component
// Replaces browser default context menu with IDE-themed options

import React from 'react';

interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: string;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
}

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  items,
  onClose,
}) => {
  if (!visible) return null;

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled && item.action) {
      item.action();
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Invisible backdrop to catch clicks outside */}
      <div
        className="fixed inset-0 z-50"
        onClick={handleBackdropClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* Context Menu */}
      <div
        className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl py-2 min-w-[200px] backdrop-blur-sm"
        style={{
          left: x,
          top: y,
          backgroundColor: 'rgba(55, 65, 81, 0.95)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, index) => (
          <div key={item.id || index}>
            {item.separator ? (
              <div className="h-px bg-gray-600/50 my-1 mx-2" />
            ) : (
              <button
                className={`context-menu-item w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-700/50 transition-colors ${
                  item.disabled 
                    ? 'text-gray-500 cursor-not-allowed' 
                    : 'text-gray-200 hover:text-white'
                }`}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
              >
                <div className="flex items-center space-x-3">
                  {item.icon && (
                    <span className="text-base">{item.icon}</span>
                  )}
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-xs text-gray-400 ml-4">
                    {item.shortcut}
                  </span>
                )}
                {item.submenu && (
                  <span className="text-gray-400 ml-2">▶</span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

// Default context menu items for the IDE
export const getDefaultContextMenuItems = (
  hasSelection: boolean = false,
  isEditable: boolean = false,
  filePath?: string
): ContextMenuItem[] => {
  const items: ContextMenuItem[] = [];

  // Edit Actions
  if (isEditable) {
    items.push(
      {
        id: 'undo',
        label: 'Undo',
        icon: '↶',
        shortcut: 'Ctrl+Z',
        action: () => document.execCommand('undo'),
      },
      {
        id: 'redo',
        label: 'Redo',
        icon: '↷',
        shortcut: 'Ctrl+Y',
        action: () => document.execCommand('redo'),
      },
      { id: 'sep1', separator: true }
    );
  }

  // Clipboard Actions
  items.push(
    {
      id: 'cut',
      label: 'Cut',
      icon: '✂️',
      shortcut: 'Ctrl+X',
      disabled: !hasSelection,
      action: () => document.execCommand('cut'),
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: '📋',
      shortcut: 'Ctrl+C',
      disabled: !hasSelection,
      action: () => document.execCommand('copy'),
    },
    {
      id: 'paste',
      label: 'Paste',
      icon: '📌',
      shortcut: 'Ctrl+V',
      disabled: !isEditable,
      action: () => document.execCommand('paste'),
    },
    { id: 'sep2', separator: true }
  );

  // Selection Actions
  items.push(
    {
      id: 'select-all',
      label: 'Select All',
      icon: '🔲',
      shortcut: 'Ctrl+A',
      action: () => document.execCommand('selectAll'),
    }
  );

  // AI Actions
  items.push(
    { id: 'sep3', separator: true },
    {
      id: 'format-document',
      label: 'Format Document',
      icon: '🎨',
      shortcut: 'Shift+Alt+F',
      action: () => {
        // Trigger Monaco formatter
        const event = new CustomEvent('syntari:formatDocument');
        window.dispatchEvent(event);
      },
    },
    {
      id: 'go-to-definition',
      label: 'Go to Definition',
      icon: '🎯',
      shortcut: 'F12',
      disabled: !hasSelection,
      action: () => {
        const event = new CustomEvent('syntari:goToDefinition');
        window.dispatchEvent(event);
      },
    },
    {
      id: 'find-references',
      label: 'Find All References',
      icon: '🔍',
      disabled: !hasSelection,
      action: () => {
        const event = new CustomEvent('syntari:findReferences');
        window.dispatchEvent(event);
      },
    },
    {
      id: 'rename-symbol',
      label: 'Rename Symbol',
      icon: '✏️',
      shortcut: 'F2',
      disabled: !hasSelection,
      action: () => {
        const event = new CustomEvent('syntari:renameSymbol');
        window.dispatchEvent(event);
      },
    }
  );

  // File Actions (if applicable)
  if (filePath) {
    items.push(
      { id: 'sep4', separator: true },
      {
        id: 'open-file',
        label: 'Open in Editor',
        icon: '📝',
        action: () => console.log('Open file in editor:', filePath),
      },
      {
        id: 'reveal-explorer',
        label: 'Reveal in Explorer',
        icon: '📁',
        action: () => console.log('Reveal in file explorer:', filePath),
      }
    );
  }

  // Developer Actions
  items.push(
    { id: 'sep5', separator: true },
    {
      id: 'inspect',
      label: 'Inspect Element',
      icon: '🔍',
      shortcut: 'F12',
      action: () => console.log('Open developer tools'),
    },
    {
      id: 'reload',
      label: 'Reload',
      icon: '🔄',
      shortcut: 'Ctrl+R',
      action: () => window.location.reload(),
    }
  );

  return items;
}; 