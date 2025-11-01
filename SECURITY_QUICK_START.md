# 🚀 SECURITY QUICK START GUIDE

## Immediate Actions (Do This First!)

### 1. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Firebase credentials
nano .env
```

Fill in your actual values:
```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Generate encryption key
VITE_ENCRYPTION_KEY=$(openssl rand -base64 32)
```

### 2. Deploy Security Headers

```bash
firebase deploy --only hosting
```

This deploys the updated `firebase.json` with all security headers.

### 3. Test Security Headers

Visit your site and check headers in browser DevTools:
- Network tab → Select any request → Headers
- Verify these headers are present:
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`

---

## Using Encryption

### Encrypt Sensitive Data Before Storing

```javascript
import { encryptSensitiveField, encryptSensitiveFields } from '@/utils/encryption';

// Single field
const encryptedAmount = await encryptSensitiveField(expense.amount);

// Multiple fields
const encryptedExpense = await encryptSensitiveFields(expense, [
  'amount',
  'vatNumber',
  'bankAccount'
]);
```

### Decrypt When Reading

```javascript
import { decryptSensitiveField, decryptSensitiveFields } from '@/utils/encryption';

// Single field
const amount = await decryptSensitiveField(encryptedAmount);

// Multiple fields
const decryptedExpense = await decryptSensitiveFields(encryptedExpense);
```

---

## GDPR Tools Integration

### Add Route to Your App

In your router (e.g., `App.jsx` or routing file):

```jsx
import GDPRTools from './components/GDPRTools';

// Add route
<Route path="/settings/privacy" element={<GDPRTools />} />
```

### Link from Settings Page

```jsx
<Link to="/settings/privacy">
  Data Privacy & GDPR
</Link>
```

---

## Current Security Status

### ✅ Completed
- Firebase config → environment variables
- Security headers (CSP, HSTS, etc.)
- Data encryption utilities
- GDPR compliance tools
- Security audit report

### ⚠️ Still Needed
- **MFA:** Implement real TOTP (critical!)
- **Encryption:** Integrate into expense creation
- **Legal Pages:** Terms & Privacy Policy
- **Rate Limiting:** API protection
- **IP Logging:** Real IP addresses in audit logs

---

## Testing Checklist

- [ ] Environment variables loaded correctly
- [ ] Security headers visible in DevTools
- [ ] Encryption/decryption works
- [ ] GDPR data export downloads JSON
- [ ] GDPR account deletion works (test with test account!)
- [ ] No hardcoded secrets in built code

---

## Need Help?

- **Full Audit:** See `SECURITY_AUDIT_REPORT.md`
- **Implementation:** See `SECURITY_IMPLEMENTATION_SUMMARY.md`
- **Quick Start:** This file

---

**Next:** Implement MFA and integrate encryption into expense creation!

