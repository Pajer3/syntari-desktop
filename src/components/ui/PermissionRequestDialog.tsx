import React from 'react';

interface PermissionRequestDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  permissions?: Array<{
    icon: string;
    text: string;
  }>;
}

const DEFAULT_PERMISSIONS = [
  { icon: '📁', text: 'Read project files and folders' },
  { icon: '🔍', text: 'Analyze code structure and dependencies' },
  { icon: '🤖', text: 'Provide context-aware AI assistance' },
];

export const PermissionRequestDialog: React.FC<PermissionRequestDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "File System Access",
  description = "Syntari AI IDE needs permission to read your project folder to analyze your code structure, dependencies, and provide intelligent assistance.",
  permissions = DEFAULT_PERMISSIONS
}) => {
  // Handle ESC key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="dialog"
      aria-labelledby="permission-title"
      aria-describedby="permission-description"
    >
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🔒</div>
          <h2 
            id="permission-title"
            className="text-xl font-semibold text-white mb-2"
          >
            {title}
          </h2>
          <p 
            id="permission-description"
            className="text-gray-400 text-sm leading-relaxed"
          >
            {description}
          </p>
        </div>
        
        <div className="space-y-3 mb-6 text-sm text-gray-300">
          {permissions.map((permission, index) => (
            <div key={index} className="flex items-center space-x-3">
              <span className="text-lg">{permission.icon}</span>
              <span>{permission.text}</span>
            </div>
          ))}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            autoFocus
          >
            Allow Access
          </button>
        </div>
      </div>
    </div>
  );
}; 