# 🌐 Custom Domain Setup: biz-copilot.nl

## ✅ Step 1: Deployment Complete!
Your app is now live at: **https://expense-tracker-prod-475813.web.app**

---

## 📋 Step 2: Add Custom Domain in Firebase Console

### 2.1 Go to Firebase Hosting
1. Open: https://console.firebase.google.com/project/expense-tracker-prod-475813/hosting
2. You should see your deployed site listed

### 2.2 Add Custom Domain
1. Click **"Add custom domain"** button (usually at the top)
2. Enter: `biz-copilot.nl`
3. Click **"Continue"**

### 2.3 Domain Verification
Firebase will show you a **TXT record** to add to your DNS. It will look like:
```
Type: TXT
Name: @ (or leave blank)
Value: firebase=expense-tracker-prod-475813
```

**Action Required:**
- Go to your domain registrar (where you bought biz-copilot.nl)
- Add this TXT record to your DNS
- Wait 5-10 minutes for DNS propagation
- Come back to Firebase Console and click **"Verify"**

---

## 📋 Step 3: Add A Records (After Verification)

Once verified, Firebase will provide **A records** (IP addresses). You'll need to add:

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

**Note:** Firebase typically provides 2 IP addresses. Add both as separate A records.

---

## 📋 Step 4: Wait for SSL Certificate

- Firebase automatically provisions an SSL certificate
- This usually takes **5-30 minutes**
- You'll see "Certificate provisioning" status in Firebase Console
- Once complete, your site will be live at `https://biz-copilot.nl`

---

## 📋 Step 5: Update API Key Referrers

1. Go to: https://console.cloud.google.com/apis/credentials?project=expense-tracker-prod-475813
2. Find your Firebase API key (starts with `AIza...`)
3. Click to edit
4. Under "Application restrictions" → "HTTP referrers (web sites)"
5. Add these referrers:
   ```
   https://biz-copilot.nl/*
   https://www.biz-copilot.nl/*
   https://expense-tracker-prod-475813.firebaseapp.com/*
   https://expense-tracker-prod-475813.web.app/*
   http://localhost:5173/*
   http://localhost:3000/*
   ```
6. Click **"Save"**
7. Wait 1-2 minutes for changes to propagate

---

## 📋 Step 6: Update Authorized Domains

1. Go to: https://console.firebase.google.com/project/expense-tracker-prod-475813/authentication/settings
2. Scroll to **"Authorized domains"**
3. Click **"Add domain"**
4. Enter: `biz-copilot.nl`
5. Click **"Add"**
6. (Optional) Also add `www.biz-copilot.nl` if you set it up

---

## ✅ Success Checklist

- [ ] Custom domain added in Firebase Console
- [ ] TXT record added to DNS and verified
- [ ] A records added to DNS
- [ ] SSL certificate provisioned (check Firebase Console)
- [ ] Site accessible at `https://biz-copilot.nl`
- [ ] API key referrers updated
- [ ] Authorized domains updated
- [ ] Authentication works on custom domain
- [ ] Email verification links work

---

## 🧪 Testing

Once everything is set up:

1. **Visit:** `https://biz-copilot.nl`
2. **Test Sign Up:** Create a new account
3. **Test Sign In:** Login with existing account
4. **Test Email Verification:** Request verification email and click link
5. **Test Google Sign In:** Try signing in with Google

---

## 🐛 Troubleshooting

### "Domain verification failed"
- Wait longer (DNS can take up to 48 hours, usually 5-30 minutes)
- Double-check TXT record is exactly as Firebase provided
- Make sure you're adding it at the root domain (@)

### "SSL certificate provisioning failed"
- Verify DNS records are correct
- Wait 30 minutes and check again
- Contact Firebase support if it persists

### Site shows blank page
- Check browser console for errors
- Verify `dist` folder has `index.html`
- Check Firebase Console → Hosting → Files

### API key still blocked
- Make sure you added `https://biz-copilot.nl/*` (with the `/*`)
- Wait 1-2 minutes after saving
- Try requesting a new verification email

---

## 📞 Need Help?

If you get stuck at any step, let me know and I'll help troubleshoot!

