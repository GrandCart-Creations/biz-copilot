import React from 'react';
import { FaCookie, FaInfoCircle } from 'react-icons/fa';

const CookiePolicy = () => {
  const lastUpdated = 'January 2025';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {/* Header */}
          <div className="flex items-center mb-8">
            <FaCookie className="w-10 h-10 text-blue-600 mr-4" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cookie Policy</h1>
              <p className="text-sm text-gray-500 mt-1">Last Updated: {lastUpdated}</p>
            </div>
          </div>

          {/* Notice */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <FaInfoCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  This Cookie Policy explains how Biz-CoPilot uses cookies and similar technologies. This policy is compliant with EU ePrivacy Directive and GDPR requirements for BENELUX users.
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. What Are Cookies?</h2>
              <p className="text-gray-700 mb-4">
                Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
              </p>
              <p className="text-gray-700">
                Biz-CoPilot uses cookies and similar technologies (local storage, session storage) to enhance your experience and provide essential functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Types of Cookies We Use</h2>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Essential Cookies (Required)</h3>
                  <p className="text-gray-700 mb-4">
                    These cookies are necessary for the Service to function and cannot be disabled:
                  </p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Cookie Name</th>
                        <th className="px-4 py-2 text-left font-semibold">Purpose</th>
                        <th className="px-4 py-2 text-left font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">auth_token</td>
                        <td className="px-4 py-2">User authentication</td>
                        <td className="px-4 py-2">Session</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">session_id</td>
                        <td className="px-4 py-2">Session management</td>
                        <td className="px-4 py-2">30 minutes</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">csrf_token</td>
                        <td className="px-4 py-2">Security (CSRF protection)</td>
                        <td className="px-4 py-2">Session</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-sm text-gray-600 mt-4">
                    <strong>Legal Basis:</strong> Necessary for contract performance (GDPR Article 6(1)(b))
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Functional Cookies (Optional)</h3>
                  <p className="text-gray-700 mb-4">
                    These cookies enhance functionality and personalization:
                  </p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Cookie Name</th>
                        <th className="px-4 py-2 text-left font-semibold">Purpose</th>
                        <th className="px-4 py-2 text-left font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">user_preferences</td>
                        <td className="px-4 py-2">Store user settings and preferences</td>
                        <td className="px-4 py-2">1 year</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">theme</td>
                        <td className="px-4 py-2">Remember theme preference (light/dark)</td>
                        <td className="px-4 py-2">1 year</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">language</td>
                        <td className="px-4 py-2">Remember language preference</td>
                        <td className="px-4 py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-sm text-gray-600 mt-4">
                    <strong>Legal Basis:</strong> Legitimate interests (GDPR Article 6(1)(f)) - Can be disabled
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">2.3 Analytics Cookies (Optional)</h3>
                  <p className="text-gray-700 mb-4">
                    These cookies help us understand how you use the Service:
                  </p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Cookie Name</th>
                        <th className="px-4 py-2 text-left font-semibold">Purpose</th>
                        <th className="px-4 py-2 text-left font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">_ga</td>
                        <td className="px-4 py-2">Google Analytics - Distinguish users</td>
                        <td className="px-4 py-2">2 years</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">_gid</td>
                        <td className="px-4 py-2">Google Analytics - Distinguish users</td>
                        <td className="px-4 py-2">24 hours</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-mono text-xs">_gat</td>
                        <td className="px-4 py-2">Google Analytics - Throttle request rate</td>
                        <td className="px-4 py-2">1 minute</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-sm text-gray-600 mt-4">
                    <strong>Legal Basis:</strong> Consent (GDPR Article 6(1)(a)) - Requires your explicit consent
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>IP Anonymization:</strong> We use Google Analytics with IP anonymization enabled
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Third-Party Cookies</h2>
              <p className="text-gray-700 mb-4">
                Some cookies are set by third-party services we use:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Google Analytics:</strong> Website analytics (requires consent)</li>
                <li><strong>Firebase:</strong> Authentication and backend services (essential)</li>
                <li><strong>Stripe:</strong> Payment processing (essential for paid subscriptions)</li>
              </ul>
              <p className="text-gray-700">
                For more information about third-party cookies, please review their respective privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Managing Cookies</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Cookie Consent Banner</h3>
              <p className="text-gray-700 mb-4">
                When you first visit Biz-CoPilot, you'll see a cookie consent banner that allows you to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Accept all cookies</li>
                <li>Reject non-essential cookies</li>
                <li>Customize your cookie preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Browser Settings</h3>
              <p className="text-gray-700 mb-4">
                You can also control cookies through your browser settings. However, disabling essential cookies may prevent the Service from functioning properly.
              </p>
              <p className="text-gray-700 mb-4">How to manage cookies in popular browsers:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Account Settings</h3>
              <p className="text-gray-700">
                You can update your cookie preferences at any time in your account settings under "Privacy & Data".
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Your Rights</h2>
              <p className="text-gray-700 mb-4">
                Under GDPR, you have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Be informed about cookies we use (this policy)</li>
                <li>Give or withdraw consent for non-essential cookies</li>
                <li>Access information about cookies stored on your device</li>
                <li>Request deletion of cookie data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Local Storage and Session Storage</h2>
              <p className="text-gray-700 mb-4">
                In addition to cookies, we use browser storage technologies:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Local Storage:</strong> Stores user preferences persistently (similar to cookies)</li>
                <li><strong>Session Storage:</strong> Stores temporary session data (cleared when browser closes)</li>
              </ul>
              <p className="text-gray-700 mt-4">
                You can clear local and session storage through your browser's developer tools or by clearing browser data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Updates to This Policy</h2>
              <p className="text-gray-700">
                We may update this Cookie Policy from time to time. Changes will be reflected in the "Last Updated" date. Material changes will be communicated via email or through the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about our use of cookies, please contact us at{' '}
                <a href="mailto:privacy@biz-copilot.nl" className="text-blue-600 hover:underline">privacy@biz-copilot.nl</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;

