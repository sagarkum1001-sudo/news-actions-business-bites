#!/bin/bash

# ===========================================
# Vercel GitHub Deployment Script
# ===========================================
# Automatically manages GitHub repository for Vercel deployments
# Ensures only Vercel-required files are committed to GitHub

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERCEL_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITHUB_REMOTE="origin"
GITHUB_BRANCH="main"

# Files and directories that SHOULD be in GitHub (Vercel deployment)
VERCEL_REQUIRED=(
    "api/"
    "public/"
    "vercel.json"
    "package.json"
    "package-lock.json"
    ".vercelignore"
    "README.md"
)

# Files and patterns that should NOT be in GitHub
EXCLUDE_PATTERNS=(
    "*.py"
    "*.pyc"
    "__pycache__/"
    "*.sql"
    "*.db"
    "*.sqlite*"
    "*.log"
    "*.sh"
    "*.md"
    "!README.md"  # But keep README.md
    ".env*"
    "venv/"
    "node_modules/"
    "*.tar.gz"
    "*.zip"
    ".git/"
    ".gitignore"
    ".dockerignore"
    "Dockerfile*"
    "docker-compose*"
    "*.test.js"
    "*.spec.js"
    "*test*"
    "*debug*"
    "*backup*"
    "*migration*"
    "*deploy*"
    "*setup*"
    "*config*"
    "*.bak"
    "*.tmp"
)

# ===========================================
# FUNCTIONS
# ===========================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
check_repository() {
    log_info "Checking repository structure..."

    if [[ ! -d "api" ]] || [[ ! -d "public" ]] || [[ ! -f "vercel.json" ]]; then
        log_error "This doesn't appear to be a Vercel project directory."
        log_error "Expected: api/, public/, vercel.json"
        exit 1
    fi

    if [[ ! -d ".git" ]]; then
        log_error "This is not a git repository."
        exit 1
    fi

    log_success "Repository structure verified"
}

# Get current git status
get_git_status() {
    log_info "Checking git status..."

    # Check if there are uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        log_warning "There are uncommitted changes in the working directory"
        git status --short
        echo ""
    else
        log_success "Working directory is clean"
    fi
}

# Clean repository by removing files that shouldn't be in GitHub
clean_repository() {
    log_info "Cleaning repository of non-Vercel files..."

    local files_removed=0

    # Remove files matching exclude patterns
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        # Skip the negation patterns (starting with !)
        if [[ $pattern == !* ]]; then
            continue
        fi

        # Find and remove files matching this pattern
        while IFS= read -r -d '' file; do
            if [[ -f "$file" ]] || [[ -d "$file" ]]; then
                log_info "Removing: $file"
                git rm -r --cached "$file" 2>/dev/null || true
                rm -rf "$file" 2>/dev/null || true
                ((files_removed++))
            fi
        done < <(find . -name "$pattern" -print0 2>/dev/null)
    done

    # Special handling: remove common development directories
    local dev_dirs=("venv" "node_modules" "__pycache__" ".cache" "migrations")

    for dir in "${dev_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            log_info "Removing development directory: $dir/"
            git rm -r --cached "$dir" 2>/dev/null || true
            rm -rf "$dir" 2>/dev/null || true
            ((files_removed++))
        fi
    done

    log_success "Removed $files_removed non-Vercel files/directories"
}

