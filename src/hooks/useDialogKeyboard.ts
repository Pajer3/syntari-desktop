// Syntari AI IDE - Reusable Dialog Keyboard Hook
// Shared keyboard handling for modal dialogs

import { useEffect, useCallback } from 'react';

interface UseDialogKeyboardOptions {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: () => void | Promise<void>;
  isLoading?: boolean;
  enableArrowNavigation?: boolean;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
}

export const useDialogKeyboard = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  enableArrowNavigation = false,
  onArrowUp,
  onArrowDown,
}: UseDialogKeyboardOptions) => {
  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if (!isOpen || isLoading) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;

        case 'Enter':
          if (onSubmit) {
            e.preventDefault();
            e.stopPropagation();
            await onSubmit();
          }
          break;

        case 'ArrowUp':
          if (enableArrowNavigation && onArrowUp) {
            e.preventDefault();
            onArrowUp();
          }
          break;

        case 'ArrowDown':
          if (enableArrowNavigation && onArrowDown) {
            e.preventDefault();
            onArrowDown();
          }
          break;
      }
    },
    [isOpen, isLoading, onClose, onSubmit, enableArrowNavigation, onArrowUp, onArrowDown]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return { handleKeyDown };
}; 