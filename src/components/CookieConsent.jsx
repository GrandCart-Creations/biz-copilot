import React, { useState, useEffect } from 'react';
import { FaCookie, FaTimes, FaCog, FaCheck, FaTimesCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Cannot be disabled
    functional: false,
    analytics: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Show banner after 1 second
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      const savedPrefs = JSON.parse(consent);
      setPreferences(savedPrefs);
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      essential: true,
      functional: true,
      analytics: true
    };
    savePreferences(allAccepted);
  };

  const rejectNonEssential = () => {
    savePreferences({
      essential: true,
      functional: false,
      analytics: false
    });
  };

  const savePreferences = (prefs) => {
    localStorage.setItem('cookie_consent', JSON.stringify(prefs));
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
    
    // Apply preferences (e.g., load analytics scripts if consented)
    if (prefs.analytics) {
      // Load Google Analytics if consented
      // This would typically be handled in your analytics setup
    }
  };

  const handlePreferenceChange = (type) => {
    if (type === 'essential') return; // Cannot disable essential
    
    setPreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner && !showSettings) {
    return null;
  }

  return (
    <>
      {/* Cookie Consent Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <FaCookie className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Cookie Consent
                  </h3>
                  <p className="text-sm text-gray-700 mb-3">
                    We use cookies to enhance your experience, analyze site usage, and assist with our marketing efforts. 
                    By clicking "Accept All", you consent to our use of cookies. You can also customize your preferences or{' '}
                    <Link to="/cookies" className="text-blue-600 hover:underline">
                      read our Cookie Policy
                    </Link>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={acceptAll}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Accept All
                    </button>
                    <button
                      onClick={rejectNonEssential}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                    >
                      Reject Non-Essential
                    </button>
                    <button
                      onClick={() => {
                        setShowBanner(false);
                        setShowSettings(true);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center"
                    >
                      <FaCog className="w-4 h-4 mr-2" />
                      Customize
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="ml-4 text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center">
                <FaCookie className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="text-xl font-semibold text-gray-900">Cookie Preferences</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-6">
                Manage your cookie preferences. You can enable or disable non-essential cookies at any time.
                <Link to="/cookies" className="text-blue-600 hover:underline ml-1">
                  Learn more in our Cookie Policy
                </Link>.
              </p>

              {/* Essential Cookies */}
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Essential Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Required for the Service to function. These cannot be disabled.
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <FaCheck className="w-5 h-5 text-green-600" />
                    <span className="ml-2 text-sm text-gray-700">Required</span>
                  </div>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Functional Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Remember your preferences and settings to enhance your experience.
                    </p>
                  </div>
                  <label className="ml-4 relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={() => handlePreferenceChange('functional')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Analytics Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Help us understand how you use the Service to improve performance and features. Uses Google Analytics with IP anonymization.
                    </p>
                  </div>
                  <label className="ml-4 relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={() => handlePreferenceChange('analytics')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setShowBanner(true);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCustomPreferences}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsent;

