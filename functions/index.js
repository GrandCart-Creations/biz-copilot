/* eslint-env node */

/**
 * CLOUD FUNCTIONS FOR BIZ-COPILOT
 * 
 * Handles email notifications and other background tasks
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const sgMail = require('@sendgrid/mail');
const { jsPDF } = require('jspdf');
const OpenAI = require('openai');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const adminAuth = getAuth();

// Define secrets for Firebase Functions v2
const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const SENDGRID_FROM_EMAIL = defineSecret('SENDGRID_FROM_EMAIL');
const APP_URL = defineSecret('APP_URL');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/**
 * Helper function to convert hex color to RGB
 */
const hexToRgb = (hex) => {
  if (!hex) return [79, 70, 229]; // Default indigo
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [79, 70, 229];
};

/**
 * Generate Receipt PDF in Cloud Functions
 */
const generateReceiptPDF = (invoice, company, paymentDetails = {}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Helper function to add text
  const addText = (text, x, y, options = {}) => {
    const {
      fontSize = 10,
      fontStyle = 'normal',
      color = [0, 0, 0],
      maxWidth = contentWidth,
      align = 'left'
    } = options;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(...color);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y, { align });
    return y + (lines.length * fontSize * 0.4);
  };

  // Get company branding
  const branding = company?.branding || {};
  const primaryColor = hexToRgb(branding.primaryColor || company?.primaryColor || '#4F46E5');
  const companyName = company?.name || 'Biz-CoPilot';
  
  // Generate receipt number
  const receiptNumber = `REC-${invoice.invoiceNumber || invoice.id || 'N/A'}`;
  const paidDate = invoice.paidDate?.toDate?.() || new Date(invoice.paidDate || new Date());

  // Header with company color (30px)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  addText(companyName, margin, 20, {
    fontSize: 16,
    fontStyle: 'bold',
    color: [255, 255, 255]
  });

  // Receipt title and number
  yPos = margin + 30;
  addText('RECEIPT', pageWidth - margin, yPos, {
    fontSize: 24,
    fontStyle: 'bold',
    align: 'right'
  });
  
  yPos += 8;
  addText(`Receipt #${receiptNumber}`, pageWidth - margin, yPos, {
    fontSize: 12,
    align: 'right',
    color: [100, 100, 100]
  });

  // Company info (left side)
  yPos = margin + 40;
  addText(companyName, margin, yPos, {
    fontSize: 12,
    fontStyle: 'bold'
  });

  // Customer info (right side)
  yPos = margin + 40;
  const customerInfo = [
    'Paid By:',
    invoice.customerName || '',
    invoice.customerAddress || ''
  ].filter(Boolean);
  
  customerInfo.forEach((line, index) => {
    yPos = addText(line, pageWidth / 2, yPos + (index === 0 ? 0 : 5), {
      fontSize: index === 0 ? 12 : 10,
      fontStyle: index === 0 ? 'bold' : 'normal',
      align: 'left'
    });
  });

  // Payment date
  yPos += 10;
  addText(`Payment Date: ${paidDate.toLocaleDateString()}`, margin, yPos, {
    fontSize: 10
  });

  // Invoice reference
  addText(`For Invoice: ${invoice.invoiceNumber || 'N/A'}`, pageWidth - margin, yPos, {
    fontSize: 10,
    align: 'right'
  });

  // Line items table
  yPos += 20;
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
  
  addText('Description', margin + 2, yPos, { fontSize: 10, fontStyle: 'bold' });
  addText('Qty', margin + 100, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });
  addText('Amount', pageWidth - margin - 2, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });
  
  yPos += 8;

  // Line items
  const lineItems = invoice.lineItems || [];
  lineItems.forEach((item) => {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin + 20;
    }

    addText(item.description || '', margin + 2, yPos, { fontSize: 10, maxWidth: 90 });
    addText((item.quantity || 0).toString(), margin + 100, yPos, { fontSize: 10, align: 'right' });
    addText(`€${(item.amount || 0).toFixed(2)}`, pageWidth - margin - 2, yPos, { fontSize: 10, align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos + 3, pageWidth - margin, yPos + 3);
    
    yPos += 8;
  });

  // Totals
  yPos += 10;
  const subtotal = parseFloat(invoice.subtotal || 0);
  const taxAmount = parseFloat(invoice.taxAmount || 0);
  const total = parseFloat(invoice.total || 0);

  addText('Subtotal:', pageWidth - margin - 60, yPos, {
    fontSize: 10,
    align: 'right'
  });
  addText(`€${subtotal.toFixed(2)}`, pageWidth - margin - 2, yPos, {
    fontSize: 10,
    align: 'right'
  });

  if (invoice.taxRate > 0) {
    yPos += 6;
    addText(`VAT (${invoice.taxRate}%):`, pageWidth - margin - 60, yPos, {
      fontSize: 10,
      align: 'right'
    });
    addText(`€${taxAmount.toFixed(2)}`, pageWidth - margin - 2, yPos, {
      fontSize: 10,
      align: 'right'
    });
  }

  // Total line immediately after VAT
  yPos += 6;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - margin - 80, yPos - 2, pageWidth - margin, yPos - 2);
  
  addText('Total Paid:', pageWidth - margin - 80, yPos, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'right'
  });
  addText(`€${total.toFixed(2)}`, pageWidth - margin - 2, yPos, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'right'
  });

  // Payment Information
  yPos += 20;
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin + 20;
  }
  
  doc.setFillColor(...primaryColor);
  doc.setDrawColor(...primaryColor);
  const paymentBoxHeight = 25;
  const paymentBoxY = yPos - 5;
  doc.roundedRect(margin, paymentBoxY, contentWidth, paymentBoxHeight, 3, 3, 'FD');
  
  addText('Payment Confirmation', margin + 8, paymentBoxY + 6, {
    fontSize: 11,
    fontStyle: 'bold',
    color: [255, 255, 255]
  });
  
  yPos = paymentBoxY + 12;
  if (paymentDetails.paymentMethod) {
    addText(`Payment Method: ${paymentDetails.paymentMethod}`, margin + 8, yPos, {
      fontSize: 9,
      color: [255, 255, 255]
    });
    yPos += 5;
  }
  
  if (paymentDetails.paymentReference) {
    addText(`Reference: ${paymentDetails.paymentReference}`, margin + 8, yPos, {
      fontSize: 9,
      color: [255, 255, 255]
    });
    yPos += 5;
  }
  
  addText(`Paid on: ${paidDate.toLocaleDateString()}`, margin + 8, yPos, {
    fontSize: 9,
    color: [255, 255, 255]
  });

  // Footer
  yPos = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `${companyName} • Receipt for Invoice ${invoice.invoiceNumber || 'N/A'} • ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  return doc;
};

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
      const baseUrl = (APP_URL.value() || 'https://biz-copilot.nl').trim();
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

      // Send email via SendGrid
      const response = await sgMail.send(msg);
      
      // Log detailed response from SendGrid
      console.log(`[sendInvitationEmail] SendGrid response for ${invitationData.email}:`, {
        statusCode: response[0]?.statusCode,
        headers: response[0]?.headers,
        body: response[0]?.body
      });
      
      console.log(`[sendInvitationEmail] Invitation email accepted by SendGrid for ${invitationData.email} (company: ${companyId}, invitation: ${invitationId})`);
      console.log(`[sendInvitationEmail] From: ${fromEmail}, To: ${invitationData.email}, Subject: ${emailSubject}`);
      
      // Update invitation document to mark email as accepted by SendGrid
      // Note: This means SendGrid accepted it, not that it reached the inbox
      await db.doc(`companies/${companyId}/invitations/${invitationId}`).update({
        emailSent: true,
        emailSentAt: new Date().toISOString(),
        emailSentVia: 'SendGrid',
        emailStatus: 'accepted', // SendGrid accepted it for delivery
        emailError: null // Clear any previous errors
      });

      return null;
    } catch (error) {
      console.error(`[sendInvitationEmail] ERROR sending invitation email to ${invitationData.email}:`, error);
      console.error(`[sendInvitationEmail] Error details:`, {
        message: error.message,
        code: error.code,
        response: error.response ? {
          statusCode: error.response.statusCode,
          body: error.response.body,
          headers: error.response.headers
        } : null,
        stack: error.stack
      });
      
      // Extract detailed error message from SendGrid
      let errorMessage = 'Failed to send email';
      if (error.response) {
        const body = error.response.body || {};
        if (body.errors && Array.isArray(body.errors) && body.errors.length > 0) {
          errorMessage = body.errors.map(e => e.message || e).join('; ');
        } else if (body.message) {
          errorMessage = body.message;
        } else {
          errorMessage = error.response.statusCode === 401 ? 'Unauthorized: Check SendGrid API key and sender email' : 
                        error.response.statusCode === 403 ? 'Forbidden: Sender email not verified or domain not authenticated' :
                        `SendGrid error (${error.response.statusCode})`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Log error and update invitation document
      await db.doc(`companies/${companyId}/invitations/${invitationId}`).update({
        emailError: errorMessage,
        emailSent: false,
        emailStatus: 'failed',
        emailErrorAt: new Date().toISOString()
      });

      // Don't throw - allow invitation to be created even if email fails
      // User can resend later
      console.error(`[sendInvitationEmail] Email send failed but invitation created. Error: ${errorMessage}`);
      return null;
    }
  }
);

// Rate limiting for verification emails (prevent multiple sends that invalidate previous codes)
const verificationEmailCache = new Map(); // email -> { timestamp, count }
const VERIFICATION_COOLDOWN = 60000; // 60 seconds minimum between sends
const MAX_VERIFICATION_ATTEMPTS = 3; // Max 3 emails per hour

/**
 * Send Firebase Auth email verification via SendGrid from custom domain.
 * Callable from client after sign-up / from onboarding.
 * Includes rate limiting to prevent invalidating previous verification codes.
 */
exports.sendAuthVerificationEmail = onCall(
  { 
    secrets: [SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, APP_URL],
    region: 'europe-west1'
  },
  async (request) => {
    const { email } = request.data || {};
    if (!email) {
      throw new Error('Email is required');
    }
    
    // Rate limiting: prevent rapid resends that invalidate previous codes
    const now = Date.now();
    const cached = verificationEmailCache.get(email);
    if (cached) {
      const timeSinceLastSend = now - cached.timestamp;
      if (timeSinceLastSend < VERIFICATION_COOLDOWN) {
        const remainingSeconds = Math.ceil((VERIFICATION_COOLDOWN - timeSinceLastSend) / 1000);
        throw new Error(`Please wait ${remainingSeconds} seconds before requesting another verification email. Rapid resends invalidate previous verification links.`);
      }
      
      // Check if too many attempts in the last hour
      if (cached.count >= MAX_VERIFICATION_ATTEMPTS && timeSinceLastSend < 3600000) {
        throw new Error('Too many verification emails sent. Please wait 1 hour before requesting another. Check your spam/junk folder for previous emails.');
      }
    }
    
    const apiKey = (SENDGRID_API_KEY.value() || '').trim();
    if (!apiKey) {
      throw new Error('SendGrid API key is not configured');
    }
    const fromEmail = (SENDGRID_FROM_EMAIL.value() || 'noreply@biz-copilot.nl').trim();
    const baseUrl = (APP_URL.value() || 'https://biz-copilot.nl').trim();
    
    // Generate a verification link via Firebase Admin (respects 1‑hour expiry)
    // Note: Firebase Auth always uses firebaseapp.com for the action URL,
    // but continueUrl redirects to our custom domain after verification
    const link = await adminAuth.generateEmailVerificationLink(email, {
      url: `${baseUrl}/email-verification`,
      handleCodeInApp: false
    });
    
    // Update rate limiting cache
    verificationEmailCache.set(email, {
      timestamp: now,
      count: cached ? (cached.count + 1) : 1
    });
    
    // Clean up old cache entries (older than 1 hour)
    for (const [key, value] of verificationEmailCache.entries()) {
      if (now - value.timestamp > 3600000) {
        verificationEmailCache.delete(key);
      }
    }
    
    sgMail.setApiKey(apiKey);
    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'Biz-CoPilot'
      },
      subject: 'Verify your email for Biz‑CoPilot',
      text: `Hello,\n\nPlease verify your email by clicking this link:\n${link}\n\nThis link will expire in 1 hour. If you didn't request this, you can ignore this email.\n\nThanks,\nBiz‑CoPilot`,
      html: `<p>Hello,</p>
             <p>Please verify your email by clicking this link:</p>
             <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
             <p>Or copy and paste this link into your browser:</p>
             <p style="word-break:break-all;color:#666;font-size:12px;">${link}</p>
             <p style="color:#666;font-size:12px;"><strong>Note:</strong> This link will expire in 1 hour. If you don't see this email in your inbox, check your spam/junk folder.</p>
             <p>If you didn't request this, you can ignore this email.</p>
             <p>Thanks,<br/>Biz‑CoPilot</p>`
    };
    await sgMail.send(msg);
    return { ok: true, message: 'Verification email sent successfully' };
  }
);

