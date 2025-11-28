/**
 * NOTIFICATION CENTER
 * 
 * Centralized notification system for:
 * - Overdue invoices
 * - Approval requests
 * - Budget alerts
 * - Payment reminders
 * - System alerts
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FaBell,
  FaTimes,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaDollarSign,
  FaFileInvoice,
  FaChartLine,
  FaClock,
  FaTrash,
  FaCheck
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useExpirationMonitor } from '../hooks/useExpirationMonitor';
import {
  getCompanyNotifications,
  subscribeToCompanyNotifications,
  markNotificationAsRead,
  deleteCompanyNotification,
  markAllNotificationsAsRead
} from '../firebase';

const NotificationCenter = () => {
  const { currentUser } = useAuth();
  const { currentCompanyId } = useCompany();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Run expiration monitoring (checks contracts, invoices, subscriptions)
  useExpirationMonitor(true, 60); // Check every 60 minutes

  useEffect(() => {
    if (!currentCompanyId || !currentUser) return;
    loadNotifications();
    
    // Set up real-time listener
    const unsubscribe = subscribeToNotifications();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentCompanyId, currentUser]);

  const loadNotifications = async () => {
    if (!currentCompanyId) return;
    setLoading(true);
    try {
      const data = await getCompanyNotifications(currentCompanyId, {
        userId: currentUser?.uid,
        unreadOnly: false
      });
      setNotifications(data || []);
    } catch (error) {
      // Handle missing Firestore index errors gracefully
      if (error.message?.includes('index') || error.code === 'failed-precondition') {
        console.warn('Notifications index not ready yet. Notifications will load once index is built.');
        setNotifications([]);
      } else {
        console.error('Error loading notifications:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!currentCompanyId || !currentUser) return () => {};
    
    try {
      // Use real-time subscription
      return subscribeToCompanyNotifications(currentCompanyId, currentUser.uid, (notifications) => {
        setNotifications(notifications);
        setLoading(false);
      });
    } catch (error) {
      // Handle missing index errors gracefully
      if (error.message?.includes('index') || error.code === 'failed-precondition') {
        console.warn('Notifications subscription index not ready yet');
      } else {
        console.error('Error subscribing to notifications:', error);
      }
      setLoading(false);
      return () => {};
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleMarkAsRead = async (notificationId) => {
    if (!currentCompanyId) return;
    try {
      await markNotificationAsRead(currentCompanyId, notificationId);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentCompanyId) return;
    try {
      await markAllNotificationsAsRead(currentCompanyId, currentUser?.uid);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    if (!currentCompanyId) return;
    try {
      await deleteCompanyNotification(currentCompanyId, notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'overdue_invoice':
        return <FaFileInvoice className="w-5 h-5 text-red-500" />;
      case 'approval_request':
        return <FaCheckCircle className="w-5 h-5 text-blue-500" />;
      case 'budget_alert':
        return <FaChartLine className="w-5 h-5 text-yellow-500" />;
      case 'payment_reminder':
        return <FaDollarSign className="w-5 h-5 text-green-500" />;
      case 'contract_expiration':
        return <FaFileInvoice className="w-5 h-5 text-orange-500" />;
      case 'domain_expiration':
        return <FaInfoCircle className="w-5 h-5 text-purple-500" />;
      case 'subscription_renewal':
        return <FaClock className="w-5 h-5 text-indigo-500" />;
      case 'payment_due':
        return <FaDollarSign className="w-5 h-5 text-red-500" />;
      case 'system':
        return <FaInfoCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <FaBell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'overdue_invoice':
        return 'bg-red-50 border-red-200';
      case 'approval_request':
        return 'bg-blue-50 border-blue-200';
      case 'budget_alert':
        return 'bg-yellow-50 border-yellow-200';
      case 'payment_reminder':
        return 'bg-green-50 border-green-200';
      case 'contract_expiration':
        return 'bg-orange-50 border-orange-200';
      case 'domain_expiration':
        return 'bg-purple-50 border-purple-200';
      case 'subscription_renewal':
        return 'bg-indigo-50 border-indigo-200';
      case 'payment_due':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      // Unread first
      if (a.read !== b.read) return a.read ? 1 : -1;
      // Then by timestamp
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [notifications]);

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <FaBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading notifications...</p>
                </div>
              ) : sortedNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <FaBell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900 mb-1">No notifications</p>
                  <p className="text-xs text-gray-500">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sortedNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                !notification.read ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </p>
                              {notification.message && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTimestamp(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.read && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                            )}
                          </div>
                          {notification.actionUrl && (
                            <a
                              href={notification.actionUrl}
                              className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              View details →
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Mark as read"
                            >
                              <FaCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {sortedNotifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 text-center">
                <button
                  onClick={() => {
                    // Navigate to full notifications page
                    window.location.href = '/notifications';
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;

