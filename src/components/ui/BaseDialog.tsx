// Syntari AI IDE - Base Dialog Component
// Reusable modal dialog foundation with consistent styling

import React from 'react';
import { useDialogKeyboard } from '../../hooks/useDialogKeyboard';

interface BaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onSubmit?: () => void | Promise<void>;
  isLoading?: boolean;
  enableArrowNavigation?: boolean;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
}

export const BaseDialog: React.FC<BaseDialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = '500px',
  height,
  maxWidth = '90vw',
  maxHeight = '90vh',
  children,
  footer,
  onSubmit,
  isLoading = false,
  enableArrowNavigation = false,
  onArrowUp,
  onArrowDown,
}) => {
  useDialogKeyboard({
    isOpen,
    onClose,
    onSubmit,
    isLoading,
    enableArrowNavigation,
    onArrowUp,
    onArrowDown,
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" 
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-vscode-bg border border-vscode-border rounded-lg shadow-2xl flex flex-col"
        style={{ 
          width, 
          height,
          maxWidth, 
          maxHeight 
        }}
        onClick={handleContentClick}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-vscode-border">
          <h2 className="text-lg font-semibold text-vscode-fg">{title}</h2>
          {subtitle && (
            <p className="text-sm text-vscode-fg-muted mt-1">{subtitle}</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 border-t border-vscode-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}; 