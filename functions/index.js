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

/**
 * Send invoice email
 * Callable function to send invoice via email
 */
exports.sendInvoiceEmail = onCall(
  {
    secrets: [SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, APP_URL],
    region: 'us-central1'
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

      const baseUrl = (APP_URL.value() || 'http://localhost:5173').trim();
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
    region: 'us-central1'
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

      const baseUrl = (APP_URL.value() || 'http://localhost:5173').trim();
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

