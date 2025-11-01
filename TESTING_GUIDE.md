# Testing Guide - Phase 0: Security & Legal Compliance

**Last Updated:** January 2025

This guide will help you test all the newly implemented features before moving to the next phase.

---

## 🧪 Testing Checklist

### 1. Build & Compilation ✅
- [x] **Build Success:** Project compiles without errors
- [x] **No Linter Errors:** All code passes linting
- [ ] **Dev Server:** Start dev server and verify it runs

```bash
npm run dev
```

---

### 2. Legal Pages Testing

#### 2.1 Terms of Service Page
- [ ] Navigate to `/terms` (or scroll to footer on login/signup page and click "Terms of Service")
- [ ] Verify page loads correctly
- [ ] Check all sections are displayed:
  - Acceptance of Terms
  - User Accounts
  - Acceptable Use
  - Data Ownership
  - Payment Terms
  - Liability Limitations
  - Governing Law (Dutch law)
  - Jurisdiction clauses (Netherlands, Belgium, Luxembourg)
- [ ] Verify responsive design (mobile/tablet/desktop)
- [ ] Check footer information is displayed

#### 2.2 Privacy Policy Page
- [ ] Navigate to `/privacy` (or scroll to footer on login/signup page and click "Privacy Policy")
- [ ] Verify page loads correctly
- [ ] Check GDPR compliance sections:
  - Data Controller information
  - User Rights (Articles 15-21)
  - Supervisory Authority links (AP, GBA, CNPD)
  - Data Security measures
  - International Transfers
- [ ] Verify links to supervisory authorities work
- [ ] Check responsive design

#### 2.3 Cookie Policy Page
- [ ] Navigate to `/cookies` (or scroll to footer on login/signup page and click "Cookie Policy", or click link in cookie consent banner)
- [ ] Verify page loads correctly
- [ ] Check cookie categories are explained:
  - Essential cookies
  - Functional cookies
  - Analytics cookies
- [ ] Verify cookie table displays correctly
- [ ] Check management instructions

---

### 3. Cookie Consent Banner Testing

#### 3.1 Initial Display
- [ ] Clear browser localStorage: `localStorage.clear()`
- [ ] Refresh page
- [ ] Verify cookie consent banner appears at bottom
- [ ] Check banner has correct styling and text

#### 3.2 Accept All
- [ ] Click "Accept All" button
- [ ] Verify banner disappears
- [ ] Check localStorage has consent saved:
  ```javascript
  localStorage.getItem('cookie_consent')
  // Should return: {"essential":true,"functional":true,"analytics":true}
  ```
- [ ] Refresh page - banner should NOT appear again

#### 3.3 Reject Non-Essential
- [ ] Clear localStorage again
- [ ] Refresh page
- [ ] Click "Reject Non-Essential"
- [ ] Verify banner disappears
- [ ] Check localStorage has correct preferences:
  ```javascript
  localStorage.getItem('cookie_consent')
  // Should return: {"essential":true,"functional":false,"analytics":false}
  ```

#### 3.4 Customize Settings
- [ ] Clear localStorage again
- [ ] Refresh page
- [ ] Click "Customize" button
- [ ] Verify settings modal opens
- [ ] Test toggling Functional cookies ON
- [ ] Test toggling Analytics cookies ON
- [ ] Click "Save Preferences"
- [ ] Verify modal closes and banner disappears
- [ ] Check localStorage has correct preferences

#### 3.5 Settings Persistence
- [ ] Navigate to different pages
- [ ] Verify consent preferences persist
- [ ] Check that analytics only loads if consented

---

### 4. MFA (Multi-Factor Authentication) Testing

#### 4.1 MFA Setup Page Access
- [ ] Login to your account
- [ ] Navigate to `/settings/mfa`
- [ ] Verify page loads correctly
- [ ] Check initial state shows "Enable MFA" if not enabled

#### 4.2 Enable MFA Flow
- [ ] Click "Enable MFA" button
- [ ] Wait for QR code generation (may take 1-2 seconds)
- [ ] Verify QR code is displayed
- [ ] Verify QR code is scannable (use Google Authenticator app)
- [ ] Click "I have scanned the QR Code - Continue"
- [ ] Enter a 6-digit code from your authenticator app
- [ ] Click "Verify & Enable"
- [ ] If first time: Verify backup codes are displayed
- [ ] Save backup codes (copy one to clipboard)
- [ ] Click "I have saved my backup codes"
- [ ] Verify success message appears
- [ ] Check MFA is now enabled in Firestore:
  ```javascript
  // Check Firestore: users/{userId}/security/mfa
  // enabled should be true
  ```

#### 4.3 MFA Verification
- [ ] Refresh page
- [ ] Verify MFA status shows as "enabled"
- [ ] Try disabling MFA (should work with confirmation)

#### 4.4 Backup Codes
- [ ] Test copying a backup code
- [ ] Verify code copies to clipboard
- [ ] (Optional) Test using backup code for login (requires login flow integration)

---

### 5. Encryption Integration Testing

#### 5.1 Expense Creation with Encryption
- [ ] Navigate to expense tracker
- [ ] Create a new expense with sensitive data:
  - Amount: €100.50
  - Vendor: "Test Vendor"
  - Bank Account: "NL91ABNA0417164300"
  - Invoice Number: "INV-2025-001"
