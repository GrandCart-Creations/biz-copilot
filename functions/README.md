# Cloud Functions for Biz-CoPilot

This directory contains Firebase Cloud Functions for Biz-CoPilot.

## Available Functions

- **`sendInvitationEmail`**: Automatically sends invitation emails when a new team invitation is created in Firestore.

## Setup

See `EMAIL_SETUP_GUIDE.md` in the root directory for complete setup instructions.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables (see EMAIL_SETUP_GUIDE.md)

3. Deploy:
   ```bash
   firebase deploy --only functions
   ```

## Local Development

1. Start Firebase emulators:
   ```bash
   firebase emulators:start
   ```

2. Test functions locally by triggering Firestore events

