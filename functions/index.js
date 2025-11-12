/* eslint-env node */

/**
 * CLOUD FUNCTIONS FOR BIZ-COPILOT
 * 
 * Handles email notifications and other background tasks
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const sgMail = require('@sendgrid/mail');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Define secrets for Firebase Functions v2
const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const SENDGRID_FROM_EMAIL = defineSecret('SENDGRID_FROM_EMAIL');
const APP_URL = defineSecret('APP_URL');

/**
 * Send invitation email when a new invitation is created
 * Triggers on: companies/{companyId}/invitations/{invitationId}
 */
exports.sendInvitationEmail = onDocumentCreated(
  {
    document: 'companies/{companyId}/invitations/{invitationId}',
    secrets: [SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, APP_URL]
  },
  async (event) => {
    const invitationData = event.data.data();
    const { companyId, invitationId } = event.params;

    // Get API key and trim any whitespace/newlines
    const apiKey = (SENDGRID_API_KEY.value() || '').trim();
    
    // Skip if email sending is disabled or no API key
    if (!apiKey) {
      console.warn('SendGrid API key not configured. Skipping email send.');
      return null;
    }

    // Initialize SendGrid with API key from secret (trimmed)
    sgMail.setApiKey(apiKey);

    // Skip if invitation is not pending
    if (invitationData.status !== 'pending') {
      console.log('Invitation is not pending, skipping email');
      return null;
    }

    try {
      // Get company details
      const companyDoc = await db.doc(`companies/${companyId}`).get();
      const companyData = companyDoc.data();
      const companyName = companyData?.name || 'Biz-CoPilot';

      // Get inviter details
      let inviterName = 'A team member';
      if (invitationData.invitedBy) {
        try {
          const inviterDoc = await db.doc(`users/${invitationData.invitedBy}`).get();
          const inviterData = inviterDoc.data();
          inviterName = inviterData?.displayName || inviterData?.email?.split('@')[0] || 'A team member';
        } catch (error) {
          console.warn('Could not fetch inviter details:', error);
        }
      }

      // Get role display name
      const roleNames = {
        owner: 'Owner',
        manager: 'Manager',
        employee: 'Employee',
        accountant: 'Accountant'
      };
      const roleName = roleNames[invitationData.role] || invitationData.role;

      // Create invitation acceptance URL with company branding (trim any whitespace)
      const baseUrl = (APP_URL.value() || 'http://localhost:5173').trim();
      // Include company ID in URL for branded login/signup pages
      const acceptUrl = `${baseUrl}/accept-invitation?company=${companyId}&invitation=${invitationId}`;
      const loginUrl = `${baseUrl}/login?company=${companyId}&email=${encodeURIComponent(invitationData.email)}`;
      const signupUrl = `${baseUrl}/signup?company=${companyId}&email=${encodeURIComponent(invitationData.email)}`;

      // Email content
      const emailSubject = `You've been invited to join ${companyName} on Biz-CoPilot`;
      
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation - Biz-CoPilot</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #005C70 0%, #00BFA6 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Biz-CoPilot</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px; font-weight: 600;">You've Been Invited!</h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hello,
              </p>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on Biz-CoPilot as a <strong>${roleName}</strong>.
              </p>
              
              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Biz-CoPilot is your intelligent business management platform for BENELUX entrepreneurs. Accept this invitation to start collaborating with your team.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${acceptUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #005C70 0%, #00BFA6 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 92, 112, 0.3);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Quick Access Links -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                  <td align="center" style="padding: 0 0 10px;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Or use these quick links:</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0 0 20px;">
                    <a href="${loginUrl}" style="color: #005C70; text-decoration: none; font-size: 14px; margin: 0 10px;">Sign In</a>
                    <span style="color: #d1d5db;">|</span>
                    <a href="${signupUrl}" style="color: #005C70; text-decoration: none; font-size: 14px; margin: 0 10px;">Sign Up</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; color: #005C70; font-size: 12px; word-break: break-all;">
                ${acceptUrl}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © ${new Date().getFullYear()} Biz-CoPilot. All rights reserved.
              </p>
              <p style="margin: 5px 0 0; color: #9ca3af; font-size: 11px;">
                BENELUX Business Management Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const emailText = `
You've Been Invited to Join ${companyName} on Biz-CoPilot!

Hello,

${inviterName} has invited you to join ${companyName} on Biz-CoPilot as a ${roleName}.

Biz-CoPilot is your intelligent business management platform for BENELUX entrepreneurs.

Accept this invitation by clicking the link below:
${acceptUrl}

Quick access links:
- Sign In: ${loginUrl}
- Sign Up: ${signupUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

---
© ${new Date().getFullYear()} Biz-CoPilot. All rights reserved.
      `;

      // Send email via SendGrid (trim FROM email)
      const fromEmail = (SENDGRID_FROM_EMAIL.value() || 'noreply@biz-copilot.nl').trim();
      const msg = {
        to: invitationData.email,
        from: {
          email: fromEmail,
          name: 'Biz-CoPilot'
        },
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      };

      await sgMail.send(msg);
      
      console.log(`Invitation email sent successfully to ${invitationData.email} for company ${companyId}`);
      
      // Optionally update invitation document to mark email as sent
      await db.doc(`companies/${companyId}/invitations/${invitationId}`).update({
        emailSent: true,
        emailSentAt: new Date().toISOString()
      });

      return null;
    } catch (error) {
      console.error('Error sending invitation email:', error);
      
      // Log error but don't fail the function
      // The invitation document was created successfully
      await db.doc(`companies/${companyId}/invitations/${invitationId}`).update({
        emailError: error.message,
        emailSent: false
      });

      throw error;
    }
  }
);

const checkVatSoapEnvelope = (countryCode, vatNumber) => `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soap:Body>
    <tns:checkVat>
      <tns:countryCode>${countryCode}</tns:countryCode>
      <tns:vatNumber>${vatNumber}</tns:vatNumber>
    </tns:checkVat>
  </soap:Body>
</soap:Envelope>`;

const parseSoapValue = (xml, tag) => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
};

exports.validateVat = onCall({ region: 'europe-west1' }, async (request) => {
  const { countryCode, vatNumber } = request.data || {};
  if (!countryCode || !vatNumber) {
    throw new Error('countryCode and vatNumber are required');
  }

  const sanitizedCountry = String(countryCode).toUpperCase().trim();
  const sanitizedVat = String(vatNumber).replace(/[^A-Za-z0-9]/g, '').replace(new RegExp(`^${sanitizedCountry}`), '');

  try {
    const response = await fetch('https://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'text/xml',
        'User-Agent': 'Biz-CoPilot VAT Validator'
      },
      body: checkVatSoapEnvelope(sanitizedCountry, sanitizedVat)
    });

    const body = await response.text();

    if (!response.ok) {
      const fault = parseSoapValue(body, 'faultstring') || response.statusText;
      throw new Error(fault || 'VIES service error');
    }

    const valid = parseSoapValue(body, 'valid').toLowerCase() === 'true';
    const result = {
      valid,
      countryCode: parseSoapValue(body, 'countryCode') || sanitizedCountry,
      vatNumber: parseSoapValue(body, 'vatNumber') || sanitizedVat,
      requestDate: parseSoapValue(body, 'requestDate') || new Date().toISOString(),
      name: parseSoapValue(body, 'name') || '',
      address: parseSoapValue(body, 'address') || ''
    };

    return { success: true, data: result };
  } catch (error) {
    console.error('VAT validation error', error);
    throw new Error(error.message || 'Failed to validate VAT number');
  }
});

