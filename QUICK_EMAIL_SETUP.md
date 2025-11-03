# 🚀 Quick Email Setup (5 Minutes)

## Why Emails Aren't Sending Yet

The invitation system is fully implemented, but **email sending requires a third-party service** (SendGrid, AWS SES, etc.). The Cloud Function is ready - you just need to configure it.

---

## Option A: Quick Test with SendGrid (Recommended)

### Step 1: Sign Up for SendGrid (Free)
1. Go to: https://signup.sendgrid.com/
2. Create free account (100 emails/day free)

### Step 2: Get API Key
1. SendGrid Dashboard → Settings → API Keys
2. Create API Key → Name it "Biz-CoPilot"
3. Copy the key (shown only once!)

### Step 3: Install Function Dependencies
```bash
cd functions
npm install
```

### Step 4: Set API Key in Firebase
```bash
# Using Firebase Functions Secrets (recommended for production)
firebase functions:secrets:set SENDGRID_API_KEY
# Paste your API key when prompted

firebase functions:secrets:set SENDGRID_FROM_EMAIL
# Enter: noreply@biz-copilot.nl (or your verified email)

firebase functions:secrets:set APP_URL
# Enter: http://localhost:5173 (for dev) or https://biz-copilot.nl (for production)
```

### Step 5: Deploy Functions
```bash
firebase deploy --only functions
```

### Step 6: Verify Sender Email in SendGrid
- SendGrid Dashboard → Settings → Sender Authentication
- Verify your email address or domain
- This is required to send emails

### Step 7: Test!
1. Create an invitation in the app
2. Check SendGrid Dashboard → Activity
3. Verify email was sent

---

## Option B: Use Firebase Extensions (Easiest)

Firebase has a pre-built extension that handles emails:

1. **Install Email Extension:**
   ```bash
   firebase ext:install firebase/firestore-send-email
   ```

2. **Configure:**
   - Collection: `companies/{companyId}/invitations`
   - SMTP settings (use SendGrid SMTP or other service)

This is easier but less customizable than custom functions.

---

## Option C: Development Workaround (No Email Service)

For testing without setting up email:

1. **Manual Invitations:**
   - Use "Add Existing User" feature instead
   - User must already have a Firebase account

2. **Or:**
   - Check invitation in Firestore Console
   - Share invitation ID with user
   - User can accept via direct link: `/accept-invitation?company=XXX&invitation=YYY`

---

## What Happens When Email is Configured?

Once SendGrid (or another service) is set up:

1. ✅ User creates invitation in app
2. ✅ Invitation document created in Firestore
3. ✅ Cloud Function automatically triggers
4. ✅ Email sent via SendGrid
5. ✅ Recipient clicks "Accept Invitation" link
6. ✅ User is added to company

---

## Troubleshooting

**"Function not triggering":**
- Check Firebase Console → Functions → Logs
- Verify function is deployed: `firebase functions:list`

**"Emails not sending":**
- Check SendGrid Activity Dashboard
- Verify API key is correct
- Verify sender email is authenticated in SendGrid
- Check function logs for errors

**"Can't access invitation link":**
- Verify APP_URL is set correctly
- Check that `/accept-invitation` route exists in your app

---

## Next Steps After Setup

1. Customize email template in `functions/index.js`
2. Add more email types (welcome, password reset, etc.)
3. Set up domain authentication in SendGrid (required for production)
4. Monitor email delivery rates in SendGrid Dashboard

---

## Need Help?

See `EMAIL_SETUP_GUIDE.md` for detailed instructions and troubleshooting.

