import React from 'react';
import { FaFileContract, FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa';

const TermsOfService = () => {
  const lastUpdated = 'January 2025';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {/* Header */}
          <div className="flex items-center mb-8">
            <FaFileContract className="w-10 h-10 text-blue-600 mr-4" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
              <p className="text-sm text-gray-500 mt-1">Last Updated: {lastUpdated}</p>
            </div>
          </div>

          {/* Legal Notice */}
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <FaExclamationTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>Legal Notice:</strong> These Terms of Service are governed by Dutch law and apply to users in the Netherlands, Belgium, and Luxembourg (BENELUX region). Please read these terms carefully before using Biz-CoPilot.
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using Biz-CoPilot ("the Service"), you accept and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
              </p>
              <p className="text-gray-700">
                These Terms constitute a legally binding agreement between you ("User", "you", or "your") and GrandCart Creations ("we", "us", "our", or "Company"), the operator of Biz-CoPilot.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Definitions</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>"Service"</strong> refers to the Biz-CoPilot business operating system and all associated features, functions, and content.</li>
                <li><strong>"User"</strong> refers to any individual or entity that accesses or uses the Service.</li>
                <li><strong>"User Data"</strong> refers to all data, information, and content uploaded, created, or stored by Users in the Service.</li>
                <li><strong>"Account"</strong> refers to a registered user account on the Service.</li>
                <li><strong>"Subscription"</strong> refers to any paid access plan to the Service.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Account Creation</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>You must be at least 18 years old or have the consent of a parent or guardian to create an account.</li>
                <li>You agree to provide accurate, current, and complete information during registration.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You are responsible for all activities that occur under your account.</li>
                <li>One person or entity may not maintain more than one account.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Account Security</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>You must immediately notify us of any unauthorized use of your account.</li>
                <li>You agree to use strong passwords and enable Multi-Factor Authentication (MFA) when available.</li>
                <li>We are not liable for any loss or damage arising from unauthorized access to your account.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Account Termination</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>You may terminate your account at any time by requesting deletion in your account settings.</li>
                <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
                <li>Upon termination, your access to the Service will cease, and your data will be deleted according to our Privacy Policy.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Permitted Use</h3>
              <p className="text-gray-700 mb-4">
                You may use the Service solely for lawful business purposes in accordance with these Terms and all applicable laws and regulations.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Prohibited Activities</h3>
              <p className="text-gray-700 mb-2">You agree NOT to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Upload, transmit, or store malicious software, viruses, or harmful code</li>
                <li>Attempt to breach, circumvent, or disable security measures</li>
                <li>Share your account credentials with third parties</li>
                <li>Use the Service for any illegal or fraudulent activities</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                <li>Access or attempt to access other users' data without authorization</li>
                <li>Use automated systems (bots, scrapers) to access the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Upload content that violates intellectual property rights</li>
                <li>Upload content that is defamatory, discriminatory, or violates privacy rights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Ownership and Rights</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 Your Data</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>You retain full ownership of all data you upload or create in the Service.</li>
                <li>You grant us a limited license to store, process, and transmit your data solely to provide the Service.</li>
                <li>You can export your data at any time in standard formats (JSON, CSV).</li>
                <li>You can request deletion of your data at any time (subject to legal retention requirements).</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Data Backup</h3>
              <p className="text-gray-700 mb-4">
                While we maintain automated backups, you are responsible for maintaining your own backups of critical data. We are not liable for data loss.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">5.3 GDPR Rights</h3>
              <p className="text-gray-700 mb-4">
                As a User in the BENELUX region, you have rights under the General Data Protection Regulation (GDPR), including the right to access, rectify, erase, and port your data. See our Privacy Policy for details.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Service Availability</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>We strive for 99.9% uptime but do not guarantee uninterrupted or error-free service.</li>
                <li>Scheduled maintenance will be announced with reasonable notice.</li>
                <li>We are not liable for service interruptions due to circumstances beyond our control.</li>
                <li>The Service may be modified, suspended, or discontinued at any time with notice.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Payment Terms</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.1 Subscription Fees</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Subscription fees are billed in advance on a monthly or annual basis.</li>
                <li>All fees are non-refundable except as required by law (e.g., EU consumer protection laws).</li>
                <li>Prices are displayed in Euros (€) and include applicable VAT for BENELUX customers.</li>
                <li>We reserve the right to change prices with 30 days written notice.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.2 Payment Failure</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Failure to pay subscription fees may result in account suspension.</li>
                <li>After 30 days of non-payment, your account and data may be permanently deleted.</li>
                <li>You will receive advance notice before any suspension or deletion.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.3 Refunds</h3>
              <p className="text-gray-700">
                Refunds are provided only as required by applicable consumer protection laws in your jurisdiction. For BENELUX customers, you have the right to cancel within 14 days of subscription purchase under EU consumer protection regulations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>The Service, including software, design, logos, and documentation, is protected by copyright and other intellectual property laws.</li>
                <li>All rights, title, and interest in the Service remain with GrandCart Creations.</li>
                <li>You may not copy, modify, distribute, or create derivative works of the Service.</li>
                <li>The "Biz-CoPilot" name and logo are trademarks of GrandCart Creations.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.1 Disclaimer</h3>
              <p className="text-gray-700 mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.2 Limitation of Damages</h3>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE TOTAL AMOUNT PAID BY YOU FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.3 Exclusions</h3>
              <p className="text-gray-700 mb-4">
                We are not liable for:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Indirect, incidental, special, or consequential damages</li>
                <li>Loss of profits, revenue, data, or business opportunities</li>
                <li>Data loss or corruption</li>
                <li>Service interruptions or unavailability</li>
                <li>Third-party actions or services</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">9.4 BENELUX Consumer Rights</h3>
              <p className="text-gray-700">
                Nothing in this section limits your rights as a consumer under applicable BENELUX consumer protection laws, which may provide additional protections.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to indemnify, defend, and hold harmless GrandCart Creations, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any law or third-party rights</li>
                <li>Content you upload or transmit through the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Termination</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">11.1 Termination by You</h3>
              <p className="text-gray-700 mb-4">
                You may terminate your account at any time through your account settings. Upon termination:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Your access to the Service will immediately cease</li>
                <li>Your data will be retained for 30 days (grace period for account recovery)</li>
                <li>After 30 days, your data will be permanently deleted</li>
                <li>No refunds will be provided for unused subscription periods</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">11.2 Termination by Us</h3>
              <p className="text-gray-700 mb-4">
                We may suspend or terminate your account immediately if:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>You violate these Terms of Service</li>
                <li>You engage in illegal or fraudulent activities</li>
                <li>You fail to pay subscription fees</li>
                <li>Required by law or court order</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>We reserve the right to modify these Terms at any time.</li>
                <li>Material changes will be communicated via email 30 days before taking effect.</li>
                <li>Continued use of the Service after changes constitutes acceptance of the new Terms.</li>
                <li>If you do not agree to modified Terms, you must terminate your account.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Governing Law and Jurisdiction</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">13.1 Applicable Law</h3>
              <p className="text-gray-700 mb-4">
                These Terms are governed by Dutch law (Nederlandse wet), without regard to conflict of law principles.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">13.2 Jurisdiction</h3>
              <p className="text-gray-700 mb-4">
                For disputes arising from these Terms:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Netherlands:</strong> Courts of Amsterdam, Netherlands</li>
                <li><strong>Belgium:</strong> You may choose courts of Brussels, Belgium or Amsterdam, Netherlands</li>
                <li><strong>Luxembourg:</strong> You may choose courts of Luxembourg or Amsterdam, Netherlands</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">13.3 Alternative Dispute Resolution</h3>
              <p className="text-gray-700">
                Before filing a lawsuit, we encourage you to contact us to resolve disputes amicably. EU consumers may also use the EU Online Dispute Resolution platform at <a href="https://ec.europa.eu/consumers/odr" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Severability</h2>
              <p className="text-gray-700">
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect. The invalid provision will be replaced with a valid provision that most closely reflects the intent of the original.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Entire Agreement</h2>
              <p className="text-gray-700">
                These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and GrandCart Creations regarding the Service and supersede all prior agreements and understandings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>GrandCart Creations</strong><br />
                  Email: <a href="mailto:legal@biz-copilot.nl" className="text-blue-600 hover:underline">legal@biz-copilot.nl</a><br />
                  Website: <a href="https://biz-copilot.nl" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">biz-copilot.nl</a>
                </p>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  By using Biz-CoPilot, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <FaShieldAlt className="w-4 h-4 mr-2" />
                  Secure & Compliant
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

