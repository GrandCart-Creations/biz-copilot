# Biz-CoPilot Project Documentation

## Project Overview

**Biz-CoPilot** is a comprehensive business management platform designed specifically for Benelux entrepreneurs. The platform provides tools for expense tracking, financial management, and business insights to help entrepreneurs manage their businesses more effectively.

**Important**: This project was previously named `expense-tracker-app` but has been rebranded to `biz-copilot`. You may see references to the old name in some configuration files and comments.

**Domain**: [biz-copilot.nl](https://biz-copilot.nl)

## Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Backend/Database**: Firebase
  - Authentication
  - Firestore Database
  - Hosting
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **UI Components**: Headless UI
- **Icons**: Heroicons

## Branding & Design

- **Color Scheme**: Gradient branding from Indigo → Purple → Pink
- **Logo**: Professional Biz-CoPilot logo (located in `public/` and `src/assets/`)
- **Target Audience**: Benelux entrepreneurs and small business owners
- **Language**: Dutch (primary), with English for technical documentation

## Project Structure

```
biz-copilot/
├── public/               # Static assets
│   ├── logo-*.png       # Logo variants (light, dark, icon, with text)
│   └── favicon.ico      # Site favicon
├── src/
│   ├── assets/          # Images, fonts, and other assets
│   │   └── logo/        # Logo files for use in components
│   ├── components/      # React components
│   │   ├── landing/     # Landing page components
│   │   └── ...          # Other feature components
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles and Tailwind imports
├── firebase/            # Firebase configuration files
├── .firebaserc          # Firebase project aliases
├── firebase.json        # Firebase hosting configuration
└── package.json         # Dependencies and scripts
```

### Key Directories

- **`src/components/landing/`**: Landing page components for biz-copilot.nl
- **`src/assets/`**: Static assets used within React components
- **`public/`**: Publicly accessible static files
- **`firebase/`**: Firebase configuration and deployment settings

## Firebase Project Details

- **Project ID**: `expense-tracker-prod-475813`
- **Hosting URL**: `https://expense-tracker-prod-475813.web.app`
- **Custom Domain**: `biz-copilot.nl`

### Firebase Services Used

- **Authentication**: User authentication and authorization
- **Firestore**: NoSQL database for storing business data
- **Hosting**: Static site hosting for the web application

## Development Commands

### Local Development
```bash
npm run dev
```
Starts the Vite development server (usually on `http://localhost:5173`)

### Build for Production
```bash
npm run build
```
Creates an optimized production build in the `dist/` directory

### Preview Production Build
```bash
npm run preview
```
Locally preview the production build

### Deploy to Firebase
```bash
firebase deploy
```
Deploys the application to Firebase Hosting

### Deploy Hosting Only
```bash
firebase deploy --only hosting
```
Deploys only the hosting configuration (faster for frontend-only changes)

## Current Focus

**Landing Page Deployment**: The current priority is deploying the professional Dutch landing page to biz-copilot.nl. This includes:

- Professional branding with the new logo
- Dutch language content targeting entrepreneurs
- Clear value proposition and call-to-action
- Setup guides for getting started with the platform

## Recent Changes

Based on recent commits:
- Added professional Dutch landing page
- Replaced all placeholder icons with professional Biz-CoPilot logo
- Added setup guides and configuration documentation
- Completed logo and branding assets

## Important Notes

1. **Project Renaming**: The project was renamed from `expense-tracker-app` to `biz-copilot`. Some legacy references may still exist in:
   - Firebase project ID
   - Configuration files
   - Comments in code

2. **Branding Consistency**: Always use the gradient color scheme (Indigo → Purple → Pink) for brand consistency. The logo files are available in multiple formats and should be used consistently across the application.

3. **Target Market**: Content and features should be tailored for Benelux entrepreneurs. Keep the user experience simple and focused on business management needs.

4. **Firebase Configuration**: The Firebase project ID remains `expense-tracker-prod-475813` despite the rebranding. This is intentional to maintain deployment continuity.

## Getting Started for Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Firebase**: Ensure you have the correct Firebase configuration in your environment variables or configuration files.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Make Changes**: Edit files in `src/` directory. Vite will hot-reload changes automatically.

5. **Build and Deploy**:
   ```bash
   npm run build
   firebase deploy
   ```

## Support & Documentation

For Claude Code or AI assistant interactions, refer to this document to understand:
- Project context and history
- Current priorities and focus areas
- Technical stack and architecture
- Deployment procedures
- Branding guidelines

---

*Last Updated: 2025-10-29*
