import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-1 md:space-y-0">
          <div className="text-sm text-gray-600">
            © {currentYear} Biz-CoPilot by GrandCart Creations. Built for BENELUX entrepreneurs.
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            <Link 
              to="/terms" 
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              to="/privacy" 
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/cookies" 
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

