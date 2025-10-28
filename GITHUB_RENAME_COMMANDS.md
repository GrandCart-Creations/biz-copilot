# GitHub Repository Rename Commands

After renaming on GitHub, run these commands to update your local repository:

```bash
cd /Users/gc-mac2018/Desktop/expense-tracker-app

# Update the remote URL
git remote set-url origin https://github.com/GrandCart-Creations/biz-copilot.git

# Verify the new URL
git remote -v

# Pull to confirm connection
git pull

# Optional: Rename your local folder
cd ..
mv expense-tracker-app biz-copilot
cd biz-copilot
```

## ✅ Done!

Your repository is now `biz-copilot` both locally and on GitHub!
