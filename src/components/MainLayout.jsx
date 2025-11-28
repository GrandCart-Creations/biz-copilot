/**
 * MAIN LAYOUT
 * 
 * Wraps the application with sidebar navigation and unified header
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import SidebarNavigation from './SidebarNavigation';
import AppHeader from './AppHeader';
import FeedbackButton from './FeedbackButton';
import EmailVerificationBanner from './EmailVerificationBanner';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const { currentCompanyId } = useCompany();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarPinned, setSidebarPinned] = useState(true);

  // Hide sidebar on auth pages
  const isAuthPage = ['/login', '/signup', '/accept-invitation'].includes(location.pathname);
  const isLegalPage = ['/terms', '/privacy', '/cookies'].includes(location.pathname);
  const shouldShowSidebar = !isAuthPage && !isLegalPage && currentCompanyId;

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    // Auto-pin when manually opening
    if (!sidebarOpen) {
      setSidebarPinned(true);
    }
  };

  // Toggle pin
  const togglePin = () => {
    setSidebarPinned(!sidebarPinned);
    // Keep sidebar open when pinning
    if (!sidebarPinned) {
      setSidebarOpen(true);
    }
  };

  // Set data attribute on body for AI button positioning
  useEffect(() => {
    const isVisible = shouldShowSidebar && (sidebarOpen || (!sidebarPinned && document.querySelector('[data-sidebar-hover]')));
    if (isVisible) {
      document.body.setAttribute('data-sidebar-open', 'true');
    } else {
      document.body.removeAttribute('data-sidebar-open');
    }
  }, [shouldShowSidebar, sidebarOpen, sidebarPinned]);

  // Calculate content margin based on sidebar state
  const getContentMargin = () => {
    if (!shouldShowSidebar) return 'ml-0';
    // When open (pinned or hover-expanded), use full width
    if (sidebarOpen) return 'ml-64';
    // When collapsed, use minimal width
    return 'ml-16'; // Collapsed sidebar width (64px = 16 * 4px)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      {shouldShowSidebar && (
        <SidebarNavigation 
          isOpen={sidebarOpen} 
          onToggle={toggleSidebar}
          pinned={sidebarPinned}
          onTogglePin={togglePin}
        />
      )}

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${getContentMargin()}`}>
        {/* Unified Header */}
        {shouldShowSidebar && (
          <AppHeader
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            sidebarPinned={sidebarPinned}
            onTogglePin={togglePin}
          />
        )}

        {/* Email Verification Banner - Rendered once here */}
        {shouldShowSidebar && <EmailVerificationBanner />}

        {/* Page Content */}
        <main className="w-full">
          {children}
        </main>

        {/* Feedback Button - Only show when logged in and not on auth pages */}
        {shouldShowSidebar && <FeedbackButton />}
      </div>
    </div>
  );
};

export default MainLayout;

