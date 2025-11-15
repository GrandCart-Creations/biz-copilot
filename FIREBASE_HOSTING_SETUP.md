# 🚀 Firebase Hosting Setup for biz-copilot.nl

## Why Set Up Custom Domain Hosting?

✅ **Professional Branding** - Use `biz-copilot.nl` instead of `expense-tracker-prod-475813.firebaseapp.com`  
✅ **Better SEO** - Custom domains rank better in search engines  
✅ **User Trust** - Professional domain builds credibility  
✅ **Email Verification Fix** - Solves API key referrer blocking issues  
✅ **SSL/HTTPS** - Automatic free SSL certificate  
✅ **Global CDN** - Fast loading worldwide  
✅ **Easy Deployment** - Simple `firebase deploy` command  

---

## 📋 Prerequisites

- [x] Domain `biz-copilot.nl` registered and accessible
- [x] Firebase project: `expense-tracker-prod-475813`
- [x] Firebase CLI installed (`npm install -g firebase-tools`)
- [x] Build output ready (`npm run build`)

---

## 🛠️ Step-by-Step Setup

### Step 1: Update firebase.json for React App Hosting

The current `firebase.json` is configured for a landing page. We need to update it for the React app:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|woff|woff2|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains"
          }
        ]
      }
    ]
  }
}
```

**Note:** Change `"public": "landing-page"` to `"public": "dist"` (Vite's build output folder)

---

### Step 2: Build Your App

```bash
cd /Users/gc-mac2018/Desktop/biz-copilot
npm run build
```

This creates the `dist` folder with your production-ready app.

---

### Step 3: Initialize Firebase Hosting (if not done)

```bash
firebase login
firebase init hosting
```

When prompted:
- **What do you want to use as your public directory?** → `dist`
- **Configure as a single-page app?** → `Yes`
- **Set up automatic builds and deploys with GitHub?** → `No` (or Yes if you want CI/CD)

---

### Step 4: Deploy to Firebase Hosting

```bash
# Build first
npm run build

# Deploy
firebase deploy --only hosting
```

Your app will be live at: `https://expense-tracker-prod-475813.web.app`

---

### Step 5: Add Custom Domain in Firebase Console

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select project: `expense-tracker-prod-475813`
   - Click **"Hosting"** in left sidebar

2. **Add Custom Domain**
   - Click **"Add custom domain"** button
   - Enter: `biz-copilot.nl`
   - Click **"Continue"**

3. **Verify Domain Ownership**
   - Firebase will show you a **TXT record** to add to your DNS
   - Go to your domain registrar (where you bought biz-copilot.nl)
   - Add the TXT record:
     ```
     Type: TXT
     Name: @ (or leave blank, depending on your DNS provider)
     Value: (the value Firebase provides)
     TTL: 3600
     ```
   - Wait 5-10 minutes for DNS propagation
   - Click **"Verify"** in Firebase Console

4. **Add A Records**
   - After verification, Firebase will provide **A records** (IP addresses)
   - Add these to your DNS:
     ```
     Type: A
     Name: @
     Value: (IP address 1 from Firebase)
     TTL: 3600
     
     Type: A
     Name: @
     Value: (IP address 2 from Firebase)
     TTL: 3600
     ```
   - **Note:** Some DNS providers require you to add multiple A records with the same name

5. **Wait for SSL Certificate**
   - Firebase automatically provisions an SSL certificate
   - This usually takes 5-30 minutes
   - You'll see "Certificate provisioning" status in Firebase Console

6. **Add www Subdomain (Optional)**
   - Repeat steps 2-5 for `www.biz-copilot.nl`
   - Or set up redirect from www to non-www in Firebase Console

---

### Step 6: Update Firebase Authentication Authorized Domains

1. **Go to Firebase Console → Authentication → Settings**
2. **Scroll to "Authorized domains"**
3. **Click "Add domain"** and add:
   - `biz-copilot.nl`
   - `www.biz-copilot.nl` (if you set it up)
   - `bizcopilot.nl` (if you own this too)

