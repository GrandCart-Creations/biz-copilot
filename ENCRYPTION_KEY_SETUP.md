# Encryption Key Setup Guide

## 🔐 Overview

Biz-CoPilot uses client-side encryption to protect sensitive financial data:
- Expense amounts
- VAT numbers
- Bank account details
- Invoice numbers
- MFA secrets and backup codes

**Current Status:** ⚠️ Using fallback encryption key (not secure for production)

## ⚠️ Security Note

**Important:** Client-side encryption means the key will be visible in the JavaScript bundle. This provides:
- ✅ Defense in depth (data encrypted at rest in Firestore)
- ✅ Protection against database breaches
- ✅ GDPR compliance for sensitive data
- ⚠️ Not protection against client-side attacks (key is in bundle)

For maximum security, consider moving encryption to server-side (Cloud Functions) in the future.

## 🚀 Quick Setup

### Step 1: Generate a Secure Key

```bash
# Generate a 64-character hex encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output:**
```
09b9a44d862e3ee4472d877dc522a1d4cacef03edfc53789bae5c30d0b489360
```

### Step 2: Add to Environment File

**For Local Development:**
1. Copy `templates/env.template` to `.env.local`
2. Add your generated key:
   ```env
   VITE_ENCRYPTION_KEY=09b9a44d862e3ee4472d877dc522a1d4cacef03edfc53789bae5c30d0b489360
   ```

**For Production (Firebase Hosting):**

Since Firebase Hosting doesn't support runtime environment variables, you have two options:

#### Option A: Build-time Environment Variable (Recommended for now)

1. **Set in your CI/CD or build script:**
   ```bash
   export VITE_ENCRYPTION_KEY=your_generated_key_here
   npm run build
   firebase deploy --only hosting
   ```

2. **Or create `.env.production` file:**
   ```env
   VITE_ENCRYPTION_KEY=your_generated_key_here
   ```
   Then build with:
   ```bash
   npm run build -- --mode production
   ```

#### Option B: Firebase Functions + Secret Manager (More Secure - Future Enhancement)

For true security, move encryption to Cloud Functions:
1. Store key in Firebase Secret Manager
2. Create a Cloud Function endpoint for encryption/decryption
3. Update client to call Cloud Function instead of client-side encryption

**Note:** This requires code changes and is a future enhancement.

### Step 3: Verify Setup

1. **Check console:** The warning "Using fallback encryption key" should disappear
2. **Test encryption:** Create a new expense and verify it's encrypted in Firestore
3. **Verify decryption:** View the expense in the app - it should decrypt correctly

## 🔍 Verification

After setting the key, check the browser console:
- ✅ **Good:** No encryption key warnings
- ❌ **Bad:** Still seeing "⚠️ Using fallback encryption key"

## 📝 Important Notes

1. **Never commit `.env.local` or `.env.production` to git** (already in `.gitignore`)
2. **Use a different key for each environment** (dev, staging, production)
3. **Keep your key secure** - if compromised, you'll need to re-encrypt all data
4. **Backup your key** - losing it means losing access to encrypted data

## 🔄 Key Rotation (If Needed)

If you need to rotate the encryption key:

1. **Decrypt all data** with old key
2. **Encrypt all data** with new key
3. **Update environment variable**
4. **Redeploy**

**Warning:** This is a complex operation. Consider implementing a migration script.

## 🛡️ Current Implementation

- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 with 100,000 iterations
- **Salt:** Random 16 bytes per encryption
- **IV:** Random 12 bytes per encryption

## ✅ Checklist

- [ ] Generated secure 64-character hex key
- [ ] Added `VITE_ENCRYPTION_KEY` to `.env.local` (development)
- [ ] Added `VITE_ENCRYPTION_KEY` to build process (production)
- [ ] Verified no console warnings
- [ ] Tested encryption/decryption works
- [ ] Documented key location for team

---

**Last Updated:** December 2025

