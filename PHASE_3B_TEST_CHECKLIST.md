# Phase 3B Testing Checklist

## ✅ Company Context Integration

### ExpenseTracker
- [ ] Verify company selector appears in header
- [ ] Test: Without company selected → Shows "Please select a company" message
- [ ] Test: Add Expense button is disabled when no company selected
- [ ] Test: With company selected → Expenses load correctly
- [ ] Test: Add new expense works with company selected
- [ ] Test: Edit expense works
- [ ] Test: Delete expense works
- [ ] Test: Switch between companies → Expenses change correctly
- [ ] Test: Migration button appears in empty state (if legacy data exists)

### SecurityDashboard
- [ ] Verify company selector appears in header
- [ ] Test: Without company selected → Shows "No Company Selected" message
- [ ] Test: With company selected → Audit logs load (if any exist)
- [ ] Test: Security stats display correctly

### Company Selector
- [ ] Test: Dropdown shows all user's companies
- [ ] Test: Switch between companies works
- [ ] Test: Create new company works
- [ ] Test: Edit company name works
- [ ] Test: Delete company works (with confirmation)

## ✅ Data Persistence

- [ ] Test: Refresh page → Selected company persists
- [ ] Test: Expenses persist after refresh
- [ ] Test: Create expense → Refresh → Expense still there
- [ ] Test: Switch company → Refresh → Correct company selected

## ✅ Console Checks

Open browser console and verify:
- [ ] No permission errors
- [ ] No Firebase errors
- [ ] Company context logs show correct company IDs
- [ ] Only warnings (not errors) for encryption key fallback

## ✅ Edge Cases

- [ ] Test: User with no companies → Default company created
- [ ] Test: Delete all companies → New default company created
- [ ] Test: Migration with no legacy data → Shows "No expenses to migrate"
- [ ] Test: Migration with existing data → Migrates successfully

---

## Quick Test Commands

1. **Start dev server**: Already running
2. **Navigate to**: `http://localhost:5173/dashboard`
3. **Check console**: Look for any errors
4. **Test flow**:
   - Login → Select/Create company → View expenses → Add expense → Switch company

---

**Phase 3B Status**: ✅ Ready for testing
**Next Phase**: 3C - Modular Dashboard with Dynamic Module Tiles