---

### Step 7: Update API Key HTTP Referrer Restrictions

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Select project: `expense-tracker-prod-475813`

2. **Find Your Firebase API Key**
   - Look for key starting with `AIza...`
   - Click to edit

3. **Update HTTP Referrers**
   - Under "Application restrictions" → "HTTP referrers (web sites)"
   - Add these referrers:
     ```
     https://biz-copilot.nl/*
     https://www.biz-copilot.nl/*
     https://expense-tracker-prod-475813.firebaseapp.com/*
     https://expense-tracker-prod-475813.web.app/*
     http://localhost:5173/*
     http://localhost:3000/*
     ```
   - Click **"Save"**

---

### Step 8: Update Environment Variables (if needed)

If you have any hardcoded URLs, update them to use the custom domain:

```env
VITE_APP_URL=https://biz-copilot.nl
VITE_FIREBASE_AUTH_DOMAIN=expense-tracker-prod-475813.firebaseapp.com
```

**Note:** `authDomain` stays as the Firebase domain, but your app URL changes.

---

### Step 9: Test Everything

1. **Visit your site:**
   - `https://biz-copilot.nl` ✅
   - `https://www.biz-copilot.nl` ✅ (if configured)

2. **Test Authentication:**
   - Sign up with email
   - Sign in with Google
   - Email verification links should work

3. **Test Email Verification:**
   - Request verification email
   - Click the link
   - Should work without API key errors

---

## 🔄 Future Deployments

After initial setup, deploying updates is simple:

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

Or deploy everything (hosting + functions + rules):

```bash
firebase deploy
```

---

## 🎯 Recommended Domain Structure

```
biz-copilot.nl          → Main app (React SPA)
www.biz-copilot.nl      → Redirect to biz-copilot.nl (or also app)
app.biz-copilot.nl      → Alternative app URL (optional)
```

---

## ⚠️ Important Notes

1. **DNS Propagation:** Changes can take 24-48 hours, but usually 5-30 minutes
2. **SSL Certificate:** Firebase automatically provisions SSL, takes 5-30 minutes
3. **Keep Firebase Domain:** The `.firebaseapp.com` domain will still work
4. **Build Before Deploy:** Always run `npm run build` before `firebase deploy`
5. **Environment Variables:** Make sure production env vars are set correctly

---

## 🐛 Troubleshooting

### "Domain verification failed"
- Wait longer for DNS propagation (up to 48 hours)
- Double-check TXT record is correct
- Make sure you're adding it at the root domain (@)

### "SSL certificate provisioning failed"
- Check DNS records are correct
- Wait 30 minutes and try again
- Contact Firebase support if persists

### "API key referrer blocked" after setup
- Make sure you added `https://biz-copilot.nl/*` to API key restrictions
- Wait 1-2 minutes after saving for changes to propagate

### App shows blank page
- Check browser console for errors
- Verify `dist` folder has `index.html`
- Check Firebase Console → Hosting → Files to see what's deployed

---

## ✅ Success Checklist

- [ ] Firebase hosting initialized
- [ ] App builds successfully (`npm run build`)
- [ ] First deployment successful
- [ ] Custom domain added in Firebase Console
- [ ] DNS TXT record added and verified
- [ ] DNS A records added
- [ ] SSL certificate provisioned
- [ ] Site accessible at `https://biz-copilot.nl`
- [ ] Authentication works on custom domain
- [ ] Email verification links work
- [ ] API key referrers updated
- [ ] Authorized domains updated in Firebase Auth

---

## 🎉 You're Done!

Once complete, your app will be live at:
- **https://biz-copilot.nl** ✨
- **https://www.biz-copilot.nl** ✨ (if configured)

All email verification links will work correctly, and you'll have a professional domain for your business!

