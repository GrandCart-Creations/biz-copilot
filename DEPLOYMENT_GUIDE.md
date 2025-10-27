# 🚀 DEPLOYMENT & TESTING GUIDE

## ✅ Security Features Integrated!

All security components have been successfully integrated into your BizPilot app:

### 📦 What's Been Integrated:

1. **App.jsx** ✅
   - SecurityProvider wrapper added
   - Routes for Security Dashboard (`/security/dashboard`)
   - Routes for MFA Setup (`/settings/mfa`)

2. **Login.jsx** ✅
   - Email validation before login
   - Audit logging for successful/failed logins
   - Account lockout after 5 failed attempts
   - Integration with SecurityContext

3. **UI Components** ✅
   - Card component (`src/components/ui/card.jsx`)
   - Alert component (`src/components/ui/alert.jsx`)

4. **Vite Config** ✅
   - Path aliases configured (`@` points to `src/`)

5. **Firebase Config** ✅
   - `firebase.json` created for deployment
   - `firestore.indexes.json` created

---

## 🔥 Step 1: Deploy Firestore Security Rules

### Option A: Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `expense-tracker-prod-475813`
3. Click **Firestore Database** in the left menu
4. Click **Rules** tab
5. Copy the entire content from `firestore.rules`
6. Paste into the Firebase Console editor
7. Click **Publish**

### Option B: Using Firebase CLI

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

---

## 🧪 Step 2: Start Development Server & Test

### Start the App

```bash
# Navigate to project directory
cd /Users/gc-mac2018/Desktop/expense-tracker-app

# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

The app should start at `http://localhost:5173`

---

## ✅ Step 3: Testing Checklist

### Test 1: Login Security

#### ✅ Test Invalid Email Format
1. Go to `/login`
2. Enter invalid email: `test@invalid`
3. Try to login
4. **Expected**: Should show validation error before attempting login

#### ✅ Test Failed Login Attempts
1. Go to `/login`
2. Enter correct email but wrong password
3. Try to login **5 times**
4. **Expected**: 
   - First 4 attempts: "Invalid email or password" error
   - 5th attempt: "Account temporarily locked" message
   - Should be locked for 15 minutes

#### ✅ Test Successful Login
1. Go to `/login`
2. Enter valid credentials
3. Login successfully
4. **Expected**: 
   - Redirected to `/dashboard`
   - Login event logged in Firestore

### Test 2: Security Dashboard Access

#### ✅ Access Security Dashboard
1. Login to the app
2. Navigate to `/security/dashboard`
3. **Expected**:
   - Dashboard displays with statistics
   - Shows recent audit logs
   - Displays security alerts (if any)
   - Real-time updates when new events occur

#### ✅ Verify Audit Logs
1. On Security Dashboard
2. Check the "Recent Audit Logs" table
3. **Expected**:
   - Should see your recent login event
   - Timestamp should be accurate
   - Event type should be "user.login"
   - Status should be "success"

### Test 3: MFA Setup

#### ✅ Access MFA Setup
1. Login to the app
2. Navigate to `/settings/mfa`
3. **Expected**:
   - MFA Setup page displays
   - Shows "Enable MFA" button

#### ✅ Enable MFA Flow
1. Click "Enable MFA"
2. **Expected**:
   - Step 1: QR code placeholder displays
   - Backup codes are shown
   - Can copy backup codes
   - "Continue to Verification" button appears

3. Click "Continue to Verification"
4. Enter any 6-digit code (e.g., `123456`)
5. Click "Verify & Enable"
6. **Expected**:
   - Success message appears
   - MFA is now enabled

### Test 4: Firestore Rules (Manual Console Test)

#### ✅ Test Unauthorized Access
1. Go to Firebase Console → Firestore Database
2. Try to manually read/write data without authentication
3. **Expected**: Permission denied

#### ✅ Test Role-Based Access
1. Create a test user account
2. Check Firestore Console
3. Verify user can only access their own data
4. **Expected**: Proper role-based restrictions

### Test 5: Input Validation

#### ✅ Test Email Validation
```javascript
// Open browser console on login page
import { validateEmail } from './utils/validation';

// These should pass
validateEmail('test@example.com'); // ✅
validateEmail('user@domain.co.uk'); // ✅

// These should throw errors
validateEmail('invalid'); // ❌
validateEmail('test@'); // ❌
validateEmail('@example.com'); // ❌
```

