import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorScreen, AppError } from './ui';
import { appLogger } from '../utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: AppError; onReset: () => void; onRetry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'component';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private readonly maxRetries = 3;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error: {
        message: error.message,
        code: error.name,
        recoverable: true,
        stack: error.stack,
      },
      errorId,
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, level = 'component' } = this.props;
    
    // Log the error
    appLogger.error('React Error Boundary triggered', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      level,
      retryCount: this.retryCount,
      errorId: this.state.errorId,
    });
    
    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
    
    // Report to error tracking service in production
    if (import.meta.env.PROD) {
      this.reportErrorToService(error, errorInfo);
    }
  }
  
  private reportErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // In a real app, you'd report to Sentry, Bugsnag, etc.
    // For now, just log to console in production
    console.error('Production Error Report:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      errorId: this.state.errorId,
    });
  }
  
  private handleRetry = (): void => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      appLogger.info(`Retrying component render (attempt ${this.retryCount}/${this.maxRetries})`);
      
      this.setState({
        hasError: false,
        error: null,
        errorId: null,
      });
    } else {
      appLogger.warn('Max retry attempts reached, cannot retry');
      
      this.setState(prevState => ({
        ...prevState,
        error: prevState.error ? {
          ...prevState.error,
          recoverable: false,
        } : null,
      }));
    }
  };
  
  private handleReset = (): void => {
    appLogger.info('Resetting error boundary');
    
    this.retryCount = 0;
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };
  
  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback: FallbackComponent, level = 'component' } = this.props;
    
    if (hasError && error) {
      // Use custom fallback component if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={error} 
            onReset={this.handleReset} 
            onRetry={this.handleRetry}
          />
        );
      }
      
      // Use default error screen for app-level errors
      if (level === 'app') {
        return (
          <ErrorScreen 
            error={error} 
            onReset={this.handleReset}
            onRetry={error.recoverable ? this.handleRetry : undefined}
          />
        );
      }
      
      // Simple inline error for component-level errors
      return (
        <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="text-red-500 text-xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-red-400 font-medium">Component Error</h3>
              <p className="text-gray-300 text-sm mt-1">{error.message}</p>
              
              {error.code && (
                <p className="text-gray-500 text-xs mt-1">Error: {error.code}</p>
              )}
              
              <div className="flex gap-2 mt-3">
                {error.recoverable && (
                  <button
                    onClick={this.handleRetry}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    Retry ({this.maxRetries - this.retryCount} left)
                  </button>
                )}
                
                <button
                  onClick={this.handleReset}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return children;
  }
}

// Convenience wrapper for app-level error boundary
export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="app">
    {children}
  </ErrorBoundary>
);

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ComponentType<{ error: AppError; onReset: () => void; onRetry: () => void }>;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary 
      level="component" 
      fallback={options?.fallback}
      onError={options?.onError}
    >
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}; 