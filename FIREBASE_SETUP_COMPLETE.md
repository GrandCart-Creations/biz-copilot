# ✅ FIREBASE CONFIGURATION CHECKLIST

## 🔥 Firebase Console Updates for Biz-CoPilot

Follow these steps in the Firebase Console to complete your rebranding:

---

### 📋 CONFIGURATION STEPS

#### ✅ Step 1: Update Project Display Name
**Location**: Firebase Console → ⚙️ Settings → General → Public-facing name

**Action**: Change to **"Biz-CoPilot"**

**Impact**: Updates the project name shown throughout Firebase Console and in authentication flows.

---

#### ✅ Step 2: Update Google Auth Provider Name
**Location**: Firebase Console → Authentication → Settings → Project public-facing name

**Action**: Change to **"Biz-CoPilot"**

**Impact**: This is what users see when signing in with Google (e.g., "Sign in to Biz-CoPilot with Google")

---

#### ✅ Step 3: Add Authorized Domains
**Location**: Firebase Console → Authentication → Settings → Authorized domains

**Current Domains**:
- `localhost` ✅ (for development)
- `expense-tracker-prod-475813.firebaseapp.com` ✅ (Firebase default)

**Add These Domains** (when ready to deploy):
- `biz-copilot.nl`
- `bizcopilot.nl`
- `www.biz-copilot.nl` (optional)
- `www.bizcopilot.nl` (optional)

**Impact**: Allows users to authenticate from your custom domains.

---

#### ✅ Step 4: Customize Email Templates (Optional but Recommended)
**Location**: Firebase Console → Authentication → Templates

**Templates to Update**:
1. **Email verification**
   - Change "From name" to: **Biz-CoPilot**
   - Customize message (optional)

2. **Password reset**
   - Change "From name" to: **Biz-CoPilot**
   - Customize message (optional)

3. **Email address change**
   - Change "From name" to: **Biz-CoPilot**
   - Customize message (optional)

**Impact**: Professional branded emails sent to your users.

---

## 🧪 TESTING YOUR CONFIGURATION

### Test Authentication:
1. Start your dev server:
   ```bash
   cd /Users/gc-mac2018/Desktop/expense-tracker-app
   npm run dev
   ```

2. Visit: http://localhost:5173/signup

3. **Test Sign Up**:
   - Try creating a new account with email
   - Check your inbox for verification email
   - Verify the email shows "Biz-CoPilot" as sender

4. **Test Google Sign-In**:
   - Click "Sign in with Google"
   - The popup should show "Sign in to **Biz-CoPilot**"
   - Complete the sign-in process

---

## 📊 CURRENT PROJECT INFO

**Firebase Project**: `expense-tracker-prod-475813`

**Configuration** (in `src/firebase.js`):
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDvSZZ1rWL8eAaTrRtMAsBj1D1rxp34zVo",
  authDomain: "expense-tracker-prod-475813.firebaseapp.com",
  projectId: "expense-tracker-prod-475813",
  storageBucket: "expense-tracker-prod-475813.firebasestorage.app",
  messagingSenderId: "366675970251",
  appId: "1:366675970251:web:b31fe0f2ea3930d388734e",
  measurementId: "G-CVCYBMQ2SY"
};
```

⚠️ **Note**: You do NOT need to change these configuration values. The API keys and project IDs stay the same. Only update display names in Firebase Console.

---

## 🎯 VERIFICATION CHECKLIST

After completing Firebase Console updates, verify:

- [ ] Project name shows "Biz-CoPilot" in Firebase Console
- [ ] Google Sign-In popup shows "Sign in to Biz-CoPilot"
- [ ] Email verification emails come from "Biz-CoPilot"
- [ ] Password reset emails come from "Biz-CoPilot"
- [ ] Authorized domains include your custom domains (when ready)
- [ ] All authentication flows work correctly

---

## 🚀 NEXT: DEPLOY TO FIREBASE HOSTING

Once Firebase configuration is complete, you can deploy:

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy
```

Your app will be live at:
- `https://expense-tracker-prod-475813.web.app`
- `https://expense-tracker-prod-475813.firebaseapp.com`

Then add custom domains:
- `https://biz-copilot.nl`
- `https://bizcopilot.nl`

---

## 📚 RESOURCES

- **Firebase Console**: https://console.firebase.google.com/
- **Firebase Docs**: https://firebase.google.com/docs
- **Custom Domain Setup**: https://firebase.google.com/docs/hosting/custom-domain

---

**Status**: Firebase configuration ready for Biz-CoPilot rebranding! 🎉
**Next**: Update GitHub repository name from `expense-tracker-app` to `biz-copilot`
