# 🚀 Quick Start: Firebase Hosting for biz-copilot.nl

## ⚡ Quick Setup (15 minutes)

### 1. Update firebase.json (2 minutes)

Change the `public` directory from `landing-page` to `dist`:

```json
{
  "hosting": {
    "public": "dist",  // ← Change this from "landing-page"
    ...
  }
}
```

### 2. Build & Deploy (3 minutes)

```bash
# Build your React app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### 3. Add Custom Domain in Firebase Console (5 minutes)

1. Go to: https://console.firebase.google.com/project/expense-tracker-prod-475813/hosting
2. Click **"Add custom domain"**
3. Enter: `biz-copilot.nl`
4. Add the TXT record to your DNS (Firebase will show you what to add)
5. Wait 5-10 minutes, then click **"Verify"**
6. Add the A records Firebase provides
7. Wait for SSL certificate (5-30 minutes)

### 4. Update API Key Referrers (2 minutes)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your Firebase API key (starts with `AIza...`)
3. Add these referrers:
   - `https://biz-copilot.nl/*`
   - `https://www.biz-copilot.nl/*`
   - `https://expense-tracker-prod-475813.firebaseapp.com/*`
   - `https://expense-tracker-prod-475813.web.app/*`
   - `http://localhost:5173/*`

### 5. Update Authorized Domains (1 minute)

1. Go to: Firebase Console → Authentication → Settings
2. Add `biz-copilot.nl` to authorized domains

### 6. Test (2 minutes)

- Visit: `https://biz-copilot.nl`
- Test sign up / sign in
- Test email verification

---

## ✅ Benefits

- ✅ Professional domain (`biz-copilot.nl` instead of `.firebaseapp.com`)
- ✅ Fixes email verification API key errors
- ✅ Free SSL certificate
- ✅ Global CDN (fast worldwide)
- ✅ Easy deployments (`firebase deploy`)
- ✅ Better SEO

---

## 📝 Important Notes

1. **Build Before Deploy:** Always run `npm run build` first
2. **DNS Propagation:** Can take 5 minutes to 48 hours (usually 5-30 minutes)
3. **SSL Certificate:** Firebase provisions automatically (5-30 minutes)
4. **Keep Firebase Domain:** The `.firebaseapp.com` domain still works

---

## 🔄 Future Deployments

```bash
npm run build && firebase deploy --only hosting
```

That's it! Your app will be live at `https://biz-copilot.nl` 🎉

