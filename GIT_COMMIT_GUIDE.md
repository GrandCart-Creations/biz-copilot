# 📝 Git Commit & Push Guide

## Quick Reference: How to Commit and Push Changes

This guide teaches you how to manually stage, commit, and push your changes to GitHub.

---

## 🔍 Step 1: Check What Changed

Before committing, always check what files have been modified:

```bash
git status
```

This shows:
- **Modified files** (M) - Files you changed
- **Untracked files** (U) - New files not yet in Git
- **Staged files** - Files ready to commit (shown in green)

---

## 📦 Step 2: Stage Your Changes

You have three options:

### Option A: Stage ALL Changes (Most Common)
```bash
git add .
```
This stages everything: new files, modified files, deleted files.

### Option B: Stage Specific Files
```bash
git add src/components/Login.jsx
git add src/components/Signup.jsx
```
Use this when you want to commit only specific files.

### Option C: Stage All Modified Files (Not New Files)
```bash
git add -u
```
This only stages files that Git already knows about (skips new untracked files).

---

## ✅ Step 3: Verify What's Staged

Check what will be committed:

```bash
git status
```

Files shown in **green** are staged and ready to commit.

---

## 💬 Step 4: Write a Commit Message

### Simple One-Line Commit:
```bash
git commit -m "Your commit message here"
```

### Detailed Multi-Line Commit (Recommended):
```bash
git commit -m "feat: Add BENELUX tax rates support

- Updated Login page to show Benelux tax rates
- Changed Dutch references to BENELUX
- Added tax calculation for all BENELUX countries"
```

### Best Practices for Commit Messages:

1. **Use Conventional Commits Format:**
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `style:` - Code style changes (formatting)
   - `refactor:` - Code restructuring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

2. **Keep it Clear and Descriptive:**
   - ❌ Bad: `"fixed stuff"`
   - ✅ Good: `"fix: Resolve blank space issue on Login page"`
   - ✅ Better: `"fix: Remove blank space on right side of Login/Signup pages - ensure full-width layout"`

3. **Multi-line Format:**
   ```
   type: Short summary (50 chars max)
   
   Detailed explanation of what and why:
   - First change
   - Second change
   - Third change
   ```

---

## 🚀 Step 5: Push to GitHub

### Push to Main Branch:
```bash
git push origin main
```

### Push to Current Branch:
```bash
git push
```

### Force Push (⚠️ Use with Caution!):
```bash
git push --force
```
**Warning:** Only use `--force` if you know what you're doing. It overwrites remote history.

---

## 📋 Complete Workflow Example

Here's a typical workflow:

```bash
# 1. Make your code changes in VS Code

# 2. Check what changed
git status

# 3. Stage all changes
git add .

# 4. Verify what's staged
git status

# 5. Commit with a good message
git commit -m "feat: Add BENELUX tax rates support

- Updated tax rate references across UI
- Changed Dutch to BENELUX in Login/Signup pages
- Added support for Belgium and Luxembourg tax calculations"

# 6. Push to GitHub
git push origin main
```

---

## 🔄 Common Git Commands Reference

| Command | Purpose |
|---------|---------|
| `git status` | See what files changed |
| `git add .` | Stage all changes |
| `git add <file>` | Stage specific file |
| `git commit -m "message"` | Commit staged changes |
| `git push origin main` | Push to GitHub |
| `git pull` | Pull latest from GitHub |
| `git log` | See commit history |
| `git diff` | See what changed (unstaged) |
| `git diff --staged` | See what changed (staged) |

---

## ⚠️ Troubleshooting

### "Changes not staged for commit"
**Solution:** Run `git add .` first to stage your changes.

### "Your branch is ahead of origin/main"
**Solution:** Run `git push origin main` to push your commits.

### "Your branch is behind origin/main"
**Solution:** Run `git pull` first to get latest changes, then push.

### "Failed to push - conflict"
**Solution:** 
1. `git pull` to merge remote changes
2. Resolve any conflicts
3. `git add .` to stage resolved files
4. `git commit -m "Merge remote changes"`
5. `git push origin main`

### Accidentally committed wrong message?
**Solution:**
```bash
git commit --amend -m "New correct message"
git push --force-with-lease origin main
```

---

## 🎯 Best Practices

1. **Commit Often:** Make small, focused commits rather than one huge commit
2. **Write Clear Messages:** Future you (and your team) will thank you
3. **Pull Before Push:** Always `git pull` first if others work on the same branch
4. **Test Before Commit:** Make sure your code works before committing
5. **Review Staged Changes:** Always run `git status` before committing

---

## 📚 Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)

---

**Remember:** Git is your friend! It saves your work history and lets you collaborate safely. When in doubt, `git status` is your best friend! 🚀

