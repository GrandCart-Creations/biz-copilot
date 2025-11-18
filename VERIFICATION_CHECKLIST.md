# ✅ Biz-CoPilot Infrastructure Verification Checklist

**Date:** November 18, 2025  
**Purpose:** Verify all configurations are correct before deployment

---

## 🔍 Quick Verification Commands

### 1. Run Automated Verification Script
```bash
./scripts/verify-deployment.sh
```

This will check:
- ✅ Environment variables
- ✅ Build output
- ✅ Firebase configuration
- ✅ Firebase CLI authentication
- ✅ Node.js version

---

## 📋 Manual Verification Steps

### Domain & DNS (GoDaddy)

#### Step 1: Verify A Records
1. Log in to GoDaddy: https://www.godaddy.com/
2. Go to: My Products → Domains → `biz-copilot.nl` → DNS
3. **Check A Records:**
   - Should point to Firebase IP addresses (provided by Firebase)
   - Current IP: `199.36.158.100` (verify this matches Firebase Console)

**Command to verify:**
```bash
nslookup biz-copilot.nl
# Should return Firebase IP addresses
```

#### Step 2: Verify www Subdomain (Optional)
- [ ] Check if `www.biz-copilot.nl` CNAME exists pointing to `biz-copilot.nl`
- [ ] OR verify `www.biz-copilot.nl` is added as separate Firebase custom domain

#### Step 3: Verify SendGrid DNS Records (If Domain Auth is Set Up)
Check these CNAME records exist:
- [ ] `s1._domainkey` → `s1.domainkey.u57083719.wl220.sendgrid.net`
- [ ] `s2._domainkey` → `s2.domainkey.u57083719.wl220.sendgrid.net`
- [ ] `em9586` → `u57083719.wl220.sendgrid.net`
- [ ] `_dmarc` (TXT) → `v=DMARC1; p=quarantine; ...`

---

### Firebase Hosting Configuration

#### Step 1: Verify Custom Domain
1. Go to: https://console.firebase.google.com/project/expense-tracker-prod-475813/hosting
2. **Check:**
   - [ ] `biz-copilot.nl` is listed under "Custom domains"
   - [ ] Status shows "Connected" or "Active"
   - [ ] SSL certificate is "Active"

#### Step 2: Verify Site Configuration
- [ ] Site ID: `expense-tracker-prod-475813`
- [ ] Default URL: `https://expense-tracker-prod-475813.web.app`
- [ ] Custom domain: `biz-copilot.nl`

---

### Firebase Authentication

#### Step 1: Verify Authorized Domains
1. Go to: https://console.firebase.google.com/project/expense-tracker-prod-475813/authentication/settings
2. Scroll to "Authorized domains"
3. **Verify these are present:**
   - [ ] `localhost`
   - [ ] `biz-copilot.nl` ⚠️ **CRITICAL**
   - [ ] `www.biz-copilot.nl` (if configured)
   - [ ] `expense-tracker-prod-475813.firebaseapp.com`
   - [ ] `expense-tracker-prod-475813.web.app`

**If `biz-copilot.nl` is missing:**
1. Click "Add domain"
2. Enter: `biz-copilot.nl`
3. Click "Add"

---

### Google Cloud API Key Restrictions

#### Step 1: Verify HTTP Referrer Restrictions
1. Go to: https://console.cloud.google.com/apis/credentials?project=expense-tracker-prod-475813
2. Find API key starting with `AIza...`
3. Click to edit
4. Under "Application restrictions" → "HTTP referrers (web sites)"
5. **Verify these are present:**
   - [ ] `https://biz-copilot.nl/*` ⚠️ **CRITICAL**
   - [ ] `https://www.biz-copilot.nl/*` (if configured)
   - [ ] `https://expense-tracker-prod-475813.firebaseapp.com/*`
   - [ ] `https://expense-tracker-prod-475813.web.app/*`
   - [ ] `http://localhost:5173/*`
   - [ ] `http://localhost:3000/*`

**If missing, add them:**
1. Click "Add an item" for each missing referrer
2. Enter the URL with `/*` at the end
3. Click "Save"
4. Wait 1-2 minutes for changes to propagate

---

### Cloud Functions Secrets

#### Step 1: Verify APP_URL Secret
```bash
# Check current value
firebase functions:secrets:access APP_URL

# Should return: https://biz-copilot.nl
```

**If incorrect, update it:**
```bash
echo "https://biz-copilot.nl" | firebase functions:secrets:set APP_URL
```

#### Step 2: Verify SendGrid Secrets
```bash
# Check SendGrid API key is set
firebase functions:secrets:access SENDGRID_API_KEY

# Check SendGrid from email is set
firebase functions:secrets:access SENDGRID_FROM_EMAIL
```

---

### Application Testing

#### Step 1: Test Domain Access
- [ ] Visit: `https://biz-copilot.nl`
- [ ] App loads correctly
- [ ] No console errors (F12 → Console)

#### Step 2: Test Authentication
- [ ] Sign up with email works
- [ ] Sign in with email works
- [ ] Google OAuth works
- [ ] Email verification links work

#### Step 3: Test Routing
- [ ] All routes work (dashboard, modules, etc.)
- [ ] Direct URL access works (e.g., `/dashboard`)
- [ ] Browser back/forward buttons work

#### Step 4: Test Email Delivery
- [ ] Send test invitation email
- [ ] Check SendGrid Activity: https://app.sendgrid.com/activity
- [ ] Verify email status is "Delivered" (not "Deferred")
- [ ] Email arrives in recipient inbox

---

## 🚨 Critical Issues to Fix Immediately

If any of these are missing, fix them **before** deploying:

1. ⚠️ **`biz-copilot.nl` in Firebase Authorized Domains**
   - **Impact:** Users cannot authenticate from custom domain
   - **Fix:** Add domain in Firebase Console → Authentication → Settings

2. ⚠️ **`https://biz-copilot.nl/*` in API Key HTTP Referrers**
   - **Impact:** API key errors, email verification won't work
   - **Fix:** Add referrer in Google Cloud Console → APIs & Services → Credentials

3. ⚠️ **`APP_URL` secret set to `https://biz-copilot.nl`**
   - **Impact:** Email links point to wrong URL
   - **Fix:** Update secret: `echo "https://biz-copilot.nl" | firebase functions:secrets:set APP_URL`

4. ⚠️ **Custom domain connected in Firebase Hosting**
   - **Impact:** Domain won't work
   - **Fix:** Add custom domain in Firebase Console → Hosting

---

## ✅ Verification Status

After completing all checks, mark your status:

- [ ] Domain DNS verified
- [ ] Firebase Hosting custom domain connected
- [ ] Firebase Auth authorized domains configured
- [ ] API key HTTP referrers configured
- [ ] Cloud Functions secrets verified
- [ ] Application tested and working
- [ ] Email delivery tested and working

---

## 📝 Notes

- DNS changes can take 5 minutes to 48 hours to propagate
- Firebase SSL certificates take 5-30 minutes to provision
- API key changes take 1-2 minutes to propagate
- Always test after making changes

---

**Last Verified:** _______________  
**Verified By:** _______________  
**Status:** ⬜ Pass  ⬜ Fail  ⬜ Needs Attention

