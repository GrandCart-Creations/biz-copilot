/**
 * SIDEBAR NAVIGATION
 * 
 * Modern collapsible sidebar with hover-to-expand functionality
 * Inspired by GoDaddy's elegant sidebar solution
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { getModulesBySections, getModule } from '../utils/modules';
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
  FaChevronRight
} from 'react-icons/fa';

const SidebarNavigation = ({ isOpen, onToggle, pinned, onTogglePin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, subscriptionTier, currentCompanyId } = useCompany();
  const [expandedSections, setExpandedSections] = useState({
    financial: true,
    operations: false,
    administration: false
  });
  const [isHovered, setIsHovered] = useState(false);
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

  // Get modules grouped by sections
  const sections = useMemo(() => {
    return getModulesBySections(userRole || 'employee', subscriptionTier || 'lite');
  }, [userRole, subscriptionTier]);

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

  // Collapsed state - show minimal sidebar with icons
  if (!isOpen && !isHovered) {
    return (
      <div
        ref={sidebarRef}
        className="fixed left-0 top-0 h-full w-16 bg-white border-r border-gray-200 shadow-lg z-40 flex flex-col transition-all duration-300"
        onMouseEnter={() => !pinned && setIsHovered(true)}
      >
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
                  className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
                    hasActiveModule ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                  title={section.title}
                >
                  <SectionIcon className={`w-5 h-5 ${
                    hasActiveModule ? 'text-gray-900' : 'text-gray-600'
                  }`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Expanded state (open or hover-expanded)
  return (
    <div
      ref={sidebarRef}
      className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg z-40 flex flex-col transition-all duration-300"
      onMouseLeave={() => !pinned && !isOpen && setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto py-4">
        {sections.map((section) => {
          if (section.modules.length === 0) return null;

          const colorClasses = getSectionColorClasses(section.color);
          const isExpanded = expandedSections[section.id];
          const SectionIcon = getIcon(section.icon);

          return (
            <div key={section.id} className="mb-2">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide ${colorClasses.text} hover:${colorClasses.bg} transition-colors`}
              >
                <div className="flex items-center gap-2">
                  <SectionIcon className="w-4 h-4" />
                  <span>{section.title}</span>
                </div>
                {isExpanded ? (
                  <FaChevronDown className="w-3 h-3" />
                ) : (
                  <FaChevronRight className="w-3 h-3" />
                )}
              </button>

              {/* Section Modules */}
              {isExpanded && (
                <div className="mt-1">
                  {section.modules.map((module) => {
                    const IconComponent = getIcon(module.icon);
                    const isActive = isModuleActive(module.route);
                    const moduleColorClasses = getSectionColorClasses(section.color);

                    return (
                      <button
                        key={module.id}
                        onClick={() => handleModuleClick(module)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? `${moduleColorClasses.bg} ${moduleColorClasses.text} border-l-[3px] ${moduleColorClasses.border}`
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isActive ? moduleColorClasses.iconBg : 'bg-gray-100'
                        }`}>
                          <IconComponent className={`w-4 h-4 ${
                            isActive ? moduleColorClasses.iconText : 'text-gray-600'
                          }`} />
                        </div>
                        <span className="font-medium">{module.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SidebarNavigation;
