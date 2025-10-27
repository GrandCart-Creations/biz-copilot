#!/bin/bash

# BizPilot Security Implementation - Quick Start Script
# Run this to start testing your security features

echo "🛡️  BizPilot Security - Quick Start"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔥 Starting development server..."
echo ""
echo "The app will be available at: http://localhost:5173"
echo ""
echo "🧪 Testing Instructions:"
echo "  1. Open http://localhost:5173/login in your browser"
echo "  2. Try logging in with invalid email (e.g., 'test@invalid')"
echo "  3. Try 5 failed login attempts to test account lockout"
echo "  4. Login successfully and navigate to:"
echo "     - /security/dashboard (Security Dashboard)"
echo "     - /settings/mfa (MFA Setup)"
echo ""
echo "📚 Full testing guide: See DEPLOYMENT_GUIDE.md"
echo ""

npm run dev
