/**
 * USER FEEDBACK BUTTON
 * 
 * Allows users to submit feedback, bug reports, feature requests, and improvements
 * directly from within Biz-CoPilot OS
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import { useButtonVisibility } from '../contexts/ButtonVisibilityContext';
import { addUserFeedback } from '../firebase';
import { FaCommentDots, FaTimes, FaCamera, FaEnvelope, FaCheckCircle, FaSpinner } from 'react-icons/fa';

const FeedbackButton = ({ minimized = false }) => {
  const location = useLocation();
  const { currentCompanyId } = useCompany();
  const { currentUser } = useAuth();
  const { showFloatingButtons } = useButtonVisibility();
  const [showSheet, setShowSheet] = useState(false);
  const [feedbackType, setFeedbackType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [includeEmail, setIncludeEmail] = useState(true);
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const feedbackTypes = [
    { id: 'bug', label: 'Bug Report' },
    { id: 'feature', label: 'Feature' },
    { id: 'improvement', label: 'Improve' },
    { id: 'general', label: 'General' }
  ];

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setScreenshot(file);
      setIncludeScreenshot(true);
    }
  };

  // Close modal when route changes
  useEffect(() => {
    setShowSheet(false);
    setTitle('');
    setDescription('');
    setScreenshot(null);
    setIncludeScreenshot(false);
    setSubmitted(false);
  }, [location.pathname]);

  // Listen for header button clicks
  useEffect(() => {
    const handleHeaderClick = () => {
      setShowSheet(true);
    };
    window.addEventListener('feedback-click', handleHeaderClick);
    return () => window.removeEventListener('feedback-click', handleHeaderClick);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentCompanyId || !currentUser) {
      alert('Please log in to submit feedback');
      return;
    }

    if (!title.trim() || !description.trim()) {
      alert('Please fill in both title and description');
      return;
    }

    try {
      setSubmitting(true);

      // Convert screenshot to base64 if included
      let screenshotData = null;
      if (screenshot) {
        screenshotData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(screenshot);
        });
      }

      // Map feedback type
      const typeMap = {
        bug: 'bug',
        feature: 'feature',
        improvement: 'improvement',
        general: 'general'
      };

      await addUserFeedback(currentCompanyId, {
        source: 'app',
        type: typeMap[feedbackType] || 'general',
        title: title.trim(),
        description: description.trim(),
        userEmail: includeEmail && currentUser.email ? currentUser.email : null,
        userId: currentUser.uid,
        priority: feedbackType === 'bug' ? 'high' : 'medium',
        status: 'new',
        tags: [feedbackType],
        metadata: {
          screenshot: screenshotData,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        createdBy: currentUser.uid
      });

      setSubmitted(true);
      setTimeout(() => {
        setShowSheet(false);
        setSubmitted(false);
        setTitle('');
        setDescription('');
        setScreenshot(null);
        setIncludeScreenshot(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowSheet(false);
    setTitle('');
    setDescription('');
    setScreenshot(null);
    setIncludeScreenshot(false);
    setSubmitted(false);
  };

  const handleClick = () => {
    if (minimized && onMinimizedClick) {
      onMinimizedClick();
    } else {
      setShowSheet(true);
    }
  };

  return (
    <>
      {/* Floating Feedback Button - Only show when not minimized */}
      {!minimized && showFloatingButtons && (
        <button
          onClick={handleClick}
          className="fixed bottom-6 right-6 z-40 flex items-center px-4 py-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105"
          aria-label="Send Feedback"
        >
          <FaCommentDots className="mr-2" size={18} />
          <span className="font-medium">Send Feedback</span>
        </button>
      )}

      {/* Sheet Modal - Always render via Portal when open, regardless of button visibility */}
      {showSheet && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              handleCancel();
            }
          }}
        >
          <div 
            className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-[85vh] flex flex-col"
            style={{ position: 'relative', zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation Bar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <button
                onClick={handleCancel}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={submitting}
              >
                Cancel
              </button>
              <h2 className="font-semibold text-gray-900">Send Feedback</h2>
              <div className="w-16"></div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FaCheckCircle className="text-green-600 mb-4" size={48} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
                  <p className="text-gray-600 text-center">
                    Your feedback has been submitted successfully. We appreciate your input!
                  </p>
                </div>
              ) : (
                <>
                  {/* Feedback Type */}
                  <div>
                    <h3 className="text-xs uppercase text-gray-500 mb-2">Feedback Type</h3>
                    <div className="flex bg-gray-200 rounded-lg overflow-hidden divide-x divide-gray-300">
                      {feedbackTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setFeedbackType(type.id)}
                          className={`flex-1 text-center py-2 text-sm transition-colors ${
                            feedbackType === type.id
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div>
                    <h3 className="text-xs uppercase text-gray-500 mb-2">Details</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Title"
                        required
                      />
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full min-h-24 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Describe your feedback in detail..."
                        required
                      />
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h3 className="text-xs uppercase text-gray-500 mb-2">Additional Information</h3>
                    <div className="space-y-3">
                      {/* Screenshot Toggle */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center">
                          <FaCamera className="text-gray-500 mr-2" size={18} />
                          <span className="text-sm text-gray-700">Include Screenshot</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeScreenshot}
                            onChange={(e) => {
                              setIncludeScreenshot(e.target.checked);
                              if (!e.target.checked) setScreenshot(null);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {includeScreenshot && (
                        <div className="ml-8">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="text-sm text-gray-700"
                          />
                          {screenshot && (
                            <p className="text-xs text-gray-500 mt-1">
                              Selected: {screenshot.name}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Email Toggle */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center">
                          <FaEnvelope className="text-gray-500 mr-2" size={18} />
                          <span className="text-sm text-gray-700">Include Email for Follow-up</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeEmail}
                            onChange={(e) => setIncludeEmail(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !title.trim() || !description.trim()}
                      className={`w-full py-3 rounded-md font-medium transition-colors ${
                        submitting || !title.trim() || !description.trim()
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center">
                          <FaSpinner className="animate-spin mr-2" />
                          Submitting...
                        </span>
                      ) : (
                        'Submit Feedback'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default FeedbackButton;

