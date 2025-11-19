# 🚀 Deploy AI Engine Functions

**Date:** November 19, 2025  
**Status:** Ready to Deploy

---

## 📋 Deployment Steps

### Step 1: Install Dependencies
```bash
cd functions
npm install
cd ..
```

**Verify OpenAI is installed:**
```bash
cd functions
npm list openai
```

**Expected output:**
```
openai@4.20.0
```

---

### Step 2: Set OpenAI API Key

**Option A: Set via Firebase CLI (Recommended)**
```bash
firebase functions:secrets:set OPENAI_API_KEY
# Enter your OpenAI API key when prompted
```

**Option B: Set via Environment Variable (Development)**
```bash
# Not recommended for production
export OPENAI_API_KEY="sk-your-key-here"
```

**Get OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)
5. **Important:** Save it securely, you won't see it again!

---

### Step 3: Deploy Functions

**Deploy only functions:**
```bash
firebase deploy --only functions
```

**Or deploy everything:**
```bash
firebase deploy
```

**Expected output:**
```
✔  functions[processAIQuery(europe-west1)] Successful create operation.
✔  Deploy complete!
```

---

### Step 4: Verify Deployment

**Check function logs:**
```bash
firebase functions:log --only processAIQuery
```

**Test the function:**
1. Open `https://biz-copilot.nl`
2. Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux)
3. Enter a test query: "Show me expenses this month"
4. Check response

---

## 🧪 Quick Test

**After deployment, test with:**

1. **Basic Query:**
   - Query: "Show me expenses this month"
   - Scope: Financial
   - Expected: Fetches expenses, calculates totals

2. **Income Query:**
   - Query: "What's my total income?"
   - Scope: Financial
   - Expected: Fetches income, calculates total

3. **Invoice Query:**
   - Query: "List unpaid invoices"
   - Scope: Financial
   - Expected: Fetches invoices, filters unpaid

---

## 🐛 Troubleshooting

### Error: "Secret not found"
**Solution:**
```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions
```

### Error: "Module not found: openai"
**Solution:**
```bash
cd functions
npm install openai
cd ..
firebase deploy --only functions
```

### Error: "Function deployment failed"
**Solution:**
1. Check Firebase Functions logs
2. Verify Node.js version (should be 20)
3. Check `functions/package.json` dependencies
4. Try redeploying

---

## ✅ Success Indicators

**Deployment successful if:**
- ✅ Function appears in Firebase Console
- ✅ No errors in deployment logs
- ✅ AI Command Center responds to queries
- ✅ Responses include data and insights
- ✅ No "internal" errors

---

## 📊 Cost Estimation

**OpenAI API Costs (GPT-3.5-turbo):**
- ~$0.001-0.002 per query
- 1000 queries ≈ $1-2
- Very affordable for testing

**Monitor usage:**
- Check OpenAI dashboard: https://platform.openai.com/usage
- Set usage limits if needed

---

*Last updated: November 19, 2025*

