#!/bin/bash

# Local Development Deployment Script
# This script commits local changes, pushes to GitHub, and triggers Vercel deployment
# Usage: ./scripts/deploy-local.sh "Your commit message"

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') ${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') ${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') ${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') ${RED}[ERROR]${NC} $1"
}

# Check if commit message is provided
COMMIT_MESSAGE="$1"
if [ -z "$COMMIT_MESSAGE" ]; then
    log_error "Usage: $0 \"Commit message\""
    log_info "Example: $0 \"Updated article display with new styling\""
    exit 1
fi

log_info "🚀 Starting local deployment to Vercel..."

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    log_error "vercel.json not found. Are you in the news-actions-business-bites directory?"
    exit 1
fi

# Check git status
log_info "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    log_info "Found uncommitted changes"
else
    log_warning "No changes to commit. Pulling latest and pushing to trigger redeployment..."
    git pull origin main
    git push origin main
    log_success "✅ Repository up to date and redeployment triggered"
    log_info "🌐 Check deployment status: https://vercel.com/your-dashboard"
    exit 0
fi

# Add all changes
log_info "Adding changes to git..."
git add .

# Commit with provided message
log_info "Committing changes..."
git commit -m "$COMMIT_MESSAGE"

# Push to GitHub (this will trigger Vercel deployment)
log_info "Pushing to GitHub (this triggers Vercel deployment)..."
git push origin main

log_success "✅ Local deployment complete!"
log_info "🌐 Vercel deployment should start automatically"
log_info "📊 Check deployment status: https://vercel.com/dashboard"
log_info "🚀 Site will be updated at: https://news-actions-business-bites.vercel.app"

# Optional: Wait and check deployment status
log_info "⏳ Waiting 10 seconds for deployment to start..."
sleep 10

log_info "🚀 To check deployment status, visit:"
log_info "   Vercel Dashboard: https://vercel.com/dashboard"
log_info "   Live Site: https://news-actions-business-bites.vercel.app"
log_info "   Build Logs: Check GitHub Actions or Vercel dashboard"

log_success "🎉 Deployment process initiated successfully!"
