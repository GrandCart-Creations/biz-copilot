# Onboarding System Test Plan

## ✅ What's Been Implemented

### Core Components:
1. **OnboardingContext** - Manages state and progress tracking
2. **OnboardingWizard** - 5-step wizard with progress indicators
3. **OnboardingGate** - Automatically shows wizard for new users
4. **5 Step Components** - Welcome, Company Setup, Profile, Team Invite, Module Tour

### Features:
- ✅ Progress tracking in Firestore
- ✅ Resume capability (saves progress)
- ✅ Skip optional steps
- ✅ Company creation integration
- ✅ Team invitation integration
- ✅ BENELUX country/tax rate selection
- ✅ Auto-triggers for users with no companies

---

## 🧪 Testing Scenarios

### Test Case 1: New User (No Companies)
**Steps:**
1. Create a new Firebase Auth user (or use test account)
2. Log in with new user
3. **Expected:** Onboarding wizard should appear automatically
4. **Expected:** Step 1 (Welcome) should be shown

**Verification:**
- ✅ Wizard modal appears
- ✅ Progress bar shows 1/5
- ✅ "Let's Get Started" button works

---

### Test Case 2: Company Creation (Step 2)
**Steps:**
1. On Step 2, enter a company name (e.g., "Test Company")
2. Click "Create Company"
3. **Expected:** Company is created successfully
4. **Expected:** Automatically moves to Step 3

**Verification:**
- ✅ Company appears in company selector
- ✅ Progress updates to Step 3
- ✅ No errors in console

---

### Test Case 3: Company Profile (Step 3)
**Steps:**
1. Select a BENELUX country (NL, BE, or LU)
2. **Expected:** Currency updates automatically (EUR)
3. **Expected:** Tax rates display correctly
4. Click "Continue" (footer button)

**Verification:**
- ✅ Country selection works
- ✅ Currency auto-updates
- ✅ Correct tax rates shown
- ✅ Moves to Step 4

---

### Test Case 4: Team Invitation (Step 4) - Optional
**Steps:**
1. Option A: Invite a team member
   - Enter email and role
   - Click "Send Invitation"
   - **Expected:** Invitation sent, appears in list
2. Option B: Skip step
   - Click "Skip this step" button
   - **Expected:** Moves to Step 5

**Verification:**
- ✅ Invitations can be sent
- ✅ Skip button works
- ✅ Step is marked as optional

---

### Test Case 5: Module Tour (Step 5)
**Steps:**
1. Review module overview
2. Click "Complete Setup & Go to Dashboard"
3. **Expected:** Onboarding marked complete
4. **Expected:** Redirects to dashboard
5. **Expected:** Wizard doesn't appear again on next login

**Verification:**
- ✅ Completion works
- ✅ Redirects correctly
- ✅ Onboarding document in Firestore shows `completed: true`

---

### Test Case 6: Existing User (Has Companies)
**Steps:**
1. Log in with existing user (has companies)
2. **Expected:** Onboarding wizard does NOT appear
3. **Expected:** User goes directly to dashboard

**Verification:**
- ✅ No wizard interruption
- ✅ Normal dashboard access

---

### Test Case 7: Skip Onboarding
**Steps:**
1. On any step, click "X" (close button) if available
2. **Expected:** Onboarding marked as skipped
3. **Expected:** User can access dashboard
4. **Expected:** Wizard doesn't reappear

**Verification:**
- ✅ Skip works
- ✅ Dashboard accessible
- ✅ No infinite loops

---

### Test Case 8: Resume Progress
**Steps:**
1. Start onboarding (Step 1)
2. Refresh page mid-way
3. Log back in
4. **Expected:** Resume from last step (if not completed)

**Note:** This requires onboarding document to exist with step < 5

---

### Test Case 9: Company Already Exists
**Steps:**
1. Create a company manually first
2. Trigger onboarding (by clearing onboarding document)
3. Reach Step 2 (Company Setup)
4. **Expected:** Shows "Company Already Created!" message
5. **Expected:** "Continue to Next Step" button available

**Verification:**
- ✅ Detects existing companies
- ✅ Allows skipping company creation

---

### Test Case 10: Navigation
**Steps:**
1. Navigate through all steps
2. Use "Previous" button
3. Use "Next" button
4. **Expected:** Navigation works smoothly
5. **Expected:** Progress bar updates

**Verification:**
- ✅ Previous/Next buttons work
- ✅ Progress bar reflects current step
- ✅ Step indicators show completion

---

## 🔍 Console Checks

**What to Look For:**
- ❌ No "Missing or insufficient permissions" errors
- ❌ No infinite loops or re-renders
- ❌ No "useOnboarding must be used within OnboardingProvider" errors
- ⚠️ Check for warnings about duplicate companies (should be handled)

**Expected Console Logs:**
- `[OnboardingContext] Loading onboarding status...`
- `[OnboardingContext] Onboarding needed: true/false`

---

## 🐛 Known Limitations / Future Enhancements

1. **Settings Persistence:** Company profile settings are collected but not yet saved to Firestore (can be added later)
2. **Role-based Variants:** All users see same flow (Owner/Manager variants can be added)
3. **Resume Logic:** Currently resumes from step 0 if interrupted (can be improved)

---

## ✅ Quick Test Checklist

- [ ] New user sees onboarding wizard
- [ ] Existing user does NOT see wizard
- [ ] Step 1 (Welcome) displays correctly
- [ ] Step 2 (Company Setup) can create company
- [ ] Step 3 (Company Profile) shows BENELUX countries
- [ ] Step 4 (Team Invite) can send invitations
- [ ] Step 5 (Module Tour) displays modules
- [ ] "Complete" button redirects to dashboard
- [ ] Onboarding doesn't reappear after completion
- [ ] Navigation (Previous/Next) works
- [ ] Progress bar updates correctly
- [ ] Skip buttons work on optional steps
- [ ] No console errors

---

## 🚀 How to Test

1. **Test as New User:**
   - Create a new Firebase Auth user
   - Log in
   - Should see onboarding wizard immediately

2. **Test as Existing User:**
   - Log in with current account
   - Should NOT see onboarding (has companies)

3. **Force Onboarding (For Testing):**
   - In Firebase Console, delete `users/{userId}/onboarding/status` document
   - Log out and log back in
   - Should see onboarding wizard

4. **Complete Flow:**
   - Go through all 5 steps
   - Verify each step works
   - Complete onboarding
   - Verify dashboard access
   - Log out and log back in
   - Verify onboarding doesn't reappear

