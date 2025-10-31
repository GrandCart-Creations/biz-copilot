# 🔧 CORS Configuration Fix for Firebase Storage

This guide will help you fix the CORS (Cross-Origin Resource Sharing) errors preventing file uploads to Firebase Storage.

## 📋 Problem Summary

When uploading expense files (invoices/receipts), you're getting CORS errors in the browser console:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

## ✅ What Was Fixed

1. **Updated `cors.json`**:
   - Added `OPTIONS` method (required for preflight requests)
   - Added Firebase Storage-specific response headers (`x-goog-resumable`, etc.)

2. **Created `storage.rules`**:
   - Firebase Storage security rules to allow authenticated uploads

3. **Created `apply-cors.sh`**:
   - Script to automatically apply CORS configuration to your storage bucket

## 🚀 Solution Steps

### Step 1: Apply CORS Configuration

Run the provided script to apply CORS to your Firebase Storage bucket:

```bash
cd /Users/gc-mac2018/Desktop/biz-copilot
./apply-cors.sh
```

**If the script fails**, you can apply CORS manually:

```bash
# Make sure you have Google Cloud SDK installed
# Install from: https://cloud.google.com/sdk/docs/install

# Authenticate with Google Cloud
gcloud auth login

# Apply CORS configuration
gsutil cors set cors.json gs://expense-tracker-prod-475813.appspot.com

# Verify it was applied
gsutil cors get gs://expense-tracker-prod-475813.appspot.com
```

### Step 2: Deploy Storage Security Rules

Deploy the storage rules to allow authenticated uploads:

```bash
# Make sure you're logged into Firebase CLI
firebase login

# Deploy storage rules
firebase deploy --only storage
```

**Alternative**: Deploy via Firebase Console:
1. Go to: https://console.firebase.google.com/project/expense-tracker-prod-475813/storage/rules
2. Copy the contents of `storage.rules`
3. Paste into the Rules Editor
4. Click "Publish"

### Step 3: Wait for Propagation

CORS changes can take **1-5 minutes** to propagate. After applying:

1. Wait 2-3 minutes
2. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
3. Try uploading a file again

## 🔍 Verification

After applying the fixes, verify:

1. **Check CORS is Applied**:
   ```bash
   gsutil cors get gs://expense-tracker-prod-475813.appspot.com
   ```
   Should show your CORS configuration with `OPTIONS` method.

2. **Check Storage Rules**:
   ```bash
   firebase deploy --only storage --dry-run
   ```
   Or check in Firebase Console → Storage → Rules tab

3. **Test File Upload**:
   - Open your app: `http://localhost:5173`
   - Go to Expenses
   - Try uploading a PDF or image file
   - Check browser console for errors (should be none)

## 📝 Files Modified/Created

- ✅ `cors.json` - Updated with OPTIONS method and Firebase headers
- ✅ `storage.rules` - Created storage security rules
- ✅ `apply-cors.sh` - Script to apply CORS configuration
- ✅ `CORS_FIX_GUIDE.md` - This guide

## 🐛 Troubleshooting

### Still Getting CORS Errors?

1. **Check bucket name**:
   ```bash
   # Your bucket name from firebase.js
   # Should be: expense-tracker-prod-475813.appspot.com
   # Verify in Firebase Console → Storage
   ```

2. **Check authentication**:
   - Make sure you're logged in as a user in the app
   - Check browser console for auth errors

3. **Check storage rules**:
   - Make sure `storage.rules` is deployed
   - Rules should allow authenticated users to write to `/users/{userId}/expenses/{expenseId}/{fileName}`

4. **Wait longer**:
   - CORS can take up to 24 hours to fully propagate (usually 1-5 minutes)
   - Try clearing browser cache

5. **Manual CORS check**:
   ```bash
   # List all buckets
   gsutil ls
   
   # Check CORS on your bucket
   gsutil cors get gs://expense-tracker-prod-475813.appspot.com
   ```

### Google Cloud SDK Not Installed?

Install from: https://cloud.google.com/sdk/docs/install

For macOS:
```bash
# Using Homebrew
brew install --cask google-cloud-sdk

# Or download from website
# Then authenticate:
gcloud auth login
```

## 📚 Additional Resources

- [Firebase Storage CORS Documentation](https://firebase.google.com/docs/storage/web/upload-files#cors_configuration)
- [Google Cloud Storage CORS Guide](https://cloud.google.com/storage/docs/configuring-cors)
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security)

## ✅ Success Criteria

After completing these steps, you should be able to:
- ✅ Upload PDF files from localhost
- ✅ Upload image files from localhost
- ✅ See upload progress bar working
- ✅ No CORS errors in browser console
- ✅ Files appear in Firebase Storage console

---

**Need Help?** If issues persist after following this guide:
1. Check the browser console for specific error messages
2. Verify CORS is applied: `gsutil cors get gs://expense-tracker-prod-475813.appspot.com`
3. Verify storage rules are deployed in Firebase Console
4. Make sure you're authenticated in the app

