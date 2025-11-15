# 🔧 Fix Firebase API Key HTTP Referrer Restrictions

## Problem
When clicking email verification links, you're getting this error:
```
API_KEY_HTTP_REFERRER_BLOCKED
Requests from referer https://expense-tracker-prod-475813.firebaseapp.com/ are blocked.
```

This happens because the Firebase API key has HTTP referrer restrictions that don't include your Firebase hosting domain.

## Solution

### Step 1: Go to Google Cloud Console
1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Make sure you're in the correct project: **expense-tracker-prod-475813**

### Step 2: Find Your Firebase API Key
1. Look for an API key that starts with `AIza...`
2. This is your Firebase Web API key
3. Click on it to edit

### Step 3: Update Application Restrictions
1. Under **"Application restrictions"**, select **"HTTP referrers (web sites)"**
2. Click **"Add an item"** and add these referrers (one per line):

```
https://biz-copilot.nl/*
https://www.biz-copilot.nl/*
https://expense-tracker-prod-475813.firebaseapp.com/*
https://expense-tracker-prod-475813.web.app/*
http://localhost:5173/*
http://localhost:3000/*
```

**Note:** If you haven't set up the custom domain yet, you can add it now and it will work once the domain is configured.

**Important:** Include the `/*` at the end of each URL to allow all paths.

### Step 4: Save Changes
1. Click **"Save"** at the bottom
2. Wait 1-2 minutes for changes to propagate

### Step 5: Test
1. Request a new verification email from the dashboard
2. Click the verification link
3. It should now work correctly!

## Alternative: Remove Restrictions (Less Secure)
If you want to allow all referrers (not recommended for production):
1. Under **"Application restrictions"**, select **"None"**
2. Click **"Save"**

⚠️ **Warning:** This makes your API key accessible from any website. Only do this for development/testing.

## Why This Happens
Firebase API keys can be restricted to only work from specific domains. This is a security feature, but if your Firebase hosting domain isn't included, verification links won't work.

## After Fixing
Once the API key is updated:
- All new verification emails will work correctly
- Existing verification links will still work (if not expired)
- The error page will automatically detect successful verification

## Need Help?
If you're still having issues:
1. Check that you're editing the correct API key (the one used in your Firebase config)
2. Verify the project ID matches: `expense-tracker-prod-475813`
3. Wait a few minutes after saving - changes can take time to propagate
4. Try requesting a fresh verification email after the fix

