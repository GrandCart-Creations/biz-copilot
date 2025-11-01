# Legal Pages Access Guide

## 📄 Legal Pages Available

Biz-CoPilot has three legal pages that are fully compliant with BENELUX regulations:

1. **Terms of Service** (`/terms`)
2. **Privacy Policy** (`/privacy`)
3. **Cookie Policy** (`/cookies`)

---

## 🔗 How to Access Legal Pages

### Method 1: Direct URL Access

Simply type these URLs in your browser (works on any page):

```
http://localhost:5173/terms
http://localhost:5173/privacy
http://localhost:5173/cookies
```

### Method 2: Footer Links (Login & Signup Pages)

The footer appears at the bottom of:
- **Login page** (`/login`)
- **Signup page** (`/signup`)

Scroll down to the bottom of either page, and you'll see:
- Terms of Service
- Privacy Policy
- Cookie Policy

Click any of these links to navigate to the respective page.

### Method 3: Cookie Consent Banner

When the cookie consent banner appears:
1. Click the **"Customize"** button
2. In the Cookie Preferences dialog, click the **"Learn more in our Cookie Policy"** link
3. This takes you directly to the Cookie Policy page

---

## 🧪 Testing Checklist for Legal Pages

### Terms of Service (`/terms`)
- [ ] Page loads correctly
- [ ] All 16 sections are visible
- [ ] Dutch law mentioned
- [ ] Jurisdiction clauses for NL, BE, LU visible
- [ ] Contact information displayed
- [ ] Responsive on mobile/tablet

### Privacy Policy (`/privacy`)
- [ ] Page loads correctly
- [ ] GDPR compliance section visible
- [ ] All user rights explained (Articles 15-21)
- [ ] Supervisory authority links work:
  - [ ] Autoriteit Persoonsgegevens (Netherlands)
  - [ ] Gegevensbeschermingsautoriteit (Belgium)
  - [ ] Commission Nationale pour la Protection des Données (Luxembourg)
- [ ] Data security measures listed
- [ ] Responsive on mobile/tablet

### Cookie Policy (`/cookies`)
- [ ] Page loads correctly
- [ ] Three cookie categories explained
- [ ] Cookie table displays correctly
- [ ] Management instructions visible
- [ ] Responsive on mobile/tablet

---

## ✅ Quick Test

Run these commands to verify pages are accessible:

```bash
# Start dev server (if not running)
npm run dev

# Then visit in browser:
# - http://localhost:5173/terms
# - http://localhost:5173/privacy
# - http://localhost:5173/cookies
```

Or simply scroll to the bottom of the login/signup pages and click the footer links!

---

## 📝 Notes

- All legal pages are **public** (no login required)
- Pages are optimized for readability
- Content is GDPR and BENELUX compliant
- All external links open in new tabs

---

**Last Updated:** January 2025

