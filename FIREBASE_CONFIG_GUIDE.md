# 🔥 FIREBASE CONFIGURATION GUIDE

## ✅ Tasks to Complete in Firebase Console

### Step 1: Update Firebase Project Display Name (2 minutes)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `expense-tracker-prod-475813`

2. **Navigate to Project Settings**
   - Click the ⚙️ gear icon (top left, next to "Project Overview")
   - Click "Project settings"

3. **Update Project Display Name**
   - Under the "General" tab
   - Find "Public-facing name" field
   - Change from current name to: **Biz-CoPilot**
   - Click "Save"

---

### Step 2: Update Google Auth Provider Display Name (2 minutes)

1. **Navigate to Authentication**
   - In the left sidebar, click "Authentication"
   - Click on the "Settings" tab at the top
   - Scroll down to find "Project public-facing name"

2. **Update Display Name**
   - Change to: **Biz-CoPilot**
   - This is what users see when signing in with Google
   - Click "Save"

---

### Step 3: Update Email Sender Name (Optional - 3 minutes)

1. **Still in Authentication → Settings**
   - Find "Authorized domains" section
   - Make sure `biz-copilot.nl` is added when you deploy
   - Add `bizcopilot.nl` as well

2. **Email Templates** (if you want custom emails)
   - Go to Authentication → Templates
   - You can customize:
     - Email verification template
     - Password reset template
     - Email address change template
   
   Update sender name from **Firebase** to **Biz-CoPilot**

---

### Step 4: Verify Firebase Hosting Configuration (1 minute)

1. **Check Hosting Settings**
   - Go to "Hosting" in left sidebar
   - Your site should be listed
   - Click on the site

2. **Add Custom Domain (when ready)**
   - Click "Add custom domain"
   - Enter: `biz-copilot.nl`
   - Follow verification steps (DNS records)
   - Also add: `bizcopilot.nl`
   - Set one as primary

---

## 🎯 Quick Checklist

- [ ] Updated project display name to "Biz-CoPilot"
- [ ] Updated Google Auth provider name to "Biz-CoPilot"
- [ ] Added authorized domains (biz-copilot.nl, bizcopilot.nl)
- [ ] Customized email templates (optional)
- [ ] Prepared for custom domain setup

---

## 📝 Important Notes

### Email Verification Setup
If you want users to verify their email before accessing the app:

1. Go to **Authentication → Settings**
2. Find "User account management" section
3. Enable "Email enumeration protection" (recommended)
4. Users will need to verify email before full access

### Security Rules Check
Make sure your Firestore rules are deployed:
```bash
firebase deploy --only firestore:rules
```

---

## 🚀 After Firebase Updates

Once you've completed the Firebase configuration:

1. **Test the changes:**
   - Try signing up a new user
   - Check if email shows "Biz-CoPilot" as sender
   - Test Google sign-in to see updated app name

2. **Deploy your app:**
   ```bash
   npm run build
   firebase deploy
   ```

3. **Custom domain setup:**
   - After deploying, add custom domains in Firebase Hosting
   - Update DNS records at your domain registrar
   - SSL certificates are automatic with Firebase

---

## 💡 Tips

- **Testing**: Use a test email first to verify everything works
- **Email templates**: Keep them professional and match your brand
- **Authorized domains**: Add all domains you'll use (dev, staging, prod)
- **Custom domains**: Firebase provides free SSL certificates!

---

**Need help?** Check the [Firebase Documentation](https://firebase.google.com/docs) or let me know if you get stuck! 🚀