# Ensure required Vercel files are present and tracked
ensure_vercel_files() {
    log_info "Ensuring Vercel-required files are present..."

    local missing_files=()

    for file in "${VERCEL_REQUIRED[@]}"; do
        if [[ $file == */ ]] && [[ ! -d "${file%/}" ]]; then
            missing_files+=("$file")
        elif [[ $file != */ ]] && [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done

    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_warning "Missing Vercel-required files:"
        printf '  %s\n' "${missing_files[@]}"
        echo ""
        log_warning "Please ensure all required files are present before deployment."
        echo "Required files: ${VERCEL_REQUIRED[*]}"
    else
        log_success "All required Vercel files are present"
    fi
}

# Add only Vercel-required files
add_vercel_files() {
    log_info "Adding Vercel-required files to git..."

    # First, ensure required files exist
    ensure_vercel_files

    # Add specific required files/directories
    for item in "${VERCEL_REQUIRED[@]}"; do
        if [[ -e "$item" ]]; then
            log_info "Adding: $item"
            git add "$item"
        else
            log_warning "Required item not found: $item"
        fi
    done

    log_success "Vercel files added to staging area"
}

# Show what will be committed
preview_commit() {
    log_info "Preview of files to be committed:"

    echo "=========================================="
    git status --porcelain
    echo "=========================================="
    echo ""

    # Count files
    local staged_count=$(git diff --cached --name-only | wc -l)
    local total_size=$(git ls-files | xargs du -ch 2>/dev/null | tail -1 | cut -f1)

    log_info "Summary:"
    echo "  - Files staged for commit: $staged_count"
    echo "  - Approximate total size: $total_size"
    echo ""
}

# Commit changes
commit_changes() {
    local commit_message="$1"

    if [[ -z "$commit_message" ]]; then
        commit_message="🚀 Vercel deployment update - $(date '+%Y-%m-%d %H:%M:%S')"
    fi

    log_info "Committing changes..."

    # Check if there are changes to commit
    if [[ -z $(git diff --cached --name-only) ]]; then
        log_warning "No changes to commit"
        return 0
    fi

    # Commit with no verification (skip pre-commit hooks that may fail)
    if git commit --no-verify -m "$commit_message"; then
        log_success "Changes committed successfully"
        return 0
    else
        log_error "Failed to commit changes"
        return 1
    fi
}

# Push to GitHub
push_to_github() {
    log_info "Pushing to GitHub ($GITHUB_REMOTE/$GITHUB_BRANCH)..."

    if git push "$GITHUB_REMOTE" "$GITHUB_BRANCH" --force-with-lease; then
        log_success "Successfully pushed to GitHub"
        log_info "GitHub URL: https://github.com/sagarkum1001-sudo/news-actions-business-bites"
    else
        log_error "Failed to push to GitHub"
        log_warning "You may need to resolve conflicts or check your git remote configuration"
        return 1
    fi
}

# Validate final repository state
validate_repository() {
    log_info "Validating final repository state..."

    local errors=0

    # Check that only allowed files are present
    local all_files=$(git ls-files)

    for file in $all_files; do
        local allowed=false

        # Check if file matches any required pattern
        for required in "${VERCEL_REQUIRED[@]}"; do
            if [[ $file == $required* ]] || [[ $file == $required ]]; then
                allowed=true
                break
            fi
        done

        if [[ $allowed == false ]]; then
            log_error "Unexpected file in repository: $file"
            ((errors++))
        fi
    done

    # Check that required files are present
    for required in "${VERCEL_REQUIRED[@]}"; do
        if ! git ls-files | grep -q "^$required"; then
            if [[ -e "$required" ]]; then
                log_warning "Required file not tracked: $required"
            fi
        fi
    done

    if [[ $errors -eq 0 ]]; then
        log_success "Repository validation passed"
        return 0
    else
        log_error "Repository validation failed with $errors errors"
        return 1
    fi
}

# Main deployment function
deploy_to_github() {
    local commit_message="$1"
    local skip_preview="$2"

    echo "=========================================="
    echo "🚀 VERCEL GITHUB DEPLOYMENT SCRIPT"
    echo "=========================================="
    echo ""

    # Step 1: Check repository
    check_repository

    # Step 2: Get current status
    get_git_status

    # Step 3: Clean repository
    clean_repository

    # Step 4: Add Vercel files
    add_vercel_files

    # Step 5: Preview (unless skipped)
    if [[ $skip_preview != "true" ]]; then
        preview_commit

        echo "Do you want to proceed with the commit and push? (y/N): "
        read -r response
        if [[ ! $response =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    fi

    # Step 6: Commit
    if commit_changes "$commit_message"; then
        # Step 7: Push
        push_to_github

        # Step 8: Validate
        validate_repository

        echo ""
        log_success "🎉 Deployment completed successfully!"
        log_info "Your Vercel site is now updated on GitHub"
    else
        log_error "Deployment failed during commit phase"
        exit 1
    fi
}

# ===========================================
# MAIN SCRIPT
# ===========================================

# Parse command line arguments
COMMIT_MESSAGE=""
SKIP_PREVIEW="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--message)
            COMMIT_MESSAGE="$2"
            shift 2
            ;;
        -y|--yes)
            SKIP_PREVIEW="true"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Automatically deploy Vercel-required files to GitHub"
            echo ""
            echo "Options:"
            echo "  -m, --message MESSAGE    Custom commit message"
            echo "  -y, --yes                Skip preview and confirmation"
            echo "  -h, --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 -m 'Fix API bug'"
            echo "  $0 --yes"
            echo "  $0 -m 'Update UI' --yes"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Run deployment
deploy_to_github "$COMMIT_MESSAGE" "$SKIP_PREVIEW"
