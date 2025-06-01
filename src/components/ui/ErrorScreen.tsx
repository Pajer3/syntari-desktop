import React from 'react';

interface AppError {
  message: string;
  code?: string;
  recoverable?: boolean;
  stack?: string;
}

interface ErrorScreenProps {
  error: AppError;
  onRetry?: () => void;
  onReset?: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ 
  error, 
  onRetry, 
  onReset 
}) => (
  <div className="flex items-center justify-center h-full bg-gray-900 text-white">
    <div className="text-center max-w-md">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-semibold mb-2 text-red-400">Application Error</h2>
      <p className="text-gray-400 mb-4">{error.message}</p>
      
      {error.code && (
        <p className="text-sm text-gray-500 mb-6">Code: {error.code}</p>
      )}
      
      <div className="flex gap-3 justify-center">
        {error.recoverable && onRetry && (
          <button 
            onClick={onRetry}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        )}
        
        {onReset && (
          <button 
            onClick={onReset}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Reset Application
          </button>
        )}
      </div>
      
      {error.stack && import.meta.env.DEV && (
        <details className="mt-6 text-left">
          <summary className="text-sm text-gray-500 cursor-pointer">
            Show Stack Trace (Development)
          </summary>
          <pre className="text-xs text-gray-600 mt-2 p-2 bg-gray-800 rounded overflow-auto max-h-32">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  </div>
);

export type { AppError }; 