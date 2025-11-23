/**
 * APP HEADER
 * 
 * Unified header component that replaces all module-specific headers
 * Includes sidebar toggle, logo, module title, and user controls
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { getModule } from '../utils/modules';
import { getHeaderBackground } from '../utils/theme';
import NotificationCenter from './NotificationCenter';
import CompanySelector from './CompanySelector';
import UserProfile from './UserProfile';

const AppHeader = ({ sidebarOpen, onToggleSidebar, sidebarPinned, onTogglePin }) => {
  const location = useLocation();
  const { currentCompany } = useCompany();
  
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

          {/* Right Side: Notifications, Company Selector, User Profile */}
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <CompanySelector />
            <UserProfile />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AppHeader;

