# 🤖 AI Engine Testing Guide

**Date:** November 19, 2025  
**Status:** Ready for Testing

---

## 🎯 Pre-Testing Checklist

### 1. OpenAI API Key Setup
```bash
# Check if secret is set
firebase functions:secrets:access OPENAI_API_KEY

# If not set, set it:
firebase functions:secrets:set OPENAI_API_KEY
# Enter your OpenAI API key when prompted
```

### 2. Functions Dependencies
```bash
cd functions
npm install
cd ..
```

### 3. Deploy Functions
```bash
firebase deploy --only functions
```

---

## 🧪 Test Scenarios

### Test 1: Basic Financial Query
**Query:** "Show me expenses this month"  
**Scope:** Financial  
**Expected:**
- ✅ Fetches expenses from this month
- ✅ Calculates totals
- ✅ Returns structured data
- ✅ AI provides insights

### Test 2: Income Query
**Query:** "What's my total income?"  
**Scope:** Financial  
**Expected:**
- ✅ Fetches income records
- ✅ Calculates total
- ✅ Returns formatted response

### Test 3: Invoice Query
**Query:** "Show me unpaid invoices"  
**Scope:** Financial  
**Expected:**
- ✅ Fetches invoices
- ✅ Filters unpaid ones
- ✅ Returns count and total
- ✅ Provides recommendations

### Test 4: Comparison Query
**Query:** "Compare income vs expenses"  
**Scope:** Financial  
**Expected:**
- ✅ Fetches both income and expenses
- ✅ Calculates net profit
- ✅ Provides comparison insights

### Test 5: Date Range Query
**Query:** "Show me expenses last month"  
**Scope:** Financial  
**Expected:**
- ✅ Applies date filter correctly
- ✅ Fetches last month's expenses
- ✅ Returns accurate totals

### Test 6: Global Query
**Query:** "What changed this week?"  
**Scope:** Global  
**Expected:**
- ✅ Provides general business overview
- ✅ Mentions recent activities
- ✅ Helpful guidance

---

## 🔍 What to Check

### Response Quality
- [ ] Response is relevant to query
- [ ] Uses actual data from database
- [ ] Provides actionable insights
- [ ] Formatting is clear and readable

### Data Accuracy
- [ ] Totals match actual data
- [ ] Date ranges are correct
- [ ] Counts are accurate
- [ ] Currency formatting is correct (€)

### Error Handling
- [ ] Graceful error messages
- [ ] No crashes on invalid queries
- [ ] Helpful suggestions on errors

### Performance
- [ ] Response time < 5 seconds
- [ ] No timeout errors
- [ ] Efficient data fetching

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to process query: internal"
**Cause:** OpenAI API key not set or invalid  
**Solution:**
```bash
firebase functions:secrets:set OPENAI_API_KEY
# Enter valid OpenAI API key
firebase deploy --only functions
```

### Issue 2: "Company not found"
**Cause:** Invalid companyId  
**Solution:** Ensure user has selected a company

### Issue 3: "Missing required parameters"
**Cause:** Missing query, companyId, or userId  
**Solution:** Check AICommandCenter component integration

### Issue 4: Slow responses
**Cause:** Large data sets or network issues  
**Solution:** 
- Check data query limits
- Verify network connection
- Check Firebase Functions logs

---

## 📊 Testing Results Template

```
Test Date: [Date]
Tester: [Name]
Company: [Company Name]

Test 1: Basic Financial Query
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
```

---

## 🚀 Quick Test Commands

### Test via Browser Console
```javascript
// Open browser console on biz-copilot.nl
// Test the Cloud Function directly
const testQuery = async () => {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const { app } = await import('./firebase.js');
  const functions = getFunctions(app);
  const processAIQuery = httpsCallable(functions, 'processAIQuery');
  
  const result = await processAIQuery({
    query: "Show me expenses this month",
    scope: "financial",
    companyId: "YOUR_COMPANY_ID",
    userId: "YOUR_USER_ID"
  });
  
  console.log('AI Response:', result.data);
};

testQuery();
```

---

## ✅ Success Criteria

**AI Engine is working correctly if:**
1. ✅ Queries return relevant responses
2. ✅ Data is accurate and matches database
3. ✅ Responses include insights and suggestions
4. ✅ Error handling works gracefully
5. ✅ Response times are acceptable (< 5s)
6. ✅ All test scenarios pass

---

*Last updated: November 19, 2025*

