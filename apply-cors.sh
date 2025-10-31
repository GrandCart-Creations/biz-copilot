#!/bin/bash

# Script to apply CORS configuration to Firebase Storage bucket
# This fixes file upload issues by allowing cross-origin requests

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Applying CORS configuration to Firebase Storage...${NC}\n"

# Firebase Storage bucket name (correct bucket)
BUCKET="expense-tracker-prod-475813.firebasestorage.app"

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo -e "${RED}Error: gsutil is not installed.${NC}"
    echo -e "${YELLOW}Please install Google Cloud SDK:${NC}"
    echo "  https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated with gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}You need to authenticate with Google Cloud first.${NC}"
    echo "Running: gcloud auth login"
    gcloud auth login
fi

# Check if cors.json exists
if [ ! -f "cors.json" ]; then
    echo -e "${RED}Error: cors.json file not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found cors.json"
echo -e "${GREEN}✓${NC} gsutil is installed"
echo -e "${GREEN}✓${NC} Authenticated with Google Cloud\n"

# Display current CORS configuration
echo -e "${YELLOW}Current CORS configuration:${NC}"
gsutil cors get gs://${BUCKET} 2>&1 || echo "No CORS configuration found (this is normal if CORS was never set)"

echo -e "\n${YELLOW}Applying new CORS configuration from cors.json...${NC}"

# Apply CORS configuration
if gsutil cors set cors.json gs://${BUCKET}; then
    echo -e "\n${GREEN}✓ Success! CORS configuration has been applied.${NC}"
    echo -e "\n${YELLOW}Verifying CORS configuration:${NC}"
    gsutil cors get gs://${BUCKET}
    echo -e "\n${GREEN}CORS configuration complete!${NC}"
    echo -e "${YELLOW}Note: CORS changes may take a few minutes to propagate.${NC}"
    echo -e "${YELLOW}Try uploading a file in your app after waiting 1-2 minutes.${NC}"
else
    echo -e "\n${RED}✗ Error applying CORS configuration.${NC}"
    echo -e "${YELLOW}Please check:${NC}"
    echo "  1. You have permissions to modify the storage bucket"
    echo "  2. The bucket name is correct: ${BUCKET}"
    echo "  3. cors.json is valid JSON"
    exit 1
fi

