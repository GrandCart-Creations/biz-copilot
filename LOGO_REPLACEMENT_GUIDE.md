# Logo Replacement Guide

## 📋 Format Requirements

### ✅ **Accepted Formats:**
- **SVG** (Recommended) - Vector, scales perfectly, transparent background
- **PNG** - Raster, needs transparent background, high resolution (512x512 or larger)

### ✅ **Requirements:**
- **White lettering** (as you mentioned)
- **Transparent background** (no background color)
- **High resolution** (at least 512x512 pixels for PNG, or vector SVG)

---

## 📁 Where to Place Your Logo File

### Option 1: Replace Existing Logo (Recommended)
Place your new logo file here:
```
public/branding/logo/logo-light.svg
```
or
```
public/branding/logo/logo-light.png
```

**Why `logo-light.svg`?**
- It's designed for dark backgrounds (like your login page gradient)
- White lettering on transparent background = perfect for dark backgrounds
- Already referenced in the codebase

### Option 2: Create New File
If you want to keep the old logo, create:
```
public/branding/logo/logo-white-transparent.svg
```
or
```
public/branding/logo/logo-white-transparent.png
```

---

## 🔧 What I Can Do vs. What You Need to Do

### ✅ **I Can Do:**
- Update the code to reference your new logo file
- Update the Login component to use the new logo
- Update any other components that use the logo
- Adjust sizing/styling if needed

### ⚠️ **You Need to Do:**
- **Place the logo file** in the `public/branding/logo/` directory
- **Name it correctly** (e.g., `logo-light.svg` or `logo-white-transparent.svg`)
- **Ensure it's the correct format** (SVG or PNG with transparent background)

---

## 🚀 Quick Steps

### Step 1: Prepare Your Logo
- Make sure it's **white lettering on transparent background**
- Save as **SVG** (preferred) or **PNG** (high-res, 512x512+)
- Name it: `logo-white-transparent.svg` (or `.png`)

### Step 2: Place the File
```bash
# Copy your logo file to:
/Users/gc-mac2018/Desktop/biz-copilot/public/branding/logo/logo-white-transparent.svg
```

### Step 3: Let Me Know
Once you've placed the file, tell me:
- The filename you used
- Whether it's SVG or PNG
- Any sizing preferences

I'll update the code to use it!

---

## 📝 Current Logo Usage

The login page currently uses:
- **Fallback:** `/branding/favicon/safari-pinned-tab.svg`
- **Or:** Company branding logo from database (if set)

After you place your new logo, I'll update it to use your new file.

---

## 🎨 Format Recommendations

### For Best Results:
1. **SVG format** - Scales perfectly, crisp at any size
2. **Transparent background** - Works on any background color
3. **White/light color** - Visible on dark gradient backgrounds
4. **High resolution** - If PNG, use at least 512x512 pixels

### File Naming:
- `logo-white-transparent.svg` ✅ (descriptive)
- `logo-light.svg` ✅ (if replacing existing)
- `login-logo.svg` ✅ (if login-specific)

---

## ✅ Ready When You Are!

Once you place the file in `public/branding/logo/`, just let me know the filename and I'll:
1. Update the Login component
2. Update any other references
3. Test the display
4. Deploy the changes

**No need to modify any code yourself - I'll handle that!**

