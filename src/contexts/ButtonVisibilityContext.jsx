/**
 * BUTTON VISIBILITY CONTEXT
 * 
 * Manages visibility state for floating action buttons
 * Auto-minimizes buttons to header after 10 seconds
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ButtonVisibilityContext = createContext();

export const useButtonVisibility = () => {
  const context = useContext(ButtonVisibilityContext);
  if (!context) {
    throw new Error('useButtonVisibility must be used within ButtonVisibilityProvider');
  }
  return context;
};

export const ButtonVisibilityProvider = ({ children }) => {
  const location = useLocation();
  const [showFloatingButtons, setShowFloatingButtons] = useState(true);
  const [showHeaderButtons, setShowHeaderButtons] = useState(false);

  useEffect(() => {
    // Reset on page navigation
    setShowFloatingButtons(true);
    setShowHeaderButtons(false);
    
    // After 10 seconds, hide floating buttons and show header buttons
    const timer = setTimeout(() => {
      setShowFloatingButtons(false);
      setShowHeaderButtons(true);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <ButtonVisibilityContext.Provider
      value={{
        showFloatingButtons,
        showHeaderButtons,
        setShowFloatingButtons,
        setShowHeaderButtons
      }}
    >
      {children}
    </ButtonVisibilityContext.Provider>
  );
};