/**
 * Send invoice email
 * Callable function to send invoice via email
 */
exports.sendInvoiceEmail = onCall(
  {
    secrets: [SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, APP_URL],
    region: 'europe-west1'
  },
  async (request) => {
    const { companyId, invoiceId, recipientEmail } = request.data;

    if (!companyId || !invoiceId || !recipientEmail) {
      throw new Error('Missing required parameters: companyId, invoiceId, recipientEmail');
    }

    const apiKey = (SENDGRID_API_KEY.value() || '').trim();
    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    sgMail.setApiKey(apiKey);

    try {
      // Get invoice and company data
      const invoiceDoc = await db.doc(`companies/${companyId}/invoices/${invoiceId}`).get();
      if (!invoiceDoc.exists) {
        throw new Error('Invoice not found');
      }
      const invoiceData = invoiceDoc.data();

      const companyDoc = await db.doc(`companies/${companyId}`).get();
      const companyData = companyDoc.data();

      const baseUrl = (APP_URL.value() || 'https://biz-copilot.nl').trim();
      const invoiceUrl = `${baseUrl}/modules/invoices?invoice=${invoiceId}`;

      const invoiceDate = invoiceData.invoiceDate?.toDate?.() || new Date(invoiceData.invoiceDate);
      const dueDate = invoiceData.dueDate?.toDate?.() || (invoiceData.dueDate ? new Date(invoiceData.dueDate) : null);

      const emailSubject = `Invoice ${invoiceData.invoiceNumber} from ${companyData?.name || 'Biz-CoPilot'}`;
      
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - Biz-CoPilot</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Invoice</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Dear ${invoiceData.customerName || 'Customer'},</p>
    
    <p>Please find attached your invoice <strong>${invoiceData.invoiceNumber}</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
      <p style="margin: 5px 0;"><strong>Invoice Date:</strong> ${invoiceDate.toLocaleDateString()}</p>
      ${dueDate ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Total Amount:</strong> €${parseFloat(invoiceData.total || 0).toFixed(2)}</p>
    </div>
    
    <p>You can view and download the invoice by clicking the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${invoiceUrl}" style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Invoice</a>
    </div>
    
    <p>If you have any questions, please don't hesitate to contact us.</p>
    
    <p>Best regards,<br>${companyData?.name || 'Biz-CoPilot'}</p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Biz-CoPilot. All rights reserved.</p>
  </div>
</body>
</html>
      `;

      const fromEmail = (SENDGRID_FROM_EMAIL.value() || 'noreply@biz-copilot.nl').trim();
      const msg = {
        to: recipientEmail,
        from: {
          email: fromEmail,
          name: companyData?.name || 'Biz-CoPilot'
        },
        subject: emailSubject,
        html: emailHtml
      };

      await sgMail.send(msg);
      
      // Update invoice to mark as sent
      await db.doc(`companies/${companyId}/invoices/${invoiceId}`).update({
        status: 'sent',
        sentAt: new Date().toISOString(),
        sentTo: recipientEmail
      });

      return { success: true, message: 'Invoice email sent successfully' };
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw error;
    }
  }
);

/**
 * Send quote email
 * Callable function to send quote via email
 */
exports.sendQuoteEmail = onCall(
  {
    secrets: [SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, APP_URL],
    region: 'europe-west1'
  },
  async (request) => {
    const { companyId, quoteId, recipientEmail } = request.data;

    if (!companyId || !quoteId || !recipientEmail) {
      throw new Error('Missing required parameters: companyId, quoteId, recipientEmail');
    }

    const apiKey = (SENDGRID_API_KEY.value() || '').trim();
    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    sgMail.setApiKey(apiKey);

    try {
      // Get quote and company data
      const quoteDoc = await db.doc(`companies/${companyId}/quotes/${quoteId}`).get();
      if (!quoteDoc.exists) {
        throw new Error('Quote not found');
      }
      const quoteData = quoteDoc.data();

      const companyDoc = await db.doc(`companies/${companyId}`).get();
      const companyData = companyDoc.data();

      const baseUrl = (APP_URL.value() || 'https://biz-copilot.nl').trim();
      const quoteUrl = `${baseUrl}/modules/invoices?quote=${quoteId}`;

      const quoteDate = quoteData.quoteDate?.toDate?.() || new Date(quoteData.quoteDate);
      const expiryDate = quoteData.expiryDate?.toDate?.() || (quoteData.expiryDate ? new Date(quoteData.expiryDate) : null);

      const emailSubject = `Quote ${quoteData.quoteNumber} from ${companyData?.name || 'Biz-CoPilot'}`;
      
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote - Biz-CoPilot</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Quote</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Dear ${quoteData.customerName || 'Customer'},</p>
    
    <p>Please find attached your quote <strong>${quoteData.quoteNumber}</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Quote Number:</strong> ${quoteData.quoteNumber}</p>
      <p style="margin: 5px 0;"><strong>Quote Date:</strong> ${quoteDate.toLocaleDateString()}</p>
      ${expiryDate ? `<p style="margin: 5px 0;"><strong>Valid Until:</strong> ${expiryDate.toLocaleDateString()}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Total Amount:</strong> €${parseFloat(quoteData.total || 0).toFixed(2)}</p>
    </div>
    
    <p>You can view and download the quote by clicking the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${quoteUrl}" style="background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Quote</a>
    </div>
    
    <p>If you have any questions, please don't hesitate to contact us.</p>
    
    <p>Best regards,<br>${companyData?.name || 'Biz-CoPilot'}</p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Biz-CoPilot. All rights reserved.</p>
  </div>
</body>
</html>
      `;

      const fromEmail = (SENDGRID_FROM_EMAIL.value() || 'noreply@biz-copilot.nl').trim();
      const msg = {
        to: recipientEmail,
        from: {
          email: fromEmail,
          name: companyData?.name || 'Biz-CoPilot'
        },
        subject: emailSubject,
        html: emailHtml
      };

      await sgMail.send(msg);
      
      // Update quote to mark as sent
      await db.doc(`companies/${companyId}/quotes/${quoteId}`).update({
        status: 'sent',
        sentAt: new Date().toISOString(),
        sentTo: recipientEmail
      });

      return { success: true, message: 'Quote email sent successfully' };
    } catch (error) {
      console.error('Error sending quote email:', error);
      throw error;
    }
  }
);

/**
 * Send receipt email
 * Callable function to send receipt via email
 */
exports.sendReceiptEmail = onCall(
  {
    secrets: [SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, APP_URL],
    region: 'europe-west1'
  },
  async (request) => {
    const { companyId, invoiceId, recipientEmail, receiptNumber } = request.data;

    if (!companyId || !invoiceId || !recipientEmail) {
      throw new Error('Missing required parameters: companyId, invoiceId, recipientEmail');
    }

    const apiKey = (SENDGRID_API_KEY.value() || '').trim();
    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    sgMail.setApiKey(apiKey);

    try {
      // Get invoice and company data
      const invoiceDoc = await db.doc(`companies/${companyId}/invoices/${invoiceId}`).get();
      if (!invoiceDoc.exists) {
        throw new Error('Invoice not found');
      }
      const invoiceData = invoiceDoc.data();

      const companyDoc = await db.doc(`companies/${companyId}`).get();
      const companyData = companyDoc.data();

      const paidDate = invoiceData.paidDate?.toDate?.() || new Date(invoiceData.paidDate || new Date());

      const emailSubject = `Receipt ${receiptNumber || 'N/A'} - Payment Confirmation from ${companyData?.name || 'Biz-CoPilot'}`;
      
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - Biz-CoPilot</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Payment Receipt</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Dear ${invoiceData.customerName || 'Valued Customer'},</p>
    
    <p>Thank you for your payment! We have received payment for invoice <strong>${invoiceData.invoiceNumber}</strong>.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 5px 0;"><strong>Receipt Number:</strong> ${receiptNumber || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
      <p style="margin: 5px 0;"><strong>Payment Date:</strong> ${paidDate.toLocaleDateString()}</p>
      <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${invoiceData.paymentMethod || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Amount Paid:</strong> €${parseFloat(invoiceData.total || 0).toFixed(2)}</p>
    </div>
    
    <p>Please find your receipt attached to this email. Keep this receipt for your records.</p>
    
    <p>If you have any questions about this payment, please don't hesitate to contact us.</p>
    
    <p>Best regards,<br>
    ${companyData?.name || 'Biz-CoPilot'}</p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Biz-CoPilot. All rights reserved.</p>
  </div>
</body>
</html>
      `;

      // Generate receipt PDF
      const paymentDetails = invoiceData.paymentDetails || {};
      const receiptPDF = generateReceiptPDF(invoiceData, companyData, paymentDetails);
      const receiptFilename = `Receipt-${receiptNumber || invoiceData.invoiceNumber || 'N/A'}.pdf`;
      
      // Convert PDF to base64 for attachment
      const pdfBase64 = receiptPDF.output('datauristring').split(',')[1];
      
      const fromEmail = (SENDGRID_FROM_EMAIL.value() || 'noreply@biz-copilot.nl').trim();
      const msg = {
        to: recipientEmail,
        from: {
          email: fromEmail,
          name: companyData?.name || 'Biz-CoPilot'
        },
        subject: emailSubject,
        html: emailHtml,
        attachments: [
          {
            content: pdfBase64,
            filename: receiptFilename,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      };

      await sgMail.send(msg);
      
      // Update invoice to note receipt was sent
      await db.doc(`companies/${companyId}/invoices/${invoiceId}`).update({
        receiptSentAt: new Date().toISOString(),
        receiptSentTo: recipientEmail,
        receiptNumber: receiptNumber
      });

      return { success: true, message: 'Receipt email sent successfully' };
    } catch (error) {
      console.error('Error sending receipt email:', error);
      throw error;
    }
  }
);

/**
 * Generate recurring invoices from subscriptions
 * Scheduled function that runs daily to generate invoices for subscriptions
 * 
 * IMPORTANT: Scans ALL customers (both personal names and company names)
 * - Fetches full customer details from customers collection
 * - Uses company name if available, otherwise uses personal name
 * - Handles subscriptions linked to customers by customerId
 */
exports.generateRecurringInvoices = onSchedule(
  {
    schedule: '0 9 * * *', // Run daily at 9 AM
    timeZone: 'Europe/Amsterdam',
    region: 'us-central1'
  },
  async (event) => {
    console.log('Running recurring invoice generation...');

    try {
      // Get all companies
      const companiesSnapshot = await db.collection('companies').get();
      const results = [];

      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        
        try {
          // Get active subscriptions
          const subscriptionsRef = db.collection(`companies/${companyId}/subscriptions`);
          const subscriptionsSnapshot = await subscriptionsRef
            .where('status', '==', 'active')
            .where('autoRenew', '==', true)
            .get();

          for (const subDoc of subscriptionsSnapshot.docs) {
            const subscription = { id: subDoc.id, ...subDoc.data() };
            const nextBillingDate = subscription.nextBillingDate?.toDate?.() || 
                                   (subscription.nextBillingDate ? new Date(subscription.nextBillingDate) : null);

            if (!nextBillingDate) continue;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const billingDate = new Date(nextBillingDate);
            billingDate.setHours(0, 0, 0, 0);

            // Check if it's time to generate invoice
            if (billingDate.getTime() === today.getTime() || billingDate < today) {
              // Fetch customer details from customers collection (handles both personal and company names)
              let customerData = {
                name: subscription.customerName || '',
                email: subscription.customerEmail || '',
                address: '',
                company: ''
              };

              if (subscription.customerId) {
                try {
                  const customerDoc = await db.doc(`companies/${companyId}/customers/${subscription.customerId}`).get();
                  if (customerDoc.exists) {
                    const customer = customerDoc.data();
                    // Use customer name (personal) or company name, whichever is available
                    customerData = {
                      name: customer.name || '',
                      company: customer.company || '',
                      email: customer.email || subscription.customerEmail || '',
                      phone: customer.phone || '',
                      address: customer.address || '',
                      city: customer.city || '',
                      country: customer.country || '',
                      postalCode: customer.postalCode || '',
                      vatNumber: customer.vatNumber || '',
                      // Use company name if available, otherwise use personal name
                      displayName: customer.company || customer.name || subscription.customerName || 'Customer'
                    };
                  }
                } catch (customerError) {
                  console.warn(`Could not fetch customer ${subscription.customerId} for subscription ${subscription.id}:`, customerError);
                  // Fallback to subscription data
                  customerData.displayName = subscription.customerName || 'Customer';
                }
              } else {
                // No customerId, use subscription data
                customerData.displayName = subscription.customerName || 'Customer';
              }

              // Calculate invoice amounts
              const amount = parseFloat(subscription.amount || 0);
              const taxRate = parseFloat(subscription.taxRate || 21);
              const subtotal = amount;
              const taxAmount = subtotal * (taxRate / 100);
              const total = subtotal + taxAmount;

              // Build customer address string
              const addressParts = [
                customerData.address,
                customerData.city,
                customerData.postalCode,
                customerData.country
              ].filter(part => part && part.trim());
              const customerAddress = addressParts.join(', ');

              // Generate invoice
              const invoiceData = {
                customerId: subscription.customerId || '',
                customerName: customerData.displayName, // Company name or personal name
                customerEmail: customerData.email,
                customerAddress: customerAddress,
                invoiceDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
                status: 'draft',
                lineItems: [{
                  description: `${subscription.planName} - ${subscription.billingCycle} subscription`,
                  quantity: 1,
                  unitPrice: amount,
                  amount: amount
                }],
                subtotal,
                taxRate,
                taxAmount,
                total,
                currency: subscription.currency || 'EUR',
                subscriptionId: subscription.id,
                billingCycle: subscription.billingCycle,
                notes: `Auto-generated from subscription ${subscription.planName}`,
                createdBy: subscription.createdBy || ''
              };

              const invoicesRef = db.collection(`companies/${companyId}/invoices`);
              const invoiceRef = await invoicesRef.add({
                ...invoiceData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });

              // Calculate next billing date
              const nextDate = new Date(billingDate);
              if (subscription.billingCycle === 'monthly') {
                nextDate.setMonth(nextDate.getMonth() + 1);
              } else if (subscription.billingCycle === 'quarterly') {
                nextDate.setMonth(nextDate.getMonth() + 3);
              } else if (subscription.billingCycle === 'annual') {
                nextDate.setFullYear(nextDate.getFullYear() + 1);
              }

              // Update subscription with next billing date
              await db.doc(`companies/${companyId}/subscriptions/${subscription.id}`).update({
                nextBillingDate: nextDate,
                lastInvoiceGenerated: new Date().toISOString(),
                lastInvoiceId: invoiceRef.id,
                updatedAt: new Date().toISOString()
              });

              results.push({
                companyId,
                subscriptionId: subscription.id,
                invoiceId: invoiceRef.id,
                amount: total
              });

              console.log(`Generated invoice ${invoiceRef.id} for subscription ${subscription.id} in company ${companyId}`);
            }
          }
        } catch (companyError) {
          console.error(`Error processing company ${companyId}:`, companyError);
        }
      }

      console.log(`Recurring invoice generation completed. Generated ${results.length} invoices.`);
      return { success: true, invoicesGenerated: results.length, results };
    } catch (error) {
      console.error('Error in recurring invoice generation:', error);
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

/**
 * Callable: Resend an invitation email for a given company/invitation.
 * Ensures a fresh email is sent without requiring a new invitation doc.
 */
exports.resendInvitationEmail = onCall(
  { 
    secrets: [SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, APP_URL],
    region: 'europe-west1'
  },
  async (request) => {
    const { companyId, invitationId } = request.data || {};
    if (!companyId || !invitationId) {
      throw new Error('companyId and invitationId are required');
    }

    const apiKey = (SENDGRID_API_KEY.value() || '').trim();
    if (!apiKey) {
      throw new Error('SendGrid API key not configured');
    }
    sgMail.setApiKey(apiKey);

    // Load invitation
    const inviteRef = db.doc(`companies/${companyId}/invitations/${invitationId}`);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
      throw new Error('Invitation not found');
    }
    const invitationData = inviteSnap.data();
    if (invitationData.status !== 'pending') {
      throw new Error('Only pending invitations can be resent');
    }

    // Build email content (mirror onCreate trigger)
    // Company
    const companyDoc = await db.doc(`companies/${companyId}`).get();
    const companyData = companyDoc.data();
    const companyName = companyData?.name || 'Biz-CoPilot';

    // Inviter
    let inviterName = 'A team member';
    if (invitationData.invitedBy) {
      try {
        const inviterDoc = await db.doc(`users/${invitationData.invitedBy}`).get();
        const inviterData = inviterDoc.data();
        inviterName = inviterData?.displayName || inviterData?.email?.split('@')[0] || 'A team member';
      } catch (e) {
        console.warn('Could not fetch inviter details:', e);
      }
    }

    const roleNames = {
      owner: 'Owner',
      manager: 'Manager',
      employee: 'Employee',
      accountant: 'Accountant',
      marketingManager: 'Marketing Manager',
      developer: 'Software Engineer',
      dataEntryClerk: 'Data Entry Clerk',
    };
    const roleName = roleNames[invitationData.role] || invitationData.role || 'Member';

    const baseUrl = (APP_URL.value() || 'https://biz-copilot.nl').trim();
    const acceptUrl = `${baseUrl}/accept-invitation?company=${companyId}&invitation=${invitationId}`;
    const loginUrl = `${baseUrl}/login?company=${companyId}&email=${encodeURIComponent(invitationData.email)}`;
    const signupUrl = `${baseUrl}/signup?company=${companyId}&email=${encodeURIComponent(invitationData.email)}`;

    const emailSubject = `You've been invited to join ${companyName} on Biz-CoPilot`;
    const emailHtml = `
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <h2>You've Been Invited!</h2>
  <p>Hello${invitationData.fullName ? ` ${invitationData.fullName}` : ''},</p>
  <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on Biz-CoPilot as a <strong>${roleName}</strong>.</p>
  <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:6px;">Accept Invitation</a></p>
  <p>Or open this link:<br/>${acceptUrl}</p>
  <p>Quick links: <a href="${loginUrl}">Sign in</a> · <a href="${signupUrl}">Sign up</a></p>
  <p style="font-size:12px;color:#6b7280">This invitation will expire in 7 days.</p>
</body></html>`;
    const emailText = `Hello${invitationData.fullName ? ` ${invitationData.fullName}` : ''},

${inviterName} has invited you to join ${companyName} on Biz-CoPilot as a ${roleName}.

Accept this invitation by opening this link:
${acceptUrl}

Or sign in: ${loginUrl}
Or sign up: ${signupUrl}

This invitation will expire in 7 days.`;

    const fromEmail = (SENDGRID_FROM_EMAIL.value() || 'noreply@biz-copilot.nl').trim();
    const msg = {
      to: invitationData.email,
      from: { email: fromEmail, name: 'Biz-CoPilot' },
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    };

    try {
      await sgMail.send(msg);
      await inviteRef.update({
        emailSent: true,
        emailError: null,
        emailSentAt: new Date().toISOString(),
      });
      return { ok: true };
    } catch (error) {
      // Log full error details for debugging
      console.error('Error resending invitation email - Full error:', JSON.stringify(error, null, 2));
      console.error('Error response:', error.response ? JSON.stringify(error.response.body, null, 2) : 'No response');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      
      // Extract detailed error message from SendGrid
      let errorMessage = 'Failed to send';
      if (error.response) {
        const body = error.response.body || {};
        console.error('SendGrid response body:', JSON.stringify(body, null, 2));
        if (body.errors && Array.isArray(body.errors) && body.errors.length > 0) {
          errorMessage = body.errors.map(e => e.message || e).join('; ');
        } else if (body.message) {
          errorMessage = body.message;
        } else {
          errorMessage = error.response.statusCode === 401 ? 'Unauthorized: Check SendGrid API key and sender email' : 
                        error.response.statusCode === 403 ? 'Forbidden: Sender email not verified or domain not authenticated' :
                        `SendGrid error (${error.response.statusCode})`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      await inviteRef.update({
        emailSent: false,
        emailError: errorMessage,
      });
      throw new Error(`Failed to resend invitation: ${errorMessage}`);
    }
  }
);

/**
 * Process AI Query - Main AI Engine Function
 * Handles natural language queries and returns intelligent responses
 */
exports.processAIQuery = onCall(
  {
    secrets: [OPENAI_API_KEY],
    region: 'europe-west1',
    cors: true // Enable CORS for cross-origin requests
  },
  async (request) => {
    const { query, scope, companyId, userId } = request.data;

    // Validate input
    if (!query || !companyId || !userId) {
      throw new Error('Missing required parameters: query, companyId, userId');
    }

    try {
      // Initialize OpenAI
      const openai = new OpenAI({
        apiKey: OPENAI_API_KEY.value()
      });

      // Get company data for context
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (!companyDoc.exists) {
        throw new Error('Company not found');
      }
      const company = companyDoc.data();

      // Build system prompt based on scope
      const systemPrompts = {
        global: 'You are a helpful business assistant for Biz-CoPilot. Help users understand their business data and provide insights.',
        financial: 'You are a financial assistant. Help users understand their financial data, expenses, income, and invoices.',
        hr: 'You are an HR assistant. Help users manage their team, people, and HR-related tasks.',
        owner: 'You are a strategic business advisor. Provide high-level insights and recommendations for business owners.'
      };

      const systemPrompt = systemPrompts[scope] || systemPrompts.global;

      // Get relevant data based on scope with intelligent querying
      // Also check query content to auto-detect financial queries even if scope is global
      let contextData = '';
      let queryData = null;
      
      // Detect if query is financial even if scope is global
      const lowerQuery = query.toLowerCase();
      const isFinancialQuery = lowerQuery.includes('expense') || lowerQuery.includes('income') || 
                               lowerQuery.includes('invoice') || lowerQuery.includes('revenue') ||
                               lowerQuery.includes('spending') || lowerQuery.includes('cost') ||
                               lowerQuery.includes('financial') || lowerQuery.includes('money');
      
      // Use financial scope if query is financial, even if scope is global
      const effectiveScope = (scope === 'financial' || isFinancialQuery) ? 'financial' : scope;
      
      if (effectiveScope === 'financial') {
        // Detect query intent
        const lowerQuery = query.toLowerCase();
        const isExpenseQuery = lowerQuery.includes('expense') || lowerQuery.includes('spending') || lowerQuery.includes('cost');
        const isIncomeQuery = lowerQuery.includes('income') || lowerQuery.includes('revenue') || lowerQuery.includes('earning');
        const isInvoiceQuery = lowerQuery.includes('invoice') || lowerQuery.includes('receivable');
        
        // Get date range
        let dateFilter = null;
        if (lowerQuery.includes('this month') || lowerQuery.includes('current month')) {
          const now = new Date();
          dateFilter = {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date()
          };
        } else if (lowerQuery.includes('last month')) {
          const now = new Date();
          dateFilter = {
            start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            end: new Date(now.getFullYear(), now.getMonth(), 0)
          };
        } else if (lowerQuery.includes('this year')) {
          const now = new Date();
          dateFilter = {
            start: new Date(now.getFullYear(), 0, 1),
            end: new Date()
          };
        }
        
        // Fetch relevant data
        if (isExpenseQuery || !isIncomeQuery && !isInvoiceQuery) {
          let expensesQuery = db.collection(`companies/${companyId}/expenses`).orderBy('date', 'desc');
          
          if (dateFilter) {
            expensesQuery = expensesQuery.where('date', '>=', dateFilter.start).where('date', '<=', dateFilter.end);
          }
          
          const expensesSnapshot = await expensesQuery.limit(20).get();
          const expenses = expensesSnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              id: doc.id, 
              ...data,
              // Ensure date is properly formatted
              date: data.date?.toDate ? data.date.toDate() : data.date
            };
          });
          
          // Calculate totals
          const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
          const totalVAT = expenses.reduce((sum, exp) => sum + (exp.vatAmount || 0), 0);
          
          if (expenses.length > 0) {
            const dateRangeText = dateFilter 
              ? `from ${dateFilter.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
              : 'across all time';
            
            contextData = `EXPENSES DATA (${expenses.length} items found ${dateRangeText}):
- Total Amount: €${totalExpenses.toFixed(2)}
- Total VAT: €${totalVAT.toFixed(2)}

Expense Details:
${expenses.slice(0, 10).map((e, idx) => {
  const dateStr = e.date ? (e.date instanceof Date ? e.date.toLocaleDateString() : e.date) : 'No date';
  return `${idx + 1}. ${e.description || 'Expense'} - €${(e.amount || 0).toFixed(2)} (Date: ${dateStr})`;
}).join('\n')}`;
          } else {
            const dateRangeText = dateFilter 
              ? `for ${dateFilter.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
              : '';
            contextData = `EXPENSES DATA: No expenses found ${dateRangeText}.`;
          }
          
          queryData = {
            type: 'expenses',
            items: expenses,
            totals: { amount: totalExpenses, vat: totalVAT, count: expenses.length }
          };
        }
        
        if (isIncomeQuery) {
          let incomeQuery = db.collection(`companies/${companyId}/income`).orderBy('date', 'desc');
          
          if (dateFilter) {
            incomeQuery = incomeQuery.where('date', '>=', dateFilter.start).where('date', '<=', dateFilter.end);
          }
          
          const incomeSnapshot = await incomeQuery.limit(20).get();
          const income = incomeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const totalIncome = income.reduce((sum, inc) => sum + (inc.amount || 0), 0);
          
          contextData += `Income data: ${income.length} items found. Total: €${totalIncome.toFixed(2)}. `;
          contextData += `Recent income: ${income.slice(0, 5).map(i => `${i.description || 'Income'}: €${(i.amount || 0).toFixed(2)}`).join(', ')}.`;
          
          if (!queryData) {
            queryData = { type: 'income', items: income, totals: { amount: totalIncome, count: income.length } };
          } else {
            queryData.income = income;
            queryData.incomeTotal = totalIncome;
          }
        }
        
        if (isInvoiceQuery) {
          let invoicesQuery = db.collection(`companies/${companyId}/invoices`).orderBy('invoiceDate', 'desc');
          
          if (dateFilter) {
            invoicesQuery = invoicesQuery.where('invoiceDate', '>=', dateFilter.start).where('invoiceDate', '<=', dateFilter.end);
          }
          
          const invoicesSnapshot = await invoicesQuery.limit(20).get();
          const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
          const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid');
          const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
          
          contextData += `Invoices: ${invoices.length} found. Total: €${totalInvoices.toFixed(2)}. Unpaid: ${unpaidInvoices.length} (€${unpaidTotal.toFixed(2)}).`;
          
          if (!queryData) {
            queryData = { type: 'invoices', items: invoices, totals: { amount: totalInvoices, unpaid: unpaidTotal } };
          } else {
            queryData.invoices = invoices;
            queryData.invoiceTotal = totalInvoices;
            queryData.unpaidTotal = unpaidTotal;
          }
        }
        
        // If no specific query, get summary
        if (!isExpenseQuery && !isIncomeQuery && !isInvoiceQuery) {
          const expensesSnapshot = await db.collection(`companies/${companyId}/expenses`).orderBy('date', 'desc').limit(10).get();
          const incomeSnapshot = await db.collection(`companies/${companyId}/income`).orderBy('date', 'desc').limit(10).get();
          
          contextData = `Financial summary: ${expensesSnapshot.size} recent expenses, ${incomeSnapshot.size} recent income records.`;
        }
      }

      // Build enhanced system prompt with data context
      const dataContextSection = contextData 
        ? `IMPORTANT: The following data has been fetched from the database and is available for you to use:

${contextData}

You MUST use this actual data in your response. Do NOT say you don't have access to the data - it is provided above.`
        : 'Note: No specific data was found for this query. Provide general guidance based on best practices.';

      const enhancedSystemPrompt = `${systemPrompt}

Company: ${company.name || 'Unknown'}
Current Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

${dataContextSection}

Instructions:
- ALWAYS use the actual data provided above if available
- Provide specific numbers, amounts, and details from the data
- Format currency as € (Euro)
- Be direct and factual - use the real data, don't apologize for not having it
- If data shows 0 items or empty results, state that clearly
- For financial queries, include totals, counts, and key items from the data
- Never say "I don't have access" when data is provided above`;

      // Call OpenAI with enhanced context
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: enhancedSystemPrompt
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const responseText = completion.choices[0]?.message?.content || 'I apologize, but I could not process your query.';

      // Extract insights from response
      const insights = extractInsights(responseText, queryData);

      // Log the query for audit
      await db.collection(`companies/${companyId}/aiQueries`).add({
        query: query.slice(0, 200),
        scope,
        userId,
        response: responseText.slice(0, 1000),
        timestamp: new Date(),
        model: 'gpt-3.5-turbo',
        hasData: queryData !== null
      });

      return {
        text: responseText,
        type: queryData ? 'data' : 'text',
        data: queryData,
        insights: insights,
        suggestions: generateSuggestions(scope, queryData)
      };
    } catch (error) {
      console.error('Error processing AI query:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        query: query?.slice(0, 100),
        scope,
        companyId,
        userId
      });
      
      // Return a helpful error message
      const errorMessage = error.message || 'internal';
      return {
        text: `I encountered an error processing your query: ${errorMessage}. Please try rephrasing your question or contact support if the issue persists.`,
        type: 'error',
        data: null,
        insights: [],
        suggestions: []
      };
    }
  }
);

/**
 * Extract insights from AI response and data
 */
function extractInsights(responseText, queryData) {
  const insights = [];
  
  if (!queryData) return insights;
  
  // Add data-driven insights
  if (queryData.type === 'expenses' && queryData.totals) {
    if (queryData.totals.amount > 1000) {
      insights.push({
        type: 'warning',
        message: `Total expenses are €${queryData.totals.amount.toFixed(2)} - consider reviewing for optimization opportunities.`
      });
    }
  }
  
  if (queryData.type === 'income' && queryData.totals) {
    if (queryData.totals.amount < 100) {
      insights.push({
        type: 'info',
        message: `Income is relatively low at €${queryData.totals.amount.toFixed(2)} - consider strategies to increase revenue.`
      });
    }
  }
  
  if (queryData.unpaidTotal && queryData.unpaidTotal > 0) {
    insights.push({
      type: 'warning',
      message: `You have €${queryData.unpaidTotal.toFixed(2)} in unpaid invoices - follow up on these to improve cash flow.`
    });
  }
  
  return insights;
}

/**
 * Generate contextual suggestions based on query and data
 */
function generateSuggestions(scope, queryData) {
  const suggestions = [];
  
  if (scope === 'financial') {
    if (queryData && queryData.type === 'expenses') {
      suggestions.push('Show me income for comparison');
      suggestions.push('Analyze expense trends');
      suggestions.push('Find largest expenses');
    }
    if (queryData && queryData.type === 'income') {
      suggestions.push('Show me expenses');
      suggestions.push('Calculate net profit');
      suggestions.push('Show invoice status');
    }
  }
  
  return suggestions;
}

