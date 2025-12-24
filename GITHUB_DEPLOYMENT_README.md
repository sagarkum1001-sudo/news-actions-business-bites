# GitHub Deployment Script

This repository uses an automated deployment script to ensure only Vercel-required files are committed to GitHub.

## 🚀 Quick Start

### Run the deployment script:

```bash
# Interactive mode (recommended)
./deploy-to-github.sh

# With custom commit message
./deploy-to-github.sh -m "Fix API endpoint bug"

# Automated mode (no confirmation)
./deploy-to-github.sh --yes

# Combined
./deploy-to-github.sh -m "Update user interface" --yes
```

## 📋 What the Script Does

### ✅ Automatic File Selection
The script **automatically identifies** which files belong in GitHub:

**Files INCLUDED in GitHub:**
- `api/` - All Vercel serverless functions
- `public/` - Static assets (HTML, CSS, JS, images)
- `vercel.json` - Vercel deployment configuration
- `package.json` & `package-lock.json` - Node.js dependencies
- `.vercelignore` - Vercel ignore patterns
- `README.md` - Repository documentation

**Files EXCLUDED from GitHub:**
- `*.py`, `*.pyc`, `__pycache__/` - Python files
- `*.sql`, `*.db`, `*.sqlite*` - Database files
- `*.sh`, `*.log` - Scripts and logs
- `venv/`, `node_modules/` - Development dependencies
- `*.md` (except README.md) - Documentation
- `*.tar.gz`, `*.zip` - Archives
- `.env*` - Environment files
- `*test*`, `*debug*`, `*backup*` - Test/debug files

### 🧹 Repository Cleaning
1. **Removes** all non-Vercel files from git tracking
2. **Deletes** development files from working directory
3. **Ensures** clean deployment history

### 🔄 Deployment Process
1. **Validates** repository structure
2. **Cleans** unwanted files
3. **Adds** only Vercel-required files
4. **Previews** changes (unless `--yes` used)
5. **Commits** with descriptive message
6. **Pushes** to GitHub main branch
7. **Validates** final repository state

## 🎯 Benefits

- **No manual mistakes** - Automatic file selection
- **Clean GitHub history** - Only deployment-relevant commits
- **Fast Vercel deployments** - No unnecessary files
- **Consistent process** - Same workflow every time
- **Validation** - Ensures repository stays clean

## 📝 Usage Examples

### Development Workflow

```bash
# 1. Make changes to API or frontend
# 2. Test locally
# 3. Run deployment script
./deploy-to-github.sh -m "Add new user preferences API"

# 4. Vercel automatically deploys from GitHub
```

### CI/CD Integration

```bash
# Automated deployment (no interaction needed)
./deploy-to-github.sh -m "Auto-deploy $(date)" --yes
```

### Quick Fixes

```bash
# Skip preview for urgent fixes
./deploy-to-github.sh -m "Hotfix: API security issue" --yes
```

## 🔧 Configuration

The script is pre-configured for this repository:

- **Remote**: `origin`
- **Branch**: `main`
- **Repository**: `https://github.com/sagarkum1001-sudo/news-actions-business-bites`

## 🚨 Important Notes

- **Always run from repository root** (`news-actions-business-bites/` directory)
- **Script is self-contained** - no external dependencies
- **Safe to run multiple times** - idempotent operations
- **Force push protection** - uses `--force-with-lease` for safety
- **No data loss** - backend files remain in separate repository

## 🔍 Troubleshooting

### Script won't run
```bash
chmod +x deploy-to-github.sh
./deploy-to-github.sh
```

### Repository validation fails
- Ensure you're in the correct directory
- Check that `api/`, `public/`, `vercel.json` exist
- Run `git status` to check repository state

### Push fails
- Check git remote configuration: `git remote -v`
- Ensure you have push permissions
- Resolve any merge conflicts manually if needed

## 📊 Script Features

- ✅ **Color-coded output** for easy reading
- ✅ **Interactive confirmation** (can be skipped)
- ✅ **Comprehensive validation**
- ✅ **Detailed logging**
- ✅ **Error handling**
- ✅ **Repository state validation**
- ✅ **Automatic cleanup**
- ✅ **Custom commit messages**

---

**Use this script for all GitHub deployments to maintain a clean, Vercel-optimized repository!** 🚀
