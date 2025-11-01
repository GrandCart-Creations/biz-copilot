/**
 * MFA SETUP COMPONENT
 * 
 * User interface for setting up Multi-Factor Authentication.
 * Allows users to:
 * - Enable/disable MFA
 * - View QR code for authenticator apps
 * - Get backup codes
 * - Verify MFA is working
 */

import React, { useState } from 'react';
import { useSecurityContext } from '../contexts/SecurityContext';
import { useAuth } from '../contexts/AuthContext';
import { FaShieldAlt, FaCheckCircle, FaExclamationTriangle, FaCopy, FaQrcode } from 'react-icons/fa';

const MFASetup = () => {
  const { mfaEnabled, enableMFA, disableMFA, verifyMFA } = useSecurityContext();
  const { currentUser } = useAuth();
  const [step, setStep] = useState('initial');
  const [qrCode, setQrCode] = useState('');
  const [otpAuthUrl, setOtpAuthUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEnableMFA = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await enableMFA();
      if (result.qrCode) {
        setQrCode(result.qrCode);
        setOtpAuthUrl(result.otpAuthUrl || '');
        setBackupCodes(result.backupCodes || []);
        setStep('setup');
      } else {
        setError('Failed to generate QR code');
      }
    } catch (err) {
      setError(err.message || 'Failed to enable MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await verifyMFA(verificationCode);
      
      if (result.valid) {
        if (result.backupCodes && result.backupCodes.length > 0) {
          setBackupCodes(result.backupCodes);
          setVerificationCode('');
          setStep('backup-codes');
        } else {
          setStep('complete');
        }
      } else {
        setError(result.error || 'Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return;
    }
    
    setLoading(true);
    try {
      await disableMFA();
      setStep('initial');
    } catch (err) {
      setError(err.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  const handleNumericInput = (value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setVerificationCode(numericValue);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <FaShieldAlt className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <FaExclamationTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <FaCheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {step === 'initial' && (
          <div>
            {mfaEnabled ? (
              <div>
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <FaCheckCircle className="w-5 h-5 text-green-600 mb-2" />
                  <p className="text-green-800">
                    MFA is currently <strong>enabled</strong> on your account
                  </p>
                </div>
                
                <button
                  onClick={handleDisableMFA}
                  disabled={loading}
                  className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {loading ? 'Disabling...' : 'Disable MFA'}
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Why enable MFA?</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Protects against unauthorized access</li>
                    <li>• Required for compliance (GDPR, SOC 2)</li>
                    <li>• Works with Google Authenticator, Authy, etc.</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleEnableMFA}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Enable MFA'}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'setup' && (
          <div>
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Step 1: Scan QR Code</h3>
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
              </p>
              
              <div className="flex flex-col items-center mb-6 p-6 bg-gray-50 rounded-lg">
                {qrCode ? (
                  <>
                    <img 
                      src={qrCode} 
                      alt="MFA QR Code" 
                      className="w-64 h-64 border-2 border-gray-300 rounded-lg bg-white p-2 mb-4"
                    />
                    <p className="text-xs text-gray-500 text-center">
                      Cannot scan? Install an authenticator app first, then try again.
                    </p>
                  </>
                ) : (
                  <div className="w-64 h-64 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center">
                    <FaQrcode className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setStep('verify')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
            >
              I have scanned the QR Code - Continue
            </button>
          </div>
        )}

        {step === 'backup-codes' && (
          <div>
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Step 2: Save Backup Codes</h3>
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <FaExclamationTriangle className="w-5 h-5 text-yellow-600 mb-2" />
                <p className="text-yellow-800 text-sm">
                  <strong>Important:</strong> Save these codes in a safe place. You can use them if you lose access to your authenticator app.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-6">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <code className="text-sm font-mono">{code}</code>
                    <button
                      onClick={() => copyBackupCode(code)}
                      className="ml-2 text-blue-600 hover:text-blue-700"
                      title="Copy code"
                    >
                      <FaCopy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => setStep('complete')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
            >
              I have saved my backup codes
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div>
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Step 3: Verify Setup</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter the 6-digit code from your authenticator app
              </p>
              
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => handleNumericInput(e.target.value)}
                className="w-full px-4 py-3 text-center text-2xl font-mono border-2 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setStep('setup')}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300"
              >
                Back
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center">
            <div className="mb-6">
              <FaCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2">MFA Enabled Successfully!</h3>
              <p className="text-gray-600 mb-4">
                Your account is now protected with two-factor authentication.
              </p>
              <p className="text-sm text-gray-500">
                You will be asked for a code from your authenticator app when signing in.
              </p>
            </div>
            
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFASetup;
