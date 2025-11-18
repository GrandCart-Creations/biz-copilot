#!/bin/bash
# Deployment Verification Script
# Verifies that all required configurations are in place before deployment

set -e

echo "🔍 Biz-CoPilot Deployment Verification"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check if .env file exists
echo "📋 Checking environment variables..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo "   Create .env from .env.example and fill in your Firebase credentials"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Check if dist folder exists
echo ""
echo "📦 Checking build output..."
if [ ! -d dist ]; then
    echo -e "${RED}❌ dist folder not found${NC}"
    echo "   Run 'npm run build' first"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ dist folder exists${NC}"
    
    # Check if index.html exists in dist
    if [ ! -f dist/index.html ]; then
        echo -e "${RED}❌ dist/index.html not found${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ dist/index.html exists${NC}"
    fi
fi

# Check Firebase configuration
echo ""
echo "🔥 Checking Firebase configuration..."
if [ ! -f firebase.json ]; then
    echo -e "${RED}❌ firebase.json not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ firebase.json exists${NC}"
    
    # Check if public directory is set to dist
    if grep -q '"public": "dist"' firebase.json; then
        echo -e "${GREEN}✅ Firebase hosting public directory is 'dist'${NC}"
    else
        echo -e "${RED}❌ Firebase hosting public directory is not 'dist'${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check if Firebase CLI is installed
echo ""
echo "🛠️  Checking Firebase CLI..."
if command -v firebase &> /dev/null; then
    echo -e "${GREEN}✅ Firebase CLI is installed${NC}"
    
    # Check if logged in
    if firebase projects:list &> /dev/null; then
        echo -e "${GREEN}✅ Firebase CLI is authenticated${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Firebase CLI may not be authenticated${NC}"
        echo "   Run 'firebase login' if needed"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ Firebase CLI is not installed${NC}"
    echo "   Install with: npm install -g firebase-tools"
    ERRORS=$((ERRORS + 1))
fi

# Check Node.js version
echo ""
echo "📌 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✅ Node.js version is compatible (v${NODE_VERSION})${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Node.js version may be too old (v${NODE_VERSION})${NC}"
    echo "   Recommended: Node.js 18+"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "======================================"
echo "📊 Verification Summary"
echo "======================================"
echo -e "${GREEN}✅ Checks passed: $((10 - ERRORS - WARNINGS))${NC}"
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
fi
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Errors: $ERRORS${NC}"
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All checks passed! Ready to deploy.${NC}"
echo ""
echo "To deploy, run:"
echo "  npm run deploy        # Deploy hosting only"
echo "  npm run deploy:all    # Build and deploy everything"
echo ""

