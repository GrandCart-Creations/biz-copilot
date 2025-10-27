/**
 * Alert Component
 * Display contextual feedback messages
 */

import React from 'react';

export const Alert = ({ children, variant = 'default', className = '' }) => {
  const variantStyles = {
    default: 'bg-blue-50 border-blue-200 text-blue-900',
    destructive: 'bg-red-50 border-red-200 text-red-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  };

  return (
    <div
      className={`p-4 border rounded-lg ${variantStyles[variant]} ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
};

export const AlertDescription = ({ children, className = '' }) => {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
};
