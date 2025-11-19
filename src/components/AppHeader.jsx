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
import { getHeaderBackground, getHeaderLogo } from '../utils/theme';
import NotificationCenter from './NotificationCenter';
import CompanySelector from './CompanySelector';
import UserProfile from './UserProfile';
import {
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';

const AppHeader = ({ sidebarOpen, onToggleSidebar, sidebarPinned, onTogglePin }) => {
  const location = useLocation();
  const { currentCompany } = useCompany();
  
  const headerBackground = getHeaderBackground(currentCompany);
  const headerLogo = getHeaderLogo(currentCompany);
  const headerAlt = currentCompany?.branding?.logoUrl
    ? `${currentCompany?.name || 'Company'} logo`
    : 'Biz-CoPilot';

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
      className="text-white shadow-lg w-full sticky top-0 z-50 flex-shrink-0" 
      style={{ background: headerBackground }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Side: Sidebar Toggle + Logo */}
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? (
                <FaChevronLeft className="w-5 h-5 text-white" />
              ) : (
                <FaChevronRight className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Pin/Unpin Button (only show when sidebar is open) */}
            {sidebarOpen && (
              <button
                onClick={onTogglePin}
                className={`p-1.5 rounded transition-colors ${
                  sidebarPinned 
                    ? 'bg-white/20 hover:bg-white/30' 
                    : 'hover:bg-white/10'
                }`}
                aria-label={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                title={sidebarPinned ? 'Unpin sidebar (hover to expand)' : 'Pin sidebar (always visible)'}
              >
                <div className={`w-3 h-3 rounded border-2 ${
                  sidebarPinned 
                    ? 'border-white bg-white' 
                    : 'border-white/50'
                }`} />
              </button>
            )}

            {/* Company Logo */}
            <div className="flex items-center">
              <img 
                src={headerLogo} 
                alt={headerAlt} 
                className="h-[50px] w-auto max-w-[200px] object-contain" 
              />
            </div>

            {/* Module Title (only show when not on dashboard) */}
            {location.pathname !== '/dashboard' && currentModule.name !== 'Biz-CoPilot' && (
              <div className="ml-4 pl-4 border-l border-white/20">
                <h1 className="text-lg font-semibold text-white">
                  {currentModule.name}
                </h1>
              </div>
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