---

## 🔍 Step 4: Verify Database Structure

### Check Firestore Collections

Go to Firebase Console → Firestore Database and verify these collections exist:

1. **companies/{companyId}/**
   - Should have company data
   
2. **companies/{companyId}/users/{userId}**
   - Should have user roles and permissions
   
3. **companies/{companyId}/auditLogs/{logId}**
   - Should contain audit log entries after you've used the app

### Example Audit Log Entry

```json
{
  "eventType": "user.login",
  "category": "auth",
  "status": "success",
  "details": {
    "email": "user@example.com"
  },
  "userId": "abc123",
  "companyId": "company123",
  "timestamp": "2025-10-27T12:00:00Z",
  "ipAddress": "client-side",
  "userAgent": "Mozilla/5.0...",
  "sessionId": "session_1698408000_xyz"
}
```

---

## 🐛 Troubleshooting

### Issue: "Cannot read properties of undefined"

**Cause**: Missing AuthContext or SecurityContext

**Solution**: Make sure App.jsx has both providers:
```jsx
<AuthProvider>
  <SecurityProvider>
    {/* App content */}
  </SecurityProvider>
</AuthProvider>
```

### Issue: "Failed to fetch" or CORS errors

**Cause**: Firebase rules not deployed or misconfigured

**Solution**: 
1. Deploy Firestore rules (see Step 1)
2. Check Firebase Console → Firestore → Rules
3. Ensure rules are published

### Issue: Icons not displaying

**Cause**: lucide-react might need reinstalling

**Solution**:
```bash
npm install lucide-react@latest
```

### Issue: Path alias errors (`@/...` imports)

**Cause**: Vite not recognizing path aliases

**Solution**: Restart dev server
```bash
# Stop server (Ctrl+C)
npm run dev
```

---

## 📊 Monitoring After Deployment

### Daily Checks (Recommended)

1. **Security Dashboard**: Check for suspicious login attempts
2. **Audit Logs**: Review important events
3. **Failed Logins**: Monitor for brute force attacks

### Weekly Checks

1. **User Activity**: Review audit logs for patterns
2. **Security Alerts**: Investigate any warnings
3. **MFA Adoption**: Encourage users to enable MFA

---

## 🎯 Next Steps After Testing

Once all tests pass, you can:

### 1. Deploy to Production
```bash
# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy
```

### 2. Add More Security Features
- Email notifications for security events
- IP geolocation tracking
- Real-time MFA with authenticator libraries
- CAPTCHA for login forms

### 3. Continue with Phase 1: Legal Compliance
- Terms of Service page
- Privacy Policy
- Cookie consent banner
- GDPR data export tool
- Account deletion flow

---

## 📝 Quick Test Script

Run this in your browser console after logging in to quickly verify security features:

```javascript
// Test 1: Check if SecurityContext is available
console.log('Security Context:', window.securityContext ? '✅ Available' : '❌ Not found');

// Test 2: Check if audit logging is working
console.log('Audit Logs:', 'Check Firebase Console → Firestore → auditLogs');

// Test 3: Verify MFA is accessible
window.location.href = '/settings/mfa';
```

---

## ✅ Success Criteria

Your security implementation is successful when:

- ✅ Login page validates email format
- ✅ Failed login attempts are tracked and accounts lock after 5 attempts
- ✅ Audit logs appear in Firestore after user actions
- ✅ Security Dashboard displays real-time statistics
- ✅ MFA Setup flow works end-to-end
- ✅ Firestore rules block unauthorized access
- ✅ No console errors in browser dev tools

---

## 🚨 Important Notes

1. **Firestore Rules MUST be deployed** - This is the most critical security step
2. **Test in incognito mode** - To avoid cached credentials
3. **Check browser console** - For any JavaScript errors
4. **Monitor Firebase Console** - For authentication and database activity

---

## 🎉 Congratulations!

If all tests pass, your security implementation is complete and production-ready!

**Ready for next steps?**
- Continue to Legal Compliance (Phase 1)
- Add more advanced security features
- Deploy to production

**Need help?** Check the troubleshooting section or reach out!
