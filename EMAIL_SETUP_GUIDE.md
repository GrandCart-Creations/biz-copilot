# 📧 Email Integration Setup Guide

## Overview

This guide explains how to set up email sending for team invitations in Biz-CoPilot using Firebase Cloud Functions and SendGrid.

---

## ✅ What's Been Implemented

1. **Cloud Function** (`functions/index.js`):
   - Automatically triggers when a new invitation is created
   - Sends professional invitation emails via SendGrid
   - Includes company name, inviter name, and role
   - Creates acceptance links

2. **Email Template**:
   - Professional HTML email design
   - Mobile-responsive
   - Branded with Biz-CoPilot colors
   - Includes clear call-to-action button

---

## 🚀 Setup Instructions

### Step 1: Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### Step 2: Install Function Dependencies

```bash
cd functions
npm install
```

### Step 3: Get SendGrid API Key

1. **Create SendGrid Account** (free tier available):
   - Go to: https://signup.sendgrid.com/
   - Sign up for a free account (100 emails/day free)

2. **Create API Key**:
   - Go to SendGrid Dashboard → Settings → API Keys
   - Click "Create API Key"
   - Name: `Biz-CoPilot Functions`
   - Permissions: "Full Access" (or "Mail Send" only)
   - Copy the API key (you'll only see it once!)

3. **Verify Sender Email**:
   - Go to Settings → Sender Authentication
   - Add and verify your domain OR single sender email
   - Example: `noreply@biz-copilot.nl`

### Step 4: Configure Environment Variables

Set the SendGrid API key and other config in Firebase:

```bash
firebase functions:config:set \
  sendgrid.api_key="YOUR_SENDGRID_API_KEY_HERE" \
  sendgrid.from_email="noreply@biz-copilot.nl" \
  app.url="https://biz-copilot.nl"
```

**Or for newer Firebase (Functions v2):**

Create a `.env` file in the `functions` directory (for local development):

```bash
cd functions
echo "SENDGRID_API_KEY=your_api_key_here" > .env
echo "SENDGRID_FROM_EMAIL=noreply@biz-copilot.nl" >> .env
echo "APP_URL=https://biz-copilot.nl" >> .env
```

For production, set secrets in Firebase:

```bash
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set SENDGRID_FROM_EMAIL
firebase functions:secrets:set APP_URL
```

### Step 5: Update Function Code to Use Secrets

If using Firebase Functions v2 secrets, update `functions/index.js`:

```javascript
// At the top, add:
const { defineSecret } = require('firebase-functions/params');

// Then update the function:
exports.sendInvitationEmail = onDocumentCreated(
  {
    document: 'companies/{companyId}/invitations/{invitationId}',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'APP_URL']
  },
  async (event) => {
    const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
    const sendgridFromEmail = defineSecret('SENDGRID_FROM_EMAIL');
    const appUrl = defineSecret('APP_URL');
    
    sgMail.setApiKey(sendgridApiKey.value());
    // ... rest of function
  }
);
```

### Step 6: Deploy Functions

```bash
firebase deploy --only functions
```

---

## 🧪 Testing

### Test Locally (Emulator):

```bash
# Install emulator suite
firebase init emulators

# Start emulators
firebase emulators:start

# In another terminal, trigger the function
# (Create an invitation document in Firestore)
```

### Test in Production:

1. Create a test invitation via the app
2. Check SendGrid Dashboard → Activity
3. Verify email was sent
4. Check recipient's inbox

---

## 📝 Email Template Customization

To customize the email template, edit `functions/index.js`:

- **Subject line**: Change `emailSubject`
- **Content**: Modify `emailHtml` and `emailText`
- **Styling**: Update inline CSS styles
- **Brand colors**: Update gradient colors (currently purple/blue)

---

## 🔒 Security Notes

1. **API Key**: Never commit API keys to Git
2. **Email Validation**: SendGrid automatically validates email addresses
3. **Rate Limits**: Free tier = 100 emails/day
4. **Domain Verification**: Required for production (prevents spam)

---

## 🐛 Troubleshooting

### Emails Not Sending?

1. **Check Function Logs**:
   ```bash
   firebase functions:log --only sendInvitationEmail
   ```

2. **Verify API Key**:
   - Check it's set correctly: `firebase functions:config:get`
   - Test API key in SendGrid Dashboard

3. **Check SendGrid Activity**:
   - Go to SendGrid Dashboard → Activity
   - See if emails are being blocked/bounced

4. **Verify Sender Email**:
   - Must be verified in SendGrid
   - Check domain authentication status

### Function Not Triggering?

1. **Check Firestore Rules**:
   - Ensure invitations can be created
   - Check function has proper permissions

2. **Check Function Deployment**:
   ```bash
   firebase functions:list
   ```

---

## 🎯 Next Steps

1. **Set up domain authentication** in SendGrid (required for production)
2. **Customize email branding** to match your brand
3. **Add email templates** for other notifications (password reset, welcome, etc.)
4. **Monitor email metrics** in SendGrid dashboard

---

## 📚 Alternative Email Services

If you prefer not to use SendGrid:

1. **AWS SES** (cheaper, more setup)
2. **Mailgun** (similar to SendGrid)
3. **Firebase Extensions** (easier, less control)
4. **Gmail SMTP** (free but limited)

For any of these, you'll need to modify the function code accordingly.

