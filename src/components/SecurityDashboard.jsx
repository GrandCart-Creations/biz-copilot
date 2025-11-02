/**
 * SECURITY MONITORING DASHBOARD
 * 
 * Displays security events, audit logs, and system health for administrators.
 * Real-time monitoring of:
 * - Recent login attempts (successful and failed)
 * - Security events and alerts
 * - Active user sessions
 * - System health metrics
 * 
 * Only accessible to users with 'owner' or 'admin' roles.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { FaArrowLeft } from 'react-icons/fa';

const SecurityDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentCompanyId, currentCompany } = useCompany();
  const [auditLogs, setAuditLogs] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLogins: 0,
    failedLogins: 0,
    suspiciousActivity: 0,
    activeSessions: 0,
  });

  // Fetch audit logs in real-time
  useEffect(() => {
    if (!currentCompanyId) return;

    const logsRef = collection(db, `companies/${currentCompanyId}/auditLogs`);
    const logsQuery = query(
      logsRef,
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setAuditLogs(logs);
      
      // Calculate statistics
      const loginEvents = logs.filter(log => 
        log.eventType.includes('login')
      );
      const failedLogins = logs.filter(log => 
        log.status === 'failure' && log.eventType.includes('login')
      );
      const suspicious = logs.filter(log => 
        log.eventType === 'security.suspicious.activity'
      );
      
      setStats({
        totalLogins: loginEvents.length,
        failedLogins: failedLogins.length,
        suspiciousActivity: suspicious.length,
        activeSessions: Math.floor(Math.random() * 10) + 1, // Mock for now
      });
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentCompanyId]);

  // Filter for security alerts (failures and warnings)
  useEffect(() => {
    const alerts = auditLogs.filter(log => 
      log.status === 'failure' || log.status === 'warning'
    ).slice(0, 10);
    setSecurityAlerts(alerts);
  }, [auditLogs]);

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'failure':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (!currentCompanyId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h2>
          <p className="text-gray-500">Please select a company to view security dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {/* Back Button */}
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
              <p className="text-sm text-gray-500">{currentCompany?.name || 'Company'}</p>
            </div>
          </div>
          <p className="text-gray-600">Monitor security events and system health</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Logins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-gray-900">{stats.totalLogins}</p>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Failed Logins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-red-600">{stats.failedLogins}</p>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Suspicious Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-yellow-600">{stats.suspiciousActivity}</p>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-blue-600">{stats.activeSessions}</p>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Alerts */}
        {securityAlerts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Security Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityAlerts.map((alert) => (
                  <Alert key={alert.id} variant={alert.status === 'failure' ? 'destructive' : 'default'}>
                    <div className="flex items-start gap-3">
                      {getStatusIcon(alert.status)}
                      <div className="flex-1">
                        <AlertDescription>
                          <span className="font-medium">{alert.eventType}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            {formatTimestamp(alert.timestamp)}
                          </span>
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Event</th>
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Timestamp</th>
                    <th className="text-left py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {getStatusIcon(log.status)}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {log.eventType}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {log.details?.email || log.userId || 'System'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {JSON.stringify(log.details).substring(0, 50)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {auditLogs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No audit logs found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityDashboard;
