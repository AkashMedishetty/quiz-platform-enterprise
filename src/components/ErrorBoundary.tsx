import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(2, 15),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ERROR BOUNDARY] React error caught:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // This would integrate with your error reporting service
    // For now, we'll just log to console
    console.error('[ERROR REPORTING]', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorId: this.state.errorId,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2)).then(() => {
      alert('Error details copied to clipboard');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(errorDetails, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Error details copied to clipboard');
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-black/80 backdrop-blur-sm border-2 border-red-500 rounded-2xl p-8 text-center">
              {/* Error Icon */}
              <div className="w-24 h-24 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-12 h-12 text-red-400" />
              </div>

              {/* Error Title */}
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 font-mono tracking-tight">
                SYSTEM ERROR
              </h1>
              
              <div className="text-red-400 font-mono text-lg font-bold mb-6 tracking-wider">
                UNEXPECTED ERROR OCCURRED
              </div>

              {/* Error Message */}
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
                <div className="text-red-300 font-mono text-sm font-bold mb-2">ERROR DETAILS</div>
                <div className="text-red-200 font-mono text-sm break-words">
                  {this.state.error?.message || 'Unknown error occurred'}
                </div>
                {this.state.errorId && (
                  <div className="text-red-400 font-mono text-xs mt-2">
                    ID: {this.state.errorId}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white p-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white p-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reload Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white p-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold"
                >
                  <Home className="w-5 h-5" />
                  Go Home
                </button>
              </div>

              {/* Advanced Options */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={this.copyErrorDetails}
                  className="text-gray-400 hover:text-gray-300 font-mono text-xs underline flex items-center justify-center gap-2 mx-auto"
                >
                  <Bug className="w-3 h-3" />
                  Copy Error Details for Support
                </button>
              </div>

              {/* Development Mode Stack Trace */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-gray-400 font-mono text-sm cursor-pointer hover:text-gray-300">
                    🔧 Development Details (Click to expand)
                  </summary>
                  <div className="mt-4 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                    <div className="text-red-300 font-mono text-xs mb-2">Stack Trace:</div>
                    <pre className="text-red-200 font-mono text-xs whitespace-pre-wrap overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <>
                        <div className="text-red-300 font-mono text-xs mb-2 mt-4">Component Stack:</div>
                        <pre className="text-red-200 font-mono text-xs whitespace-pre-wrap overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* Help Text */}
            <div className="text-center mt-6">
              <p className="text-gray-400 font-mono text-sm">
                If this error persists, please contact support with the error ID above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lightweight error boundary for smaller components
export const SimpleErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({
  children,
  fallback
}) => (
  <ErrorBoundary
    fallback={fallback || (
      <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg">
        <div className="text-red-400 font-mono font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Component Error
        </div>
        <div className="text-red-300 font-mono text-sm mt-1">
          This component encountered an error. Please refresh the page.
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

// Hook for error reporting in functional components
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`[ERROR HANDLER] ${context || 'Unhandled error'}:`, error);
    
    // In a real app, you'd send this to your error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: { context } });
    }
  };

  return handleError;
}; 