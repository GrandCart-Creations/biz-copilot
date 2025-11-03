/**
 * MODULE TOUR STEP
 * 
 * Step 5: Quick tour of key modules
 */

import React from 'react';
import {
  FaChartLine,
  FaDollarSign,
  FaFileAlt,
  FaCog,
  FaShieldAlt,
  FaCheckCircle
} from 'react-icons/fa';

const ModuleTourStep = ({ onNext, onComplete }) => {
  const modules = [
    {
      icon: FaChartLine,
      title: 'Expenses',
      description: 'Track and manage all your business expenses with receipt scanning',
      color: 'blue'
    },
    {
      icon: FaDollarSign,
      title: 'Income',
      description: 'Monitor revenue streams and income sources',
      color: 'green'
    },
    {
      icon: FaFileAlt,
      title: 'Reports',
      description: 'Generate financial reports and analytics',
      color: 'purple'
    },
    {
      icon: FaCog,
      title: 'Settings',
      description: 'Manage company settings and team members',
      color: 'gray'
    },
    {
      icon: FaShieldAlt,
      title: 'Security',
      description: 'Monitor security events and audit logs (Owner only)',
      color: 'red'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      purple: 'bg-purple-50 border-purple-200',
      gray: 'bg-gray-50 border-gray-200',
      red: 'bg-red-50 border-red-200'
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Explore Your Modules
        </h2>
        <p className="text-gray-600">
          Here's a quick overview of what you can do with Biz-CoPilot.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {modules.map((module, index) => {
          const Icon = module.icon;
          return (
            <div
              key={index}
              className={`${getColorClasses(module.color)} border-2 rounded-lg p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  module.color === 'blue' ? 'bg-blue-100' :
                  module.color === 'green' ? 'bg-green-100' :
                  module.color === 'purple' ? 'bg-purple-100' :
                  module.color === 'red' ? 'bg-red-100' :
                  'bg-gray-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    module.color === 'blue' ? 'text-blue-600' :
                    module.color === 'green' ? 'text-green-600' :
                    module.color === 'purple' ? 'text-purple-600' :
                    module.color === 'red' ? 'text-red-600' :
                    'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{module.title}</h3>
                  <p className="text-sm text-gray-600">{module.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <FaCheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">You're All Set!</h3>
            <p className="text-gray-700 mb-4">
              You've completed the setup process. Start exploring your modules and manage your business efficiently.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Company profile configured
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Regional settings applied
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Ready to track expenses and income
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <FaCheckCircle className="w-5 h-5" />
          Complete Setup & Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ModuleTourStep;

