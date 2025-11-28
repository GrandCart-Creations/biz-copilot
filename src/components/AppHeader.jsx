/**
 * APP HEADER
 * 
 * Unified header component that replaces all module-specific headers
 * Includes sidebar toggle, logo, module title, and user controls
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { useButtonVisibility } from '../contexts/ButtonVisibilityContext';
import { getModule } from '../utils/modules';
import { getHeaderBackground } from '../utils/theme';
import NotificationCenter from './NotificationCenter';
import CompanySelector from './CompanySelector';
import UserProfile from './UserProfile';
import FeedbackButton from './FeedbackButton';
import AICommandCenter from './AICommandCenter';
import { FaCommentDots } from 'react-icons/fa';

const AppHeader = ({ sidebarOpen, onToggleSidebar, sidebarPinned, onTogglePin }) => {
  const location = useLocation();
  const { currentCompany } = useCompany();
  const { showHeaderButtons } = useButtonVisibility();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  
  const headerBackground = getHeaderBackground(currentCompany);

  // Get current module info from route
  const getCurrentModule = () => {
    const path = location.pathname;
    if (path === '/dashboard') return { name: 'Dashboard', icon: null };
    
    // Extract module ID from path
    const moduleMatch = path.match(/\/modules\/([^/]+)/);
    if (moduleMatch) {
      const module = getModule(moduleMatch[1]);
      return module || { name: 'Module', icon: null };
    }
    
    // Check for security route
    if (path.startsWith('/security')) {
      return { name: 'Security', icon: null };
    }
    
    return { name: 'Biz-CoPilot', icon: null };
  };

  const currentModule = getCurrentModule();

  return (
    <nav 
      className="text-white shadow-lg w-full sticky top-0 z-40 flex-shrink-0" 
      style={{ background: headerBackground }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Side: Module Title */}
          <div className="flex items-center">
            {/* Module Title (only show when not on dashboard) */}
            {location.pathname !== '/dashboard' && currentModule.name !== 'Biz-CoPilot' && (
              <h1 className="text-lg font-semibold text-white">
                {currentModule.name}
              </h1>
            )}
          </div>

          {/* Right Side: Notifications, Minimized Buttons, Company Selector, User Profile */}
          <div className="flex items-center gap-3">
            <NotificationCenter />
            
            {/* Minimized Action Buttons - Show after 10 seconds */}
            {showHeaderButtons && (
              <>
                <button
                  onClick={() => {
                    const event = new Event('feedback-click');
                    window.dispatchEvent(event);
                  }}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  title="Send Feedback"
                  aria-label="Send Feedback"
                >
                  <FaCommentDots className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => {
                    const event = new Event('ai-click');
                    window.dispatchEvent(event);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
                  title="Ask Biz-CoPilot"
                  aria-label="Ask Biz-CoPilot"
                >
                  ✨ Ask Biz-CoPilot
                </button>
              </>
            )}
            
            <CompanySelector />
            <UserProfile />
          </div>
          
        </div>
      </div>
    </nav>
  );
};

export default AppHeader;