- [ ] Save the expense
- [ ] Check Firestore directly:
  ```javascript
  // In Firestore console, check users/{userId}/expenses/{expenseId}
  // Verify these fields are encrypted (should see encrypted strings):
  // - amount_encrypted: true
  // - bankAccount_encrypted: true
  // - invoiceNumber_encrypted: true
  // - amount: (encrypted string, not plain number)
  ```

#### 5.2 Expense Reading with Decryption
- [ ] Refresh the expense list
- [ ] Verify expense displays correctly:
  - Amount shows as €100.50 (decrypted)
  - Bank Account shows correctly (decrypted)
  - Invoice Number shows correctly (decrypted)
- [ ] Check browser console for decryption errors

#### 5.3 Expense Update with Encryption
- [ ] Edit an existing expense
- [ ] Change the amount to €200.75
- [ ] Save the expense
- [ ] Verify it displays correctly after save
- [ ] Check Firestore to verify encryption

#### 5.4 Legacy Data Handling
- [ ] If you have old expenses without encryption:
  - Verify they still display correctly
  - Check no errors in console
  - Verify new expenses are encrypted but old ones aren't

---

### 6. Routing Testing

#### 6.1 Legal Page Routes
- [ ] Test navigation to `/terms`
- [ ] Test navigation to `/privacy`
- [ ] Test navigation to `/cookies`
- [ ] Verify all routes work without authentication (public pages)

#### 6.2 Protected Routes
- [ ] Logout
- [ ] Try accessing `/dashboard` - should redirect to `/login`
- [ ] Try accessing `/settings/mfa` - should redirect to `/login`
- [ ] Login again
- [ ] Verify protected routes work after login

---

### 7. Integration Testing

#### 7.1 Cookie Consent + Analytics
- [ ] Clear localStorage and refresh
- [ ] Reject analytics cookies
- [ ] Check browser Network tab - Google Analytics should NOT load
- [ ] Clear localStorage again
- [ ] Accept analytics cookies
- [ ] Check browser Network tab - Google Analytics SHOULD load

#### 7.2 MFA + Encryption
- [ ] Enable MFA
- [ ] Create an encrypted expense
- [ ] Verify both features work together

#### 7.3 Legal Pages Links
- [ ] Check if signup/login pages link to Terms and Privacy
- [ ] Verify footer links (if you have a footer component)

---

### 8. Error Handling Testing

#### 8.1 MFA Errors
- [ ] Try entering invalid MFA code (non-6-digit)
- [ ] Verify error message appears
- [ ] Try entering wrong 6-digit code
- [ ] Verify error message appears

#### 8.2 Encryption Errors
- [ ] Test creating expense with invalid data
- [ ] Check console for encryption errors
- [ ] Verify graceful degradation (old data still works)

---

### 9. Performance Testing

#### 9.1 Build Performance
- [ ] Check build time (should be < 5 seconds)
- [ ] Check bundle size (warning if > 500KB is acceptable for now)

#### 9.2 Runtime Performance
- [ ] Test page load times
- [ ] Test MFA setup (QR generation should be < 2 seconds)
- [ ] Test encryption/decryption (should be instant)

---

### 10. Browser Compatibility

#### 10.1 Modern Browsers
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)

#### 10.2 Features to Test
- [ ] Cookie localStorage works
- [ ] Clipboard API works (backup codes)
- [ ] Crypto API works (encryption)
- [ ] QR code generation/display

---

## 🐛 Known Issues & Notes

### Crypto Module Warning
The build shows a warning about the "crypto" module being externalized. This is expected for browser compatibility and doesn't affect functionality. The `otplib` library uses the browser's native Web Crypto API, which is available in all modern browsers.

### Bundle Size
The bundle is large (958KB) due to:
- Firebase SDK
- React Router
- Icons library
- QR Code generation

This is acceptable for now. Future optimization:
- Code splitting
- Lazy loading of routes
- Tree shaking unused icons

---

## 📊 Test Results Template

Use this template to track your test results:

```
Date: _______________
Tester: _______________

Build & Compilation: [ ] Pass [ ] Fail
Legal Pages: [ ] Pass [ ] Fail
Cookie Consent: [ ] Pass [ ] Fail
MFA Setup: [ ] Pass [ ] Fail
Encryption: [ ] Pass [ ] Fail
Routing: [ ] Pass [ ] Fail
Integration: [ ] Pass [ ] Fail
Error Handling: [ ] Pass [ ] Fail
Performance: [ ] Pass [ ] Fail
Browser Compatibility: [ ] Pass [ ] Fail

Issues Found:
1. _______________
2. _______________
3. _______________

Notes:
_______________
```

---

## 🚀 Quick Start Testing Commands

```bash
# Start development server
npm run dev

# Run build (check for errors)
npm run build

# Check for linting errors
npm run lint
```

---

## ✅ Sign-Off

Once all tests pass:

- [ ] All critical features working
- [ ] No console errors
- [ ] Legal pages accessible and complete
- [ ] MFA can be enabled and verified
- [ ] Encryption working for expenses
- [ ] Cookie consent functioning
- [ ] Ready for next phase

---

**Next Phase:** Once testing is complete, we can proceed with:
- Enhanced Firestore security rules deployment
- Income module encryption
- Additional security features
- Business planning tools

