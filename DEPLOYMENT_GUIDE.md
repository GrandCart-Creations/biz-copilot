# 🚀 Deployment Guide

## Frontend Changes (Sidebar & UI Fixes)

**Status:** ✅ Ready to deploy

### What Changed:
- ✅ Modern sidebar navigation
- ✅ Logo positioning fix (moves right when sidebar is open)
- ✅ Removed duplicate "Ask Biz-CoPilot" button from sidebar
- ✅ AI button position adjusts when sidebar is open/closed

### Deploy Frontend:
```bash
npm run build
firebase deploy --only hosting
```

**Note:** Frontend changes are visible on localhost but need deployment to see on `biz-copilot.nl`

---

## Firebase Functions (AI Engine)

**Status:** ⚠️ Optional - Only needed if you want AI features

### What's New:
- ✅ `processAIQuery` Cloud Function (OpenAI integration)
- ✅ AI Engine service integration

### Deploy Functions (Optional):

**Step 1: Install dependencies**
```bash
cd functions
npm install
cd ..
```

**Step 2: Set OpenAI API Key (Required for AI to work)**
```bash
firebase functions:secrets:set OPENAI_API_KEY
# Enter your OpenAI API key when prompted
```

**Step 3: Deploy Functions**
```bash
firebase deploy --only functions
```

**Note:** 
- AI features won't work without the OpenAI API key
- You can deploy frontend without deploying functions
- Functions are only needed if you want to use the AI Command Center

---

## Quick Deploy (Frontend Only)

If you just want the sidebar and UI fixes:

```bash
npm run build
firebase deploy --only hosting
```

This will update `biz-copilot.nl` with:
- ✅ New sidebar navigation
- ✅ Fixed logo positioning
- ✅ Single "Ask Biz-CoPilot" button
- ✅ All UI improvements

---

## Full Deploy (Frontend + Functions)

If you want everything including AI:

```bash
# 1. Build frontend
npm run build

# 2. Install function dependencies
cd functions && npm install && cd ..

# 3. Set OpenAI API key (first time only)
firebase functions:secrets:set OPENAI_API_KEY

# 4. Deploy everything
firebase deploy
```

---

## Testing After Deployment

1. **Frontend:** Visit `https://biz-copilot.nl` - you should see:
   - Sidebar on the left
   - Logo positioned correctly
   - Single "Ask Biz-CoPilot" button

2. **AI Features:** Test AI Command Center (⌘K / Ctrl+K):
   - Will work if functions are deployed AND OpenAI key is set
   - Will show error if functions not deployed or key missing

---

*Last updated: November 19, 2025*
