// src/utils/analytics.js
// Lightweight wrapper around Firebase Analytics that respects cookie consent.

import { app } from '../firebase';

const hasWindow = typeof window !== 'undefined';
const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

let analyticsModulePromise = null;
let analyticsInstance = null;
let analyticsEnabled = false;

const readStoredConsent = () => {
  if (!hasWindow) return false;
  try {
    const raw = localStorage.getItem('cookie_consent');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.analytics);
  } catch (error) {
    console.warn('[analytics] Failed to parse cookie consent from storage', error);
    return false;
  }
};

if (hasWindow) {
  analyticsEnabled = readStoredConsent();
}

const loadAnalyticsModule = async () => {
  if (!analyticsModulePromise) {
    analyticsModulePromise = import('firebase/analytics');
  }
  return analyticsModulePromise;
};

const ensureAnalytics = async () => {
  if (!hasWindow) return null;
  if (!analyticsEnabled) return null;
  if (!measurementId) {
    if (import.meta.env.DEV) {
      console.debug('[analytics] Skipping – measurement ID missing');
    }
    return null;
  }

  if (analyticsInstance) {
    return analyticsInstance;
  }

  try {
    const { getAnalytics, isSupported } = await loadAnalyticsModule();
    const supported = await isSupported();
    if (!supported) {
      if (import.meta.env.DEV) {
        console.debug('[analytics] Analytics not supported in this environment');
      }
      return null;
    }
    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  } catch (error) {
    console.warn('[analytics] Failed to initialize analytics', error);
    analyticsInstance = null;
    return null;
  }
};

export const applyAnalyticsConsent = async (enabled) => {
  analyticsEnabled = Boolean(enabled);
  if (analyticsEnabled) {
    await ensureAnalytics();
  }
};

export const trackEvent = async (eventName, params = {}) => {
  if (!analyticsEnabled) {
    if (import.meta.env.DEV) {
      console.debug('[analytics] Event skipped (consent not granted)', eventName, params);
    }
    return;
  }

  const instance = await ensureAnalytics();
  if (!instance) {
    return;
  }

  try {
    const { logEvent } = await loadAnalyticsModule();
    logEvent(instance, eventName, params);
  } catch (error) {
    console.warn('[analytics] Failed to log event', eventName, error);
  }
};

export const getAnalyticsConsent = () => analyticsEnabled;

