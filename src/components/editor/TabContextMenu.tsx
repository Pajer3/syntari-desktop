import React, { useRef, useEffect, useMemo } from 'react';
import type { FileTab } from './hooks/useEditorState';

interface TabContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  tabIndex: number;
  tab: FileTab | null;
  totalTabs: number;
  onClose: () => void;
  onAction: (action: string, tabIndex: number) => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = React.memo(({
  visible,
  x,
  y,
  tabIndex,
  tab,
  totalTabs,
  onClose,
  onAction,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Focus management for accessibility
    if (menuRef.current) {
      const firstButton = menuRef.current.querySelector('button:not([disabled])') as HTMLButtonElement;
      firstButton?.focus();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  const menuItems = useMemo(() => [
    { id: 'close', label: 'Close Tab', disabled: false, hotkey: 'Ctrl+W' },
    { id: 'close-others', label: 'Close Other Tabs', disabled: totalTabs <= 1 },
    { id: 'close-to-right', label: 'Close Tabs to the Right', disabled: tabIndex >= totalTabs - 1 },
    { id: 'close-all', label: 'Close All Tabs', disabled: totalTabs === 0 },
    { id: 'separator1', label: '---', disabled: true },
    { id: 'pin', label: tab?.isPinned ? 'Unpin Tab' : 'Pin Tab', disabled: false },
    { id: 'separator2', label: '---', disabled: true },
    { id: 'copy-path', label: 'Copy File Path', disabled: !tab?.file?.path },
    { id: 'reveal-explorer', label: 'Reveal in File Explorer', disabled: !tab?.file?.path },
  ], [tab?.isPinned, tab?.file?.path, tabIndex, totalTabs]);

  if (!visible || !tab) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-vscode-bg border border-vscode-border shadow-lg rounded-sm py-1 min-w-[220px]"
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Tab context menu"
    >
      {menuItems.map((item, index) => (
        item.label === '---' ? (
          <div key={item.id} className="border-t border-vscode-border my-1" role="separator" />
        ) : (
          <button
            key={item.id}
            onClick={() => {
              onAction(item.id, tabIndex);
              onClose();
            }}
            disabled={item.disabled}
            className={`
              w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between
              ${item.disabled 
                ? 'text-vscode-fg-muted cursor-default' 
                : 'text-vscode-fg hover:bg-vscode-list-hover cursor-pointer focus:bg-vscode-list-hover focus:outline-none'
              }
            `}
            role="menuitem"
            tabIndex={item.disabled ? -1 : 0}
            aria-disabled={item.disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!item.disabled) {
                  onAction(item.id, tabIndex);
                  onClose();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextButton = e.currentTarget.parentElement?.children[index + 2] as HTMLButtonElement;
                nextButton?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevButton = e.currentTarget.parentElement?.children[index] as HTMLButtonElement;
                prevButton?.focus();
              }
            }}
          >
            <span className="flex items-center">
              {item.label}
              {tab.isModified && item.id === 'close' && (
                <span className="ml-2 text-xs text-yellow-500" title="Unsaved changes">●</span>
              )}
            </span>
            {item.hotkey && (
              <span className="text-xs text-vscode-fg-muted ml-4">{item.hotkey}</span>
            )}
          </button>
        )
      ))}
    </div>
  );
});

TabContextMenu.displayName = 'TabContextMenu'; 