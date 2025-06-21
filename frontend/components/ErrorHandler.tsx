import React from 'react';

interface ErrorHandlerProps {
  error: string | Error | null;
  type?: 'inline' | 'modal' | 'toast';
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
}

const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  type = 'inline',
  onRetry,
  onDismiss,
  showDetails = false
}) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  
  const getErrorIcon = (message: string) => {
    if (message.toLowerCase().includes('api key')) return '🔑';
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('connection')) return '🌐';
    if (message.toLowerCase().includes('timeout')) return '⏱️';
    if (message.toLowerCase().includes('rate limit')) return '🚦';
    if (message.toLowerCase().includes('permission')) return '🔒';
    return '❌';
  };

  const getErrorSuggestion = (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('api key')) {
      return 'Please check your Gemini API key in Settings. Make sure it\'s valid and has the correct permissions.';
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return 'Check your internet connection and try again. The service might be temporarily unavailable.';
    }
    if (lowerMessage.includes('timeout')) {
      return 'The request took too long. Try again with a simpler prompt or check your connection.';
    }
    if (lowerMessage.includes('rate limit')) {
      return 'You\'ve reached the API rate limit. Please wait a moment before trying again.';
    }
    if (lowerMessage.includes('permission')) {
      return 'You don\'t have permission to perform this action. Check your API key permissions.';
    }
    if (lowerMessage.includes('quota')) {
      return 'You\'ve exceeded your API quota. Check your usage in Google AI Studio.';
    }
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  };

  const renderInlineError = () => (
    <div className="error-container error-inline">
      <div className="error-content">
        <div className="error-header">
          <span className="error-icon">{getErrorIcon(errorMessage)}</span>
          <h4 className="error-title">Something went wrong</h4>
          {onDismiss && (
            <button className="error-dismiss" onClick={onDismiss}>×</button>
          )}
        </div>
        
        <div className="error-message">{errorMessage}</div>
        
        <div className="error-suggestion">
          💡 {getErrorSuggestion(errorMessage)}
        </div>
        
        {showDetails && typeof error === 'object' && error.stack && (
          <details className="error-details">
            <summary>Technical Details</summary>
            <pre className="error-stack">{error.stack}</pre>
          </details>
        )}
        
        <div className="error-actions">
          {onRetry && (
            <button className="error-btn error-retry" onClick={onRetry}>
              🔄 Try Again
            </button>
          )}
          <button 
            className="error-btn error-help"
            onClick={() => window.open('https://ai.google.dev/gemini-api/docs', '_blank')}
          >
            📚 Get Help
          </button>
        </div>
      </div>
    </div>
  );

  const renderModalError = () => (
    <div className="error-overlay">
      <div className="error-modal">
        <div className="error-modal-header">
          <span className="error-icon">{getErrorIcon(errorMessage)}</span>
          <h3>Error Occurred</h3>
          {onDismiss && (
            <button className="error-close" onClick={onDismiss}>×</button>
          )}
        </div>
        
        <div className="error-modal-body">
          <div className="error-message">{errorMessage}</div>
          <div className="error-suggestion">
            💡 {getErrorSuggestion(errorMessage)}
          </div>
        </div>
        
        <div className="error-modal-footer">
          {onRetry && (
            <button className="error-btn error-retry" onClick={onRetry}>
              🔄 Try Again
            </button>
          )}
          {onDismiss && (
            <button className="error-btn error-cancel" onClick={onDismiss}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderToastError = () => (
    <div className="error-toast">
      <div className="error-toast-content">
        <span className="error-icon">{getErrorIcon(errorMessage)}</span>
        <div className="error-toast-text">
          <div className="error-message">{errorMessage}</div>
        </div>
        {onDismiss && (
          <button className="error-dismiss" onClick={onDismiss}>×</button>
        )}
      </div>
      {onRetry && (
        <button className="error-toast-retry" onClick={onRetry}>
          🔄 Retry
        </button>
      )}
    </div>
  );

  switch (type) {
    case 'modal':
      return renderModalError();
    case 'toast':
      return renderToastError();
    default:
      return renderInlineError();
  }
};

export default ErrorHandler;
