// Syntari AI IDE - Context Menu Hook
// Manages context menu state and positioning

import { useState, useCallback, useEffect } from 'react';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface UseContextMenuReturn {
  contextMenu: ContextMenuState;
  showContextMenu: (x: number, y: number) => void;
  hideContextMenu: () => void;
  handleContextMenu: (event: React.MouseEvent) => void;
}

export const useContextMenu = (): UseContextMenuReturn => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });

  const showContextMenu = useCallback((x: number, y: number) => {
    // Adjust position to ensure menu doesn't go off-screen
    const menuWidth = 200; // Approximate menu width
    const menuHeight = 400; // Approximate menu height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position
    if (x + menuWidth > viewportWidth) {
      adjustedX = viewportWidth - menuWidth - 10;
    }

    // Adjust vertical position  
    if (y + menuHeight > viewportHeight) {
      adjustedY = viewportHeight - menuHeight - 10;
    }

    // Ensure minimum margins
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);

    setContextMenu({
      visible: true,
      x: adjustedX,
      y: adjustedY,
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
    });
  }, []);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    showContextMenu(event.clientX, event.clientY);
  }, [showContextMenu]);

  // Hide context menu on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && contextMenu.visible) {
        hideContextMenu();
      }
    };

    // Hide context menu on scroll
    const handleScroll = () => {
      if (contextMenu.visible) {
        hideContextMenu();
      }
    };

    // Hide context menu on window resize
    const handleResize = () => {
      if (contextMenu.visible) {
        hideContextMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [contextMenu.visible, hideContextMenu]);

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
    handleContextMenu,
  };
}; 