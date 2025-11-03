#!/bin/bash
# Firebase Secrets Setup for SendGrid Email Integration
# Run this script and enter your SendGrid API key when prompted

echo "🔐 Setting up Firebase Secrets for SendGrid Email Integration"
echo ""
echo "You will be prompted to enter your SendGrid API key securely."
echo "Get it from: SendGrid Dashboard → Settings → API Keys"
echo ""
echo "Press Enter to continue..."
read

# Set SENDGRID_API_KEY (will prompt for value)
echo "📝 Step 1/3: Setting SENDGRID_API_KEY"
echo "Please paste your SendGrid API key (starts with SG.) and press Enter:"
firebase functions:secrets:set SENDGRID_API_KEY

# Set SENDGRID_FROM_EMAIL (no prompt needed)
echo ""
echo "📝 Step 2/3: Setting SENDGRID_FROM_EMAIL"
echo "g.carter@biz-copilot.nl" | firebase functions:secrets:set SENDGRID_FROM_EMAIL

# Set APP_URL (no prompt needed for localhost)
echo ""
echo "📝 Step 3/3: Setting APP_URL"
echo "http://localhost:5173" | firebase functions:secrets:set APP_URL

echo ""
echo "✅ All secrets have been set successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy the Cloud Function: firebase deploy --only functions"
echo "2. Test by creating an invitation in your app"

