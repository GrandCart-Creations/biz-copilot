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
import { useSecurityContext } from '@/contexts/SecurityContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, AlertTriangle, Copy } from 'lucide-react';

const MFASetup = () => {
  const { mfaEnabled, enableMFA, disableMFA, verifyMFA } = useSecurityContext();
  const [step, setStep] = useState('initial'); // initial, setup, verify, complete
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle enable MFA
  const handleEnableMFA = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await enableMFA();
      setQrCode(result.qrCode);
      setBackupCodes(result.backupCodes);
      setStep('setup');
    } catch (err) {
      setError(err.message || 'Failed to enable MFA');
    } finally {
      setLoading(false);
    }
  };

  // Handle verify MFA code
  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const isValid = await verifyMFA(verificationCode);
      
      if (isValid) {
        setStep('complete');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle disable MFA
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

  // Copy backup code
  const copyBackupCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Initial State - MFA Status */}
          {step === 'initial' && (
            <div>
              {mfaEnabled ? (
                <div>
                  <Alert className="mb-6">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <AlertDescription>
                      MFA is currently <strong>enabled</strong> on your account
                    </AlertDescription>
                  </Alert>
                  
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

          {/* Setup Step - Show QR Code and Backup Codes */}
          {step === 'setup' && (
            <div>
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Step 1: Scan QR Code</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Scan this QR code with your authenticator app
                </p>
                
                <div className="flex justify-center mb-6 p-6 bg-gray-50 rounded-lg">
                  <div className="w-48 h-48 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-gray-500 text-center">QR Code<br/>Placeholder</p>
                  </div>
                </div>
                
                <h3 className="font-semibold mb-3">Step 2: Save Backup Codes</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Store these codes in a safe place. You can use them if you lose access to your authenticator.
                </p>
                
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
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => setStep('verify')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
              >
                Continue to Verification
              </button>
            </div>
          )}

          {/* Verify Step - Enter Code */}
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
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
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

          {/* Complete Step - Success Message */}
          {step === 'complete' && (
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold mb-2">MFA Enabled Successfully!</h3>
                <p className="text-gray-600">
                  Your account is now protected with two-factor authentication.
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
        </CardContent>
      </Card>
    </div>
  );
};

export default MFASetup;
