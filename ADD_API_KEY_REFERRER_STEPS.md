# 🔑 Step-by-Step: Add biz-copilot.nl to API Key HTTP Referrers

## Overview
You need to add `https://biz-copilot.nl/*` to your Firebase API key's HTTP referrer restrictions so authentication works from your custom domain.

---

## 📋 Step-by-Step Instructions

### Step 1: Navigate to Google Cloud Console

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Make sure you're logged in with the correct Google account

2. **Select the Correct Project**
   - Look at the top of the page for the project selector
   - Click the project dropdown (currently shows "Biz-CoPilot")
   - **Verify** it shows: `expense-tracker-prod-475813`
   - If not, select it from the list

---

### Step 2: Go to Credentials Page

1. **Open the Navigation Menu**
   - Click the "☰" (hamburger menu) icon in the top left
   - OR use the left sidebar if already visible

2. **Navigate to APIs & Services**
   - In the menu, find: **"APIs & Services"**
   - Click to expand (if needed)
   - Click: **"Credentials"**

   **Direct Link:** https://console.cloud.google.com/apis/credentials?project=expense-tracker-prod-475813

---

### Step 3: Find Your Firebase API Key

You should see a section titled **"API Keys"** with a table.

**Look for one of these keys:**
- ✅ **"Biz-CoPilot Web (auto created by Firebase)"** ← **This is likely the one**
- OR **"New Browser key (auto created by Firebase)"**

**How to identify the correct key:**
- It should have "Firebase" in the name
- It should have restrictions showing "HTTP referrers" or "24 APIs" or similar
- Created date: Nov 15, 2025 or Nov 8, 2025

---

### Step 4: Edit the API Key

1. **Click on the API Key Name**
   - Click the blue link on the API key name (e.g., "Biz-CoPilot Web")
   - This opens the edit page

2. **OR Use the Actions Menu**
   - Click the three dots (⋮) on the right side of the row
   - Select "Edit" from the dropdown

---

### Step 5: Add HTTP Referrer Restrictions

1. **Scroll to "Application restrictions" Section**
   - You'll see a section titled **"Application restrictions"**
   - Currently it may show "None" or "HTTP referrers (web sites)"

2. **Select "HTTP referrers (web sites)"**
   - Click the radio button next to **"HTTP referrers (web sites)"**
   - A text area will appear below

3. **Add the Referrers**
   - Click **"Add an item"** button (or click in the text area)
   - Add each of these URLs **one per line**:

   ```
   https://biz-copilot.nl/*
   https://www.biz-copilot.nl/*
   https://expense-tracker-prod-475813.firebaseapp.com/*
   https://expense-tracker-prod-475813.web.app/*
   http://localhost:5173/*
   http://localhost:3000/*
   ```

   **Important Notes:**
   - ✅ Include the `/*` at the end of each URL
   - ✅ Use `https://` for production domains
   - ✅ Use `http://` for localhost
   - ✅ One URL per line

4. **Verify the List**
   - Make sure all 6 URLs are listed
   - Check for typos (especially `biz-copilot.nl`)

---

### Step 6: Save Changes

1. **Scroll to Bottom of Page**
   - Scroll down past the "API restrictions" section

2. **Click "Save" Button**
   - Look for the blue **"Save"** button at the bottom
   - Click it

3. **Wait for Confirmation**
   - You'll see a success message: "API key updated"
   - Changes take **1-2 minutes** to propagate

---

### Step 7: Verify the Changes

1. **Go Back to Credentials List**
   - Click "Credentials" in the breadcrumb or sidebar
   - You should see your API key in the list

2. **Check Restrictions Column**
   - Look at the "Restrictions" column for your API key
   - It should now show: **"HTTP referrers, X APIs"** (where X is the number)

3. **Double-Check by Editing Again**
   - Click the API key name again
   - Scroll to "Application restrictions"
   - Verify all 6 URLs are still there

---

## ✅ Verification Checklist

After completing the steps, verify:

- [ ] API key shows "HTTP referrers" in restrictions column
- [ ] All 6 URLs are listed in the referrers list
- [ ] `https://biz-copilot.nl/*` is present
- [ ] `https://www.biz-copilot.nl/*` is present
- [ ] Changes saved successfully

---

## 🧪 Test After Changes

1. **Wait 1-2 Minutes**
   - API key changes take 1-2 minutes to propagate

2. **Test Authentication**
   - Go to: `https://biz-copilot.nl/login`
   - Try signing in with email
   - Try Google OAuth
   - Should work without API key errors

3. **Test Email Verification**
   - Request email verification
   - Click the verification link
   - Should work without errors

---

## 🚨 Troubleshooting

### Issue: "API key not found"
**Solution:** Make sure you're in the correct project (`expense-tracker-prod-475813`)

### Issue: "Save button not working"
**Solution:** 
- Check that you selected "HTTP referrers (web sites)" radio button
- Make sure at least one URL is in the list

### Issue: "Still getting API key errors after 2 minutes"
**Solution:**
- Clear browser cache
- Try incognito/private window
- Wait 5 minutes (sometimes takes longer)
- Double-check the URL format (must include `/*`)

### Issue: "Can't find the API key"
**Solution:**
- Look for keys with "Firebase" in the name
- Check creation date (should be recent)
- If unsure, check both API keys and add referrers to both

---

## 📝 Quick Reference

**Direct Links:**
- Credentials Page: https://console.cloud.google.com/apis/credentials?project=expense-tracker-prod-475813
- Firebase Console: https://console.firebase.google.com/project/expense-tracker-prod-475813

**Required Referrers:**
```
https://biz-copilot.nl/*
https://www.biz-copilot.nl/*
https://expense-tracker-prod-475813.firebaseapp.com/*
https://expense-tracker-prod-475813.web.app/*
http://localhost:5173/*
http://localhost:3000/*
```

---

## ✅ Success Criteria

You'll know it's working when:
- ✅ No API key errors in browser console
- ✅ Authentication works from `biz-copilot.nl`
- ✅ Email verification links work
- ✅ Google OAuth works

---

*Last updated: November 18, 2025*

