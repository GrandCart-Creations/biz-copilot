/**
 * SIDEBAR NAVIGATION
 * 
 * Modern collapsible sidebar with hover-to-expand functionality
 * Inspired by GoDaddy's elegant sidebar solution
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import { getModulesBySections, getModule } from '../utils/modules';
import { getHeaderLogo } from '../utils/theme';
import { getSectionOrder, reorderModule } from '../utils/sidebarPreferences';
import {
  FaChartLine,
  FaDollarSign,
  FaFileInvoiceDollar,
  FaChartArea,
  FaFileAlt,
  FaBullhorn,
  FaProjectDiagram,
  FaCog,
  FaUsers,
  FaShieldAlt,
  FaChevronDown,
  FaChevronRight,
  FaChevronLeft,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';

const SidebarNavigation = ({ isOpen, onToggle, pinned, onTogglePin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, subscriptionTier, currentCompanyId, currentCompany } = useCompany();
  const { currentUser } = useAuth();
  
  // Get company logo
  const headerLogo = getHeaderLogo(currentCompany);
  const headerAlt = currentCompany?.branding?.logoUrl
    ? `${currentCompany?.name || 'Company'} logo`
    : 'Biz-CoPilot';
  const [expandedSections, setExpandedSections] = useState({
    financial: true,
    operations: false,
    administration: false
  });
  const [isHovered, setIsHovered] = useState(false);
  const [reorderTrigger, setReorderTrigger] = useState(0); // Force re-render when reordering
  const sidebarRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Get icon component by name
  const getIcon = (iconName) => {
    const icons = {
      FaChartLine,
      FaDollarSign,
      FaFileInvoiceDollar,
      FaChartArea,
      FaFileAlt,
      FaBullhorn,
      FaProjectDiagram,
      FaCog,
      FaUsers,
      FaShieldAlt
    };
    return icons[iconName] || FaChartLine;
  };

  // Get color classes for sections
  const getSectionColorClasses = (color) => {
    const colors = {
      blue: {
        border: 'border-blue-500',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        hover: 'hover:bg-blue-50'
      },
      orange: {
        border: 'border-orange-500',
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        iconBg: 'bg-orange-100',
        iconText: 'text-orange-600',
        hover: 'hover:bg-orange-50'
      },
      gray: {
        border: 'border-gray-500',
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        iconBg: 'bg-gray-100',
        iconText: 'text-gray-600',
        hover: 'hover:bg-gray-50'
      }
    };
    return colors[color] || colors.blue;
  };

  // Get modules grouped by sections with custom ordering
  const sections = useMemo(() => {
    const baseSections = getModulesBySections(userRole || 'employee', subscriptionTier || 'lite');
    const userId = currentUser?.uid;
    
    // Apply custom ordering to each section
    return baseSections.map(section => {
      const customOrder = getSectionOrder(section.id, userId, currentCompanyId);
      const moduleMap = new Map(section.modules.map(m => [m.id, m]));
      
      // Reorder modules based on custom order, preserving only visible modules
      const orderedModules = customOrder
        .map(moduleId => moduleMap.get(moduleId))
        .filter(Boolean);
      
      // Add any modules not in custom order (new modules, etc.)
      const orderedIds = new Set(orderedModules.map(m => m.id));
      const remainingModules = section.modules.filter(m => !orderedIds.has(m.id));
      
      return {
        ...section,
        modules: [...orderedModules, ...remainingModules]
      };
    });
  }, [userRole, subscriptionTier, currentUser?.uid, currentCompanyId, reorderTrigger]);
  
  // Handle module reordering
  const handleReorder = (sectionId, moduleId, direction) => {
    if (!currentUser?.uid) return;
    
    reorderModule(sectionId, moduleId, direction, currentUser.uid, currentCompanyId);
    // Force re-render by updating trigger
    setReorderTrigger(prev => prev + 1);
  };

  // Check if a module is active
  const isModuleActive = (moduleRoute) => {
    if (!moduleRoute) return false;
    return location.pathname === moduleRoute || location.pathname.startsWith(moduleRoute + '/');
  };

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Handle module click
  const handleModuleClick = (module) => {
    if (!currentCompanyId) {
      alert('Please select a company to access this module.');
      return;
    }
    
    if (module.route) {
      navigate(module.route);
    }
  };

  // Auto-expand section if current module is in it
  useEffect(() => {
    const currentPath = location.pathname;
    sections.forEach(section => {
      const hasActiveModule = section.modules.some(module => 
        module.route && (currentPath === module.route || currentPath.startsWith(module.route + '/'))
      );
      if (hasActiveModule && !expandedSections[section.id]) {
        setExpandedSections(prev => ({
          ...prev,
          [section.id]: true
        }));
      }
    });
  }, [location.pathname, sections]);

  // Hover-to-expand functionality (only when not pinned and collapsed)
  useEffect(() => {
    if (!pinned && !isOpen && sidebarRef.current) {
      const handleMouseEnter = () => {
        clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
      };

      const handleMouseLeave = (e) => {
        // Don't collapse if mouse is moving to expanded content
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && sidebarRef.current?.contains(relatedTarget)) {
          return;
        }
        
        hoverTimeoutRef.current = setTimeout(() => {
          setIsHovered(false);
        }, 200); // Delay to prevent flicker
      };

      const sidebar = sidebarRef.current;
      sidebar.addEventListener('mouseenter', handleMouseEnter);
      sidebar.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        sidebar.removeEventListener('mouseenter', handleMouseEnter);
        sidebar.removeEventListener('mouseleave', handleMouseLeave);
        clearTimeout(hoverTimeoutRef.current);
      };
    } else {
      setIsHovered(false);
    }
  }, [pinned, isOpen]);

  // Determine if sidebar should be visible (open or hover-expanded)
  const isVisible = isOpen || (isHovered && !pinned);

  // Collapsed state - show minimal sidebar with logo and icons
  if (!isOpen && !isHovered) {
    return (
      <nav
        ref={sidebarRef}
        className="fixed left-0 top-0 h-full w-16 bg-white border-r border-gray-200 shadow-lg z-50 flex flex-col transition-all duration-300"
        onMouseEnter={() => !pinned && setIsHovered(true)}
        aria-label="Main navigation"
      >
        {/* Top: Logo and Chevron (always visible) */}
        <div className="flex flex-col items-center p-3 border-b border-gray-200">
          {/* Logo - always visible */}
          <div className="mb-2 flex items-center justify-center">
            <img 
              src={headerLogo} 
              alt={headerAlt} 
              className="h-10 w-10 object-contain rounded" 
            />
          </div>
          {/* Chevron Toggle */}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-110 flex items-center justify-center"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <FaChevronRight className="w-4 h-4 text-gray-600 transition-transform duration-200" />
          </button>
        </div>
        
        {/* Minimal icons for collapsed state */}
        <div className="flex-1 overflow-y-auto py-4">
          {sections.map((section) => {
            if (section.modules.length === 0) return null;
            const SectionIcon = getIcon(section.icon);
            const hasActiveModule = section.modules.some(module => isModuleActive(module.route));
            
            return (
              <div key={section.id} className="mb-2">
                <button
                  onClick={() => onToggle()}
                  className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#00BFA6]/40 ${
                    hasActiveModule ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                  title={section.title}
                  aria-label={`Expand sidebar to see ${section.title} modules`}
                >
                  <SectionIcon className={`w-5 h-5 ${
                    hasActiveModule ? 'text-gray-900' : 'text-gray-600'
                  }`} />
                </button>
              </div>
            );
          })}
        </div>
      </nav>
    );
  }

  // Expanded state (open or hover-expanded)
  return (
    <nav
      ref={sidebarRef}
      className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg z-50 flex flex-col transition-all duration-300"
      onMouseLeave={() => !pinned && !isOpen && setIsHovered(false)}
      aria-label="Main navigation"
    >
      {/* Top Line: Logo and Chevron */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        {/* Logo */}
        <div className="flex items-center">
          <img 
            src={headerLogo} 
            alt={headerAlt} 
            className="h-10 w-auto max-w-[140px] object-contain" 
          />
        </div>
        
        {/* Chevron Toggle and Pin Button */}
        <div className="flex items-center gap-2">
          {/* Pin/Unpin Button */}
          <button
            onClick={onTogglePin}
            className={`p-1.5 rounded transition-all duration-200 ${
              pinned 
                ? 'bg-gray-200 hover:bg-gray-300 hover:scale-110' 
                : 'hover:bg-gray-100 hover:scale-110'
            }`}
            aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
            aria-pressed={pinned}
            title={pinned ? 'Unpin sidebar (hover to expand)' : 'Pin sidebar (always visible)'}
          >
            <div className={`w-2.5 h-2.5 rounded border transition-all duration-200 ${
              pinned 
                ? 'border-gray-600 bg-gray-600 shadow-sm' 
                : 'border-gray-400 group-hover:border-gray-500'
            }`} />
          </button>
          
          {/* Chevron Toggle */}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-110 flex items-center justify-center"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <FaChevronLeft className="w-4 h-4 text-gray-600 transition-transform duration-200" />
          </button>
        </div>
      </div>
      
      {/* Navigation Label (moved down one line) */}
      <div className="px-4 py-2 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide" id="navigation-heading">Navigation</h2>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto py-4" role="list" aria-labelledby="navigation-heading">
        {sections.map((section) => {
          if (section.modules.length === 0) return null;

          const colorClasses = getSectionColorClasses(section.color);
          const isExpanded = expandedSections[section.id];
          const SectionIcon = getIcon(section.icon);

          return (
            <div key={section.id} className="mb-2" role="listitem">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSection(section.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide ${colorClasses.text} hover:${colorClasses.bg} transition-all duration-200 rounded-lg group focus:outline-none focus:ring-2 focus:ring-[#00BFA6]/40`}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${section.title} section`}
                aria-controls={`section-${section.id}-modules`}
              >
                <div className="flex items-center gap-2">
                  <SectionIcon className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-0' : 'group-hover:scale-110'}`} />
                  <span>{section.title}</span>
                </div>
                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : 'group-hover:translate-x-0.5'}`}>
                  {isExpanded ? (
                    <FaChevronDown className="w-3 h-3" />
                  ) : (
                    <FaChevronRight className="w-3 h-3" />
                  )}
                </div>
              </button>

              {/* Section Modules */}
              {isExpanded && (
                <div className="mt-1" id={`section-${section.id}-modules`} role="list">
                  {section.modules.map((module, index) => {
                    const IconComponent = getIcon(module.icon);
                    const isActive = isModuleActive(module.route);
                    const moduleColorClasses = getSectionColorClasses(section.color);
                    const canMoveUp = index > 0;
                    const canMoveDown = index < section.modules.length - 1;

                    return (
                      <div
                        key={module.id}
                        className="group relative flex items-center"
                        onMouseEnter={(e) => {
                          // Show reorder controls on hover
                          const controls = e.currentTarget.querySelector('.reorder-controls');
                          if (controls) controls.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          // Hide reorder controls on leave
                          const controls = e.currentTarget.querySelector('.reorder-controls');
                          if (controls) controls.style.opacity = '0';
                        }}
                      >
                        <button
                          onClick={() => handleModuleClick(module)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleModuleClick(module);
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#00BFA6]/40 ${
                            isActive
                              ? `${moduleColorClasses.bg} ${moduleColorClasses.text} border-l-[3px] ${moduleColorClasses.border} shadow-sm`
                              : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={`Navigate to ${module.name}`}
                          role="listitem"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            isActive 
                              ? `${moduleColorClasses.iconBg} shadow-sm` 
                              : 'bg-gray-100 group-hover:bg-gray-200 group-hover:scale-105'
                          }`}>
                            <IconComponent className={`w-4 h-4 transition-all duration-200 ${
                              isActive 
                                ? `${moduleColorClasses.iconText} scale-110` 
                                : 'text-gray-600 group-hover:text-gray-800'
                            }`} />
                          </div>
                          <span className={`font-medium transition-all duration-200 flex-1 text-left ${
                            isActive 
                              ? 'font-semibold' 
                              : 'group-hover:font-semibold'
                          }`}>{module.name}</span>
                        </button>
                        
                        {/* Reorder Controls */}
                        {currentUser && (
                          <div 
                            className="reorder-controls absolute right-2 flex flex-col gap-0.5 opacity-0 transition-opacity duration-200 z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canMoveUp) handleReorder(section.id, module.id, -1);
                              }}
                              disabled={!canMoveUp}
                              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                canMoveUp ? 'text-gray-600' : 'text-gray-300 cursor-not-allowed'
                              }`}
                              aria-label={`Move ${module.name} up`}
                              title="Move up"
                            >
                              <FaArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canMoveDown) handleReorder(section.id, module.id, 1);
                              }}
                              disabled={!canMoveDown}
                              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                canMoveDown ? 'text-gray-600' : 'text-gray-300 cursor-not-allowed'
                              }`}
                              aria-label={`Move ${module.name} down`}
                              title="Move down"
                            >
                              <FaArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default SidebarNavigation;
