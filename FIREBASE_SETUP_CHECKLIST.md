# 🔥 FIREBASE CONFIGURATION CHECKLIST - BIZ-COPILOT

## Current Configuration
- **Project ID**: `expense-tracker-prod-475813`
- **Auth Domain**: `expense-tracker-prod-475813.firebaseapp.com`
- **Status**: Active and configured ✅

---

## ✅ CONFIGURATION STEPS

### STEP 1: Update Project Display Name ⚙️
**Time**: 2 minutes | **Priority**: High

1. Go to: https://console.firebase.google.com/
2. Select project: `expense-tracker-prod-475813`
3. Click gear icon ⚙️ → "Project settings"
4. Under "General" → "Public-facing name"
5. Change to: **Biz-CoPilot**
6. Click "Save"

**Result**: Your project will show as "Biz-CoPilot" in Firebase Console

---

### STEP 2: Configure Authorized Domains 🌐
**Time**: 3 minutes | **Priority**: Critical

1. In Firebase Console → "Authentication" → "Settings" tab
2. Scroll to "Authorized domains"
3. Click "Add domain" and add EACH of these:

**Production Domains** (Add these):
- [ ] `biz-copilot.nl`
- [ ] `www.biz-copilot.nl`
- [ ] `bizcopilot.nl`
- [ ] `www.bizcopilot.nl`

**Keep These** (Already there):
- [ ] `localhost` (for development)
- [ ] `expense-tracker-prod-475813.firebaseapp.com` (Firebase hosting)

**Result**: Users can authenticate from your custom domains

---

### STEP 3: Update Google OAuth Branding 🔐
**Time**: 2 minutes | **Priority**: High

1. Firebase Console → "Authentication" → "Sign-in method" tab
2. Find "Google" provider → Click edit (pencil icon)
3. Update these fields:
   - **Public-facing name**: `Biz-CoPilot`
   - **Support email**: Your email
   - **Project public-facing name**: `Biz-CoPilot`
4. Click "Save"

**Result**: Google sign-in consent screen shows "Biz-CoPilot"

---

### STEP 4: Update Email Templates (Optional) 📧
**Time**: 5 minutes | **Priority**: Medium

1. Firebase Console → "Authentication" → "Templates" tab
2. Click each template and customize:

**Email Verification**:
```
Subject: Verify your email - Biz-CoPilot
Body: Welcome to Biz-CoPilot! Click the link below to verify your email...
```

**Password Reset**:
```
Subject: Reset your Biz-CoPilot password  
Body: We received a request to reset your password for your Biz-CoPilot account...
```

**Email Address Change**:
```
Subject: Email changed - Biz-CoPilot
Body: Your Biz-CoPilot email address was changed to...
```

**Result**: Professional branded emails to your users

---

### STEP 5: Verify Configuration ✅
**Time**: 2 minutes | **Priority**: High

Test your authentication:

1. Run your app: `npm run dev`
2. Try signing in with Google
3. Try signing up with email/password
4. Check email verification works
5. Verify password reset works

**What to check**:
- [ ] Google consent screen shows "Biz-CoPilot"
- [ ] Verification emails mention "Biz-CoPilot"
- [ ] No authentication errors
- [ ] Users can sign in successfully

---

## 🔄 OPTIONAL: Firebase Hosting Setup

If you want to deploy to Firebase Hosting:

### Update firebase.json hosting configuration:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Deploy command:
```bash
npm run build
firebase deploy --only hosting
```

---

## 📋 POST-CONFIGURATION CHECKLIST

After completing all steps:

- [ ] Project renamed to "Biz-CoPilot" in console
- [ ] All custom domains added to authorized domains
- [ ] Google OAuth shows "Biz-CoPilot" branding
- [ ] Email templates updated (optional)
- [ ] Test authentication flow (sign up, sign in, password reset)
- [ ] Verify emails show correct branding
- [ ] Check Google sign-in consent screen
- [ ] Test on localhost first
- [ ] Test on production domains after DNS setup

---

## 🎯 WHAT'S NEXT?

After Firebase configuration:

1. ✅ **GitHub Repository** - Rename to `biz-copilot`
2. 🎨 **Visual Assets** - Finalize logo and branding
3. 🌐 **Domain DNS** - Point domains to Firebase/Vercel
4. 🚀 **Deploy** - Push your app to production
5. 📣 **Launch** - Tell the world about Biz-CoPilot!

---

## 🆘 TROUBLESHOOTING

### "Unauthorized domain" error
- Double-check domain is added to "Authorized domains" list
- Make sure you added both `www` and non-`www` versions
- Wait 5 minutes after adding domain

### Google sign-in shows wrong app name
- Update "Public-facing name" in Google provider settings
- Clear browser cache and try again

### Verification emails not sending
- Check Firebase Console → Authentication → Templates
- Verify SMTP settings if using custom email
- Check spam folder

---

## 📞 NEED HELP?

- Firebase Documentation: https://firebase.google.com/docs
- Firebase Support: https://firebase.google.com/support
- Your Firebase Project: https://console.firebase.google.com/project/expense-tracker-prod-475813

---

**Last Updated**: October 28, 2025
**Project**: Biz-CoPilot
**Firebase Project ID**: expense-tracker-prod-475813
