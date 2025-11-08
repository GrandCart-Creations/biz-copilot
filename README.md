# 🚀 Biz-CoPilot

**Your Business Co-Pilot, Every Step of the Way**

Biz-CoPilot is an intelligent business management platform designed specifically for Benelux entrepreneurs and small businesses. We provide enterprise-grade security, intelligent automation, and side-by-side assistance to help you manage every aspect of your business.

## ✨ Features

### 💼 **Business Management**
- **Multi-Account Management** - Separate business and personal expenses
- **Expense Tracking** - Comprehensive expense management with categories, vendors, and BTW rates
- **Invoice Management** - Create, send, and track invoices (coming soon)
- **Customer Management** - Manage customer relationships (coming soon)

### 🔒 **Enterprise Security**
- **Multi-Factor Authentication (MFA)** - TOTP-based 2FA for enhanced security
- **Audit Logging** - Complete audit trail of all activities
- **Session Management** - Secure session handling with automatic timeout
- **Account Protection** - Brute-force protection and account lockout
- **Role-Based Access Control** - User permissions and roles

### 📊 **Smart Features**
- **BTW Compliance** - Built for Benelux tax requirements (0%, 9%, 21%)
- **Real-time Analytics** - Dashboard with insights and reports
- **Data Export** - Export to CSV, PDF, and Excel
- **Intelligent Automation** - Smart categorization and suggestions
- **Multi-Device Sync** - Access from anywhere with real-time sync

## 🛠️ Technology Stack

- **Frontend**: React 19 + Vite
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **Styling**: Tailwind CSS
- **Security**: TOTP MFA, Audit Logs, Session Management
- **Icons**: React Icons, Lucide React

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ installed
- Firebase project set up
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GrandCartCreations/biz-copilot.git
   cd biz-copilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 📚 Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - System architecture and design decisions
- **[Security Implementation](./SECURITY_IMPLEMENTATION.md)** - Security features and best practices
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - How to deploy to production
- **[Testing Summary](./TESTING_SUMMARY.md)** - Testing strategies and results

## 🔐 Security Features

Biz-CoPilot implements enterprise-grade security:

- ✅ **Multi-Factor Authentication (MFA)** with TOTP
- ✅ **Audit Logging** - All user actions tracked
- ✅ **Session Management** - 30-minute timeout
- ✅ **Brute-Force Protection** - Account lockout after failed attempts
- ✅ **Firestore Security Rules** - Database-level protection
- ✅ **Data Validation** - Input sanitization and validation

## 🌐 Deployment

Biz-CoPilot is optimized for Firebase Hosting:

```bash
# Deploy to production
npm run build
firebase deploy
```

Visit your app at: `https://biz-copilot.nl`

## 📝 License

Copyright © 2025 GrandCart Creations. All rights reserved.

Built with ❤️ for Benelux entrepreneurs.

---

## 🤝 Support

For support, feature requests, or bug reports, please contact:
- Website: [https://biz-copilot.nl](https://biz-copilot.nl)
- Email: support@biz-copilot.nl

---

**Biz-CoPilot** - *Intelligent Business Operations, Together*
