/**
 * MODULE NAVIGATION BUTTON
 * 
 * A back button with a dropdown chevron that allows users to navigate
 * directly to other modules without going back to the home dashboard first.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaChevronDown, FaChartLine, FaDollarSign, FaFileAlt, FaBullhorn, FaChartArea, FaCog, FaUsers, FaShieldAlt, FaFileInvoiceDollar, FaProjectDiagram } from 'react-icons/fa';
import { useCompany } from '../contexts/CompanyContext';
import { getVisibleModules } from '../utils/modules';

const ModuleNavigationButton = ({ currentModuleId = null, onBack = null }) => {
  const navigate = useNavigate();
  const { userRole, subscriptionTier } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Icon mapping
  const getIcon = (iconName) => {
    const icons = {
      FaChartLine,
      FaDollarSign,
      FaFileAlt,
      FaBullhorn,
      FaChartArea,
      FaCog,
      FaUsers,
      FaShieldAlt,
      FaFileInvoiceDollar,
      FaProjectDiagram
    };
    return icons[iconName] || FaChartLine;
  };

  // Get all visible modules
  const visibleModules = getVisibleModules(userRole || 'owner', subscriptionTier || 'business');
  
  // Filter out current module and sort by name
  const otherModules = useMemo(() => {
    return visibleModules
      .filter(module => module.id !== currentModuleId && module.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleModules, currentModuleId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/modules');
    }
  };

  const handleModuleClick = (module) => {
    setIsOpen(false);
    if (module.route) {
      navigate(module.route);
    }
  };

  if (otherModules.length === 0) {
    // No other modules available, just show back button
    return (
      <button
        onClick={handleBack}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Back to Dashboard"
      >
        <FaArrowLeft className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-l-lg transition-colors border-r border-gray-300"
          title="Back to Dashboard"
        >
          <FaArrowLeft className="w-5 h-5" />
        </button>
        
        {/* Dropdown Chevron */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-r-lg transition-colors"
          title="Navigate to other modules"
          aria-label="Module navigation"
        >
          <FaChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 mb-1">
                Navigate to Module
              </div>
              {otherModules.map((module) => {
                const Icon = getIcon(module.icon);
                return (
                  <button
                    key={module.id}
                    onClick={() => handleModuleClick(module)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      module.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      module.color === 'green' ? 'bg-green-100 text-green-600' :
                      module.color === 'purple' ? 'bg-[#D4F5EF] text-[#005C70]' :
                      module.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                      module.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
                      module.color === 'gray' ? 'bg-gray-100 text-gray-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{module.name}</div>
                      <div className="text-xs text-gray-500 truncate">{module.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModuleNavigationButton;

