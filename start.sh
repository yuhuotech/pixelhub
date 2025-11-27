#!/bin/bash

# ============================================
# PixelHub Start Script
# ============================================
#
# Usage:
#   ./start.sh              # Start/update and run the app
#   ./start.sh --dev        # Run in development mode
#   ./start.sh --fresh      # Force full reinstall (npm install + build)
#
# This script handles:
# 1. First-time setup (npm install + build)
# 2. Updates (git pull + conditional rebuild)
# 3. Development vs production modes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# Functions
# ============================================

log_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

log_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# ============================================
# Main Script
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log_info "PixelHub Startup Script"
log_info "Current directory: $(pwd)"
echo

# Parse arguments
DEV_MODE=false
FRESH_INSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            DEV_MODE=true
            shift
            ;;
        --fresh)
            FRESH_INSTALL=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Usage: ./start.sh [--dev] [--fresh]"
            exit 1
            ;;
    esac
done

# ============================================
# Step 1: Check prerequisites
# ============================================

log_info "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
fi

log_success "Node.js $(node --version) and npm $(npm --version) found"
echo

# ============================================
# Step 2: Check if this is a git repository
# ============================================

if [ -d .git ]; then
    log_info "Git repository detected"

    # Get current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log_info "Current branch: $CURRENT_BRANCH"

    # Check for uncommitted changes and stash them
    if ! git diff-index --quiet HEAD --; then
        log_warning "Found uncommitted changes, stashing them..."
        git stash
        log_info "Changes stashed"
    fi

    # Pull latest changes
    if [ "$FRESH_INSTALL" = false ]; then
        log_info "Fetching latest changes from remote..."
        git fetch origin

        # Check if there are new commits
        COMMITS_BEHIND=$(git rev-list --count HEAD..origin/$CURRENT_BRANCH 2>/dev/null || echo 0)

        if [ "$COMMITS_BEHIND" -gt 0 ]; then
            log_warning "Local branch is $COMMITS_BEHIND commit(s) behind origin"
            log_info "Pulling latest changes..."
            git pull origin $CURRENT_BRANCH
            log_success "Updated to latest version"
            REBUILD_NEEDED=true
        else
            log_success "Already up to date"
        fi
    fi
    echo
else
    log_warning "Not a git repository (or not cloned yet)"
fi

# ============================================
# Step 3: Install/update dependencies
# ============================================

INSTALL_NEEDED=false

if [ ! -d "node_modules" ]; then
    log_warning "node_modules directory not found"
    INSTALL_NEEDED=true
elif [ "$FRESH_INSTALL" = true ]; then
    log_info "Fresh install requested - removing node_modules"
    rm -rf node_modules
    INSTALL_NEEDED=true
fi

if [ "$INSTALL_NEEDED" = true ]; then
    log_info "Installing dependencies..."
    npm install
    log_success "Dependencies installed"
    REBUILD_NEEDED=true
    echo
fi

# ============================================
# Step 4: Check if rebuild is needed
# ============================================

if [ "$FRESH_INSTALL" = true ] && [ "$INSTALL_NEEDED" = false ]; then
    REBUILD_NEEDED=true
fi

# Check if there are uncommitted changes in source files (for development)
if [ ! -f ".last-build-check" ]; then
    REBUILD_NEEDED=true
fi

# ============================================
# Step 5: Build
# ============================================

if [ "$REBUILD_NEEDED" = true ] || [ "$FRESH_INSTALL" = true ]; then
    log_info "Building application..."
    npm run build
    log_success "Build completed"
    touch .last-build-check
    echo
fi

# ============================================
# Step 6: Start the application
# ============================================

echo
log_success "=========================================="

if [ "$DEV_MODE" = true ]; then
    log_info "Starting in DEVELOPMENT mode..."
    log_info "Open http://localhost:3003 in your browser"
    log_info "Default credentials: admin / admin"
    echo
    npm run dev
else
    log_info "Starting in PRODUCTION mode..."
    log_info "Open http://localhost:3003 in your browser"
    log_info "Default credentials: admin / admin"
    echo
    npm run start
fi
