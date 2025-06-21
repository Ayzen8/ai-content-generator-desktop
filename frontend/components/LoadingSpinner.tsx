import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  type?: 'spinner' | 'dots' | 'pulse' | 'bars';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  text, 
  type = 'spinner',
  color = 'primary'
}) => {
  const sizeClasses = {
    small: 'loading-small',
    medium: 'loading-medium', 
    large: 'loading-large'
  };

  const colorClasses = {
    primary: 'loading-primary',
    secondary: 'loading-secondary',
    success: 'loading-success',
    warning: 'loading-warning',
    error: 'loading-error'
  };

  const renderSpinner = () => {
    switch (type) {
      case 'dots':
        return (
          <div className={`loading-dots ${sizeClasses[size]} ${colorClasses[color]}`}>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`loading-pulse ${sizeClasses[size]} ${colorClasses[color]}`}>
            <div className="pulse-circle"></div>
          </div>
        );
      
      case 'bars':
        return (
          <div className={`loading-bars ${sizeClasses[size]} ${colorClasses[color]}`}>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
        );
      
      default:
        return (
          <div className={`loading-spinner ${sizeClasses[size]} ${colorClasses[color]}`}>
            <div className="spinner-circle"></div>
          </div>
        );
    }
  };

  return (
    <div className="loading-container">
      {renderSpinner()}
      {text && <div className="loading-text">{text}</div>}
    </div>
  );
};

export default LoadingSpinner;
