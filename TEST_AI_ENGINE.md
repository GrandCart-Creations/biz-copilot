# 🧪 AI Engine Testing Steps

**Date:** November 19, 2025  
**Status:** Ready for Testing

---

## 📋 Pre-Testing Setup

### Step 1: Install OpenAI Package
```bash
cd functions
npm install openai
cd ..
```

### Step 2: Set OpenAI API Key
```bash
firebase functions:secrets:set OPENAI_API_KEY
# Enter your OpenAI API key when prompted
```

**Get OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-...`)

### Step 3: Deploy Functions
```bash
firebase deploy --only functions
```

**Expected Output:**
```
✔  functions[processAIQuery(europe-west1)] Successful create operation.
```

---

## 🧪 Test Queries

### Test 1: Basic Expense Query
**Open AI Command Center:** Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux)

**Query:** `Show me expenses this month`  
**Scope:** Financial (auto-selected)

**Expected Results:**
- ✅ Fetches expenses from current month
- ✅ Calculates total expenses
- ✅ Shows VAT total
- ✅ AI provides insights
- ✅ Response includes data summary
- ✅ Suggestions for follow-up queries

---

### Test 2: Income Query
**Query:** `What's my total income?`  
**Scope:** Financial

**Expected Results:**
- ✅ Fetches all income records
- ✅ Calculates total income
- ✅ Shows count of income records
- ✅ AI provides financial insights

---

### Test 3: Invoice Query
**Query:** `List unpaid invoices`  
**Scope:** Financial

**Expected Results:**
- ✅ Fetches invoices
- ✅ Filters unpaid ones
- ✅ Shows count and total amount
- ✅ AI provides cash flow insights
- ✅ Warning if unpaid total is high

---

### Test 4: Comparison Query
**Query:** `Compare income vs expenses`  
**Scope:** Financial

**Expected Results:**
- ✅ Fetches both income and expenses
- ✅ Calculates net profit/loss
- ✅ Provides comparison analysis
- ✅ Shows trends and insights

---

### Test 5: Date Range Query
**Query:** `Show me expenses last month`  
**Scope:** Financial

**Expected Results:**
- ✅ Applies date filter correctly
- ✅ Fetches last month's expenses
- ✅ Returns accurate totals
- ✅ Date range is correct

---

### Test 6: Global Query
**Query:** `What changed this week?`  
**Scope:** Global

**Expected Results:**
- ✅ Provides general business overview
- ✅ Mentions recent activities
- ✅ Helpful guidance and suggestions

---

## ✅ Success Indicators

### Response Quality
- [ ] Response is relevant to query
- [ ] Uses actual data from database
- [ ] Provides actionable insights
- [ ] Formatting is clear and readable
- [ ] Currency formatted correctly (€)

### Data Accuracy
- [ ] Totals match actual data in database
- [ ] Date ranges are correct
- [ ] Counts are accurate
- [ ] Financial calculations are correct

### UI/UX
- [ ] Response displays clearly
- [ ] Insights shown in colored boxes
- [ ] Data summary displayed
- [ ] Suggestions are clickable
- [ ] Loading state works
- [ ] Error messages are helpful

### Performance
- [ ] Response time < 5 seconds
- [ ] No timeout errors
- [ ] Efficient data fetching
- [ ] Smooth user experience

---

## 🐛 Troubleshooting

### Error: "Failed to process query: internal"
**Cause:** OpenAI API key not set or invalid

**Solution:**
```bash
# Check if secret exists
firebase functions:secrets:access OPENAI_API_KEY

# If empty or wrong, set it:
firebase functions:secrets:set OPENAI_API_KEY
# Enter valid OpenAI API key

# Redeploy functions
firebase deploy --only functions
```

### Error: "Company not found"
**Cause:** Invalid companyId or no company selected

**Solution:**
- Ensure you have selected a company
- Check that company exists in Firestore
- Verify user has access to company

### Error: "Missing required parameters"
**Cause:** Missing query, companyId, or userId

**Solution:**
- Check browser console for errors
- Verify AICommandCenter is properly integrated
- Ensure user is logged in

### Slow Responses
**Cause:** Large data sets or network issues

**Solution:**
- Check Firebase Functions logs: `firebase functions:log`
- Verify data query limits (currently 20 items)
- Check network connection
- Consider optimizing queries

---

## 📊 Testing Checklist

### Basic Functionality
- [ ] AI Command Center opens (⌘K / Ctrl+K)
- [ ] Query input works
- [ ] Scope selection works
- [ ] Submit button works
- [ ] Loading state displays
- [ ] Response displays

### Data Queries
- [ ] Expense queries work
- [ ] Income queries work
- [ ] Invoice queries work
- [ ] Date filtering works
- [ ] Totals are calculated correctly

### Response Display
- [ ] Main response text displays
- [ ] Insights display (if available)
- [ ] Data summary displays (if available)
- [ ] Suggestions display (if available)
- [ ] All formatting is correct

### Error Handling
- [ ] Invalid queries handled gracefully
- [ ] Missing data handled gracefully
- [ ] Network errors handled gracefully
- [ ] Error messages are helpful

---

## 🎯 Next Steps After Testing

1. **If all tests pass:**
   - ✅ AI Engine is ready for production
   - ✅ Continue with AI Workspaces (Phase 7B)
   - ✅ Add Global Search Bar (Phase 7C)

2. **If issues found:**
   - Document issues in this file
   - Fix bugs
   - Re-test
   - Deploy fixes

---

## 📝 Test Results Template

```
Test Date: [Date]
Tester: [Name]
Company: [Company Name]
OpenAI API Key: [Set/Not Set]

Test 1: Basic Expense Query
- Status: ✅/❌
- Response Time: [seconds]
- Data Accuracy: ✅/❌
- Notes: [Any issues]

Test 2: Income Query
- Status: ✅/❌
- Response Time: [seconds]
- Data Accuracy: ✅/❌
- Notes: [Any issues]

...

Overall Status: ✅ Ready / ⚠️ Issues Found
```

---

*Last updated: November 19, 2025*

