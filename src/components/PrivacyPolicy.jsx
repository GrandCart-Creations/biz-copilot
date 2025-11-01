import React from 'react';
import { FaShieldAlt, FaLock, FaDatabase, FaUserShield, FaGlobe } from 'react-icons/fa';

const PrivacyPolicy = () => {
  const lastUpdated = 'January 2025';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {/* Header */}
          <div className="flex items-center mb-8">
            <FaLock className="w-10 h-10 text-blue-600 mr-4" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
              <p className="text-sm text-gray-500 mt-1">Last Updated: {lastUpdated}</p>
            </div>
          </div>

          {/* GDPR Notice */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <FaShieldAlt className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  <strong>GDPR Compliant:</strong> This Privacy Policy is compliant with the General Data Protection Regulation (GDPR) and applies to users in the Netherlands, Belgium, and Luxembourg (BENELUX region). Your privacy is important to us.
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                GrandCart Creations ("we", "us", "our") operates Biz-CoPilot ("the Service"), a business operating system for small and medium businesses. We are committed to protecting your privacy and complying with applicable data protection laws, including the GDPR.
              </p>
              <p className="text-gray-700">
                This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Data Controller</h2>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700 mb-2">
                  <strong>Data Controller:</strong><br />
                  GrandCart Creations<br />
                  Email: <a href="mailto:privacy@biz-copilot.nl" className="text-blue-600 hover:underline">privacy@biz-copilot.nl</a><br />
                  Website: <a href="https://biz-copilot.nl" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">biz-copilot.nl</a>
                </p>
              </div>
              <p className="text-gray-700">
                If you have questions about this Privacy Policy or our data practices, please contact our Data Protection Officer at the email above.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Account Information</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Name:</strong> Your full name or business name</li>
                <li><strong>Email Address:</strong> Used for authentication and communications</li>
                <li><strong>Password:</strong> Stored using secure hashing (never in plaintext)</li>
                <li><strong>Profile Information:</strong> Optional profile details, preferences, and settings</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Business Data</h3>
              <p className="text-gray-700 mb-2">Information you create or upload in the Service:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Expenses, invoices, receipts, and financial records</li>
                <li>Income records and revenue data</li>
                <li>Bank account information (encrypted at rest)</li>
                <li>VAT numbers and tax identification numbers (encrypted)</li>
                <li>Customer data, vendor information</li>
                <li>Uploaded files (PDFs, images)</li>
                <li>Business plans, roadmaps, and KPIs</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Usage Data</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Login times and session information</li>
                <li>Features used and interaction patterns</li>
                <li>Device information (browser type, operating system)</li>
                <li>IP addresses (for security and analytics)</li>
                <li>Error logs and performance data</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.4 Technical Data</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Cookies and similar tracking technologies</li>
                <li>User agent strings</li>
                <li>Referrer URLs</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Use Your Information</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Service Provision</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process transactions and manage your account</li>
                <li>Store and organize your business data</li>
                <li>Enable features and functionality</li>
                <li>Send service-related notifications (account updates, security alerts)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Security and Compliance</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Authenticate users and prevent unauthorized access</li>
                <li>Detect and prevent fraud, abuse, and security threats</li>
                <li>Comply with legal obligations and respond to legal requests</li>
                <li>Maintain audit logs for security and compliance</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Analytics and Improvement</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Analyze usage patterns to improve the Service</li>
                <li>Monitor performance and identify issues</li>
                <li>Develop new features and functionality</li>
                <li>Personalize your experience (with your consent)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.4 Communications</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Send important service updates and security notifications</li>
                <li>Respond to your inquiries and support requests</li>
                <li>Send marketing communications (only with your explicit consent)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Legal Basis for Processing (GDPR)</h2>
              <p className="text-gray-700 mb-4">
                Under GDPR, we process your personal data based on the following legal bases:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Contract Performance:</strong> To provide the Service and fulfill our Terms of Service</li>
                <li><strong>Legitimate Interests:</strong> For security, fraud prevention, and service improvement</li>
                <li><strong>Consent:</strong> For marketing communications and optional features</li>
                <li><strong>Legal Obligation:</strong> To comply with tax, accounting, and regulatory requirements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Sharing and Disclosure</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 We Do NOT Sell Your Data</h3>
              <p className="text-gray-700 mb-4">
                We never sell, rent, or trade your personal information to third parties for marketing purposes.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Service Providers</h3>
              <p className="text-gray-700 mb-2">We share data with trusted service providers who help us operate the Service:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Google Cloud Platform / Firebase:</strong> Cloud hosting and infrastructure (data centers in EU)</li>
                <li><strong>Payment Processors:</strong> For subscription billing (Stripe, with PCI DSS compliance)</li>
                <li><strong>Analytics Providers:</strong> Google Analytics (with IP anonymization)</li>
                <li><strong>Email Services:</strong> For sending transactional and marketing emails</li>
              </ul>
              <p className="text-gray-700 mb-4">
                All service providers are bound by strict data processing agreements and may only use data to provide services to us.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.3 Account Sharing</h3>
              <p className="text-gray-700 mb-4">
                If you grant access to team members or accountants, they can access data according to the permissions you assign.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.4 Legal Requirements</h3>
              <p className="text-gray-700 mb-2">We may disclose data when required by law:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>To comply with court orders, subpoenas, or legal processes</li>
                <li>To respond to government or regulatory requests</li>
                <li>To protect our rights, property, or safety</li>
                <li>To prevent fraud or abuse</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your GDPR Rights</h2>
              <p className="text-gray-700 mb-4">
                As a user in the BENELUX region, you have the following rights under GDPR:
              </p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Right of Access (Article 15)</h3>
                  <p className="text-gray-700 mb-2">You can request a copy of all personal data we hold about you.</p>
                  <p className="text-sm text-gray-600">→ Use our <strong>Data Export</strong> tool in account settings</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Right to Rectification (Article 16)</h3>
                  <p className="text-gray-700 mb-2">You can correct inaccurate or incomplete data.</p>
                  <p className="text-sm text-gray-600">→ Update your information in account settings</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Right to Erasure / "Right to be Forgotten" (Article 17)</h3>
                  <p className="text-gray-700 mb-2">You can request deletion of your personal data.</p>
                  <p className="text-sm text-gray-600">→ Use our <strong>Account Deletion</strong> tool in account settings</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Right to Data Portability (Article 20)</h3>
                  <p className="text-gray-700 mb-2">You can receive your data in a structured, machine-readable format.</p>
                  <p className="text-sm text-gray-600">→ Export your data as JSON from account settings</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Right to Object (Article 21)</h3>
                  <p className="text-gray-700 mb-2">You can object to processing based on legitimate interests.</p>
                  <p className="text-sm text-gray-600">→ Contact us at privacy@biz-copilot.nl</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Right to Restrict Processing (Article 18)</h3>
                  <p className="text-gray-700 mb-2">You can request limitation of data processing in certain circumstances.</p>
                  <p className="text-sm text-gray-600">→ Contact us at privacy@biz-copilot.nl</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Right to Withdraw Consent (Article 7)</h3>
                  <p className="text-gray-700 mb-2">You can withdraw consent for optional processing at any time.</p>
                  <p className="text-sm text-gray-600">→ Manage consents in account settings</p>
                </div>
              </div>

              <p className="text-gray-700 mt-4">
                To exercise these rights, contact us at <a href="mailto:privacy@biz-copilot.nl" className="text-blue-600 hover:underline">privacy@biz-copilot.nl</a>. We will respond within 30 days (as required by GDPR).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Security</h2>
              
              <div className="flex items-start mb-4">
                <FaShieldAlt className="w-6 h-6 text-blue-600 mr-3 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Security Measures</h3>
                  <p className="text-gray-700 mb-4">
                    We implement industry-standard security measures to protect your data:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                    <li><strong>Encryption:</strong> Data encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
                    <li><strong>Field-Level Encryption:</strong> Sensitive fields (amounts, VAT numbers, bank accounts) encrypted separately</li>
                    <li><strong>Authentication:</strong> Multi-factor authentication (MFA) supported</li>
                    <li><strong>Access Controls:</strong> Role-based access control (RBAC) and permission management</li>
                    <li><strong>Security Headers:</strong> Content Security Policy, HSTS, and other protective headers</li>
                    <li><strong>Audit Logging:</strong> Comprehensive logging of all security events</li>
                    <li><strong>Regular Security Audits:</strong> Ongoing security assessments and penetration testing</li>
                    <li><strong>Secure Infrastructure:</strong> Google Cloud Platform with SOC 2 Type II compliance</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Data Breach Notification</h3>
              <p className="text-gray-700">
                In the event of a data breach that poses a risk to your rights and freedoms, we will notify you and the relevant supervisory authority within 72 hours, as required by GDPR Article 33-34.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Data Retention</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.1 Active Accounts</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Data is retained for as long as your account is active</li>
                <li>You can delete your data at any time through account settings</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.2 Deleted Accounts</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>After account deletion request: 30-day grace period for account recovery</li>
                <li>After grace period: Permanent deletion of all data</li>
                <li>Backups: Deleted within 90 days of account deletion</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.3 Legal Retention Requirements</h3>
              <p className="text-gray-700 mb-4">
                Some data may be retained longer to comply with legal obligations:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Financial Records:</strong> 7 years (tax compliance requirements)</li>
                <li><strong>Audit Logs:</strong> 90 days (security and compliance)</li>
                <li><strong>Legal Holds:</strong> Retained if required by ongoing legal proceedings</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. International Data Transfers</h2>
              
              <div className="flex items-start mb-4">
                <FaGlobe className="w-6 h-6 text-blue-600 mr-3 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">10.1 Data Storage Location</h3>
                  <p className="text-gray-700 mb-4">
                    Your data is primarily stored in the European Union (EU) data centers:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                    <li><strong>Primary:</strong> Google Cloud Platform EU region (Belgium, Netherlands)</li>
                    <li><strong>Backups:</strong> Within EU data centers</li>
                    <li><strong>CDN:</strong> EU-based content delivery networks</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-3">10.2 Transfers Outside EU</h3>
                  <p className="text-gray-700 mb-4">
                    If data is transferred outside the EU (e.g., for support or analytics), we ensure adequate protection:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
                    <li>Adequacy decisions for countries with equivalent data protection</li>
                    <li>Additional safeguards for sensitive data</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Cookies and Tracking</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">11.1 Types of Cookies</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Essential Cookies:</strong> Required for authentication and service functionality (cannot be disabled)</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how you use the Service (requires consent)</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">11.2 Cookie Consent</h3>
              <p className="text-gray-700 mb-4">
                We use a cookie consent banner that allows you to accept or reject non-essential cookies. You can manage cookie preferences at any time in your browser settings or account settings.
              </p>

              <p className="text-gray-700">
                For detailed information, see our <a href="/cookies" className="text-blue-600 hover:underline">Cookie Policy</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Children's Privacy</h2>
              <p className="text-gray-700">
                The Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately and we will delete it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to This Privacy Policy</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.</li>
                <li>Material changes will be communicated via email 30 days before they take effect.</li>
                <li>The "Last Updated" date at the top indicates when this policy was last revised.</li>
                <li>Continued use of the Service after changes constitutes acceptance of the updated Privacy Policy.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Supervisory Authority</h2>
              <p className="text-gray-700 mb-4">
                If you believe we have violated your data protection rights, you have the right to lodge a complaint with your local data protection authority:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Netherlands</h4>
                  <p className="text-sm text-gray-700">
                    <a href="https://autoriteitpersoonsgegevens.nl" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      Autoriteit Persoonsgegevens (AP)
                    </a>
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Belgium</h4>
                  <p className="text-sm text-gray-700">
                    <a href="https://www.gegevensbeschermingsautoriteit.be" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      Gegevensbeschermingsautoriteit (GBA)
                    </a>
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Luxembourg</h4>
                  <p className="text-sm text-gray-700">
                    <a href="https://cnpd.public.lu" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      Commission Nationale pour la Protection des Données (CNPD)
                    </a>
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Us</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-4">
                  For questions, concerns, or to exercise your GDPR rights, contact our Data Protection Officer:
                </p>
                <p className="text-gray-700">
                  <strong>Email:</strong> <a href="mailto:privacy@biz-copilot.nl" className="text-blue-600 hover:underline">privacy@biz-copilot.nl</a><br />
                  <strong>Website:</strong> <a href="https://biz-copilot.nl" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">biz-copilot.nl</a><br />
                  <strong>Response Time:</strong> We aim to respond within 48 hours (GDPR requires response within 30 days)
                </p>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Your privacy is our priority. We are committed to GDPR compliance and protecting your personal data.
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <FaUserShield className="w-4 h-4 mr-2" />
                  GDPR Compliant
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

