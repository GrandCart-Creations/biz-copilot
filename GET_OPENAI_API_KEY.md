# 🔑 How to Get Your OpenAI API Key

**Date:** November 19, 2025  
**Purpose:** Enable AI Engine functionality in Biz-CoPilot

---

## 📋 Step-by-Step Guide

### Step 1: Visit OpenAI Platform
1. Open your web browser
2. Go to: **https://platform.openai.com**
3. You'll see the OpenAI Platform homepage

---

### Step 2: Sign In or Create Account

**If you already have an account:**
- Click **"Sign In"** (top right)
- Enter your email and password
- Click **"Log In"**

**If you don't have an account:**
- Click **"Sign Up"** (top right)
- Enter your email address
- Create a password
- Verify your email (check your inbox)
- Complete the sign-up process

---

### Step 3: Navigate to API Keys

**Option A: Via Navigation Menu**
1. Once logged in, look at the left sidebar
2. Click on **"API keys"** (usually under "Settings" or "Account")

**Option B: Direct Link**
1. Go directly to: **https://platform.openai.com/api-keys**
2. You may need to sign in first

---

### Step 4: Create New Secret Key

1. On the API Keys page, you'll see:
   - A list of existing keys (if any)
   - A button: **"Create new secret key"** or **"+ Create new secret key"**

2. Click **"Create new secret key"**

3. A dialog will appear asking:
   - **Name** (optional): Give it a name like "Biz-CoPilot" or "Business App"
   - **Permissions**: Usually defaults to full access (which is fine)

4. Click **"Create secret key"**

---

### Step 5: Copy Your API Key ⚠️ IMPORTANT

**⚠️ CRITICAL:** You'll see your API key only ONCE!

1. A dialog will show your new API key
2. It will look like: `sk-proj-...` or `sk-...` (starts with `sk-`)
3. **IMMEDIATELY copy it** - Click the copy button or select all and copy
4. **Save it securely** - Paste it in a safe place (password manager, notes app, etc.)
5. Click **"Done"** or close the dialog

**⚠️ WARNING:** 
- You cannot view this key again after closing the dialog
- If you lose it, you'll need to create a new one
- Never share your API key publicly

---

### Step 6: Add Billing (If Required)

**OpenAI may require billing setup:**

1. If prompted, click **"Add payment method"**
2. Go to: **https://platform.openai.com/account/billing**
3. Click **"Add payment method"**
4. Enter your credit card details
5. Complete the payment setup

**Note:** 
- OpenAI offers free credits for new accounts
- GPT-3.5-turbo is very affordable (~$0.001-0.002 per query)
- You can set usage limits to control costs

---

## 🔐 Security Best Practices

### ✅ DO:
- ✅ Store your API key securely (password manager)
- ✅ Use environment variables or secrets (Firebase Secrets)
- ✅ Set usage limits in OpenAI dashboard
- ✅ Monitor usage regularly
- ✅ Rotate keys periodically

### ❌ DON'T:
- ❌ Commit API keys to Git
- ❌ Share keys publicly
- ❌ Hardcode keys in source code
- ❌ Use the same key for multiple projects (create separate keys)

---

## 💰 Pricing Information

### GPT-3.5-turbo (What Biz-CoPilot Uses)
- **Input:** $0.50 per 1M tokens
- **Output:** $1.50 per 1M tokens
- **Average query:** ~500-1000 tokens
- **Cost per query:** ~$0.001-0.002 (less than 1 cent!)

### Example Costs:
- 100 queries ≈ $0.10-0.20
- 1,000 queries ≈ $1-2
- 10,000 queries ≈ $10-20

**Very affordable for business use!**

---

## 📊 Set Usage Limits (Recommended)

**To control costs:**

1. Go to: **https://platform.openai.com/account/billing/limits**
2. Set **Hard limit** (e.g., $50/month)
3. Set **Soft limit** (e.g., $40/month) - sends email warning
4. Click **"Save"**

**This prevents unexpected charges.**

---

## ✅ Verify Your API Key

**Test that your key works:**

1. Copy your API key
2. You'll use it in the next step when setting up Firebase Functions

**Key format:**
- Starts with `sk-`
- Usually 50+ characters long
- Example: `sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`

---

## 🚀 Next Steps

**Once you have your API key:**

1. **Set it in Firebase Functions:**
   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   # Paste your API key when prompted
   ```

2. **Deploy Functions:**
   ```bash
   firebase deploy --only functions
   ```

3. **Test the AI Engine:**
   - Open `https://biz-copilot.nl`
   - Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux)
   - Try a query: "Show me expenses this month"

---

## 🐛 Troubleshooting

### Issue: "Invalid API key"
**Solution:**
- Verify you copied the entire key (no spaces)
- Check if key starts with `sk-`
- Ensure no extra characters
- Try creating a new key

### Issue: "Insufficient credits"
**Solution:**
- Add payment method in OpenAI dashboard
- Check billing: https://platform.openai.com/account/billing
- Add credits if needed

### Issue: "Rate limit exceeded"
**Solution:**
- You're making too many requests
- Wait a few minutes
- Consider upgrading your OpenAI plan

---

## 📝 Quick Checklist

- [ ] Created OpenAI account
- [ ] Navigated to API Keys page
- [ ] Created new secret key
- [ ] Copied and saved API key securely
- [ ] Added payment method (if required)
- [ ] Set usage limits (recommended)
- [ ] Ready to set in Firebase Functions

---

## 🔗 Useful Links

- **OpenAI Platform:** https://platform.openai.com
- **API Keys:** https://platform.openai.com/api-keys
- **Billing:** https://platform.openai.com/account/billing
- **Usage Dashboard:** https://platform.openai.com/usage
- **Documentation:** https://platform.openai.com/docs

---

## 💡 Tips

1. **Name your keys:** Use descriptive names like "Biz-CoPilot-Prod" or "Biz-CoPilot-Dev"
2. **Monitor usage:** Check usage dashboard regularly
3. **Set alerts:** Enable email alerts for usage limits
4. **Keep backups:** Save your API key in multiple secure locations
5. **Rotate keys:** Create new keys periodically for security

---

**Once you have your API key, proceed to set it in Firebase Functions!**

*Last updated: November 19, 2025*

