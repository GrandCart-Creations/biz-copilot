/**
 * HOOK: useExpirationMonitor
 * 
 * Automatically monitors and generates notifications for expiring items
 * Runs checks when component mounts and periodically
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { runExpirationChecks } from '../utils/expirationMonitor';

export const useExpirationMonitor = (enabled = true, intervalMinutes = 60) => {
  const { currentUser } = useAuth();
  const { currentCompanyId, userRole } = useCompany();
  const intervalRef = useRef(null);
  const lastCheckRef = useRef(null);

  useEffect(() => {
    if (!enabled || !currentCompanyId || !currentUser) return;

    // Only run for owners and managers
    if (!['owner', 'manager'].includes(userRole)) return;

    const runChecks = async () => {
      try {
        const now = Date.now();
        // Don't run if we just checked in the last 5 minutes
        if (lastCheckRef.current && (now - lastCheckRef.current) < 5 * 60 * 1000) {
          return;
        }

        lastCheckRef.current = now;
        await runExpirationChecks(currentCompanyId, currentUser.uid);
      } catch (error) {
        console.error('Error running expiration checks:', error);
      }
    };

    // Run immediately on mount
    runChecks();

    // Set up interval
    intervalRef.current = setInterval(() => {
      runChecks();
    }, intervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, currentCompanyId, currentUser, userRole, intervalMinutes]);
};

