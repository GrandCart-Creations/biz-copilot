# Enhanced Financial Tracking Implementation Plan

## 📊 Current State Analysis

### What We Have ✅

1. **Expense Tracking:**
   - Location: `companies/{companyId}/expenses/{expenseId}`
   - Current Fields: `date`, `category`, `vendor`, `amount`, `btw`, `description`, `bankAccount` (string dropdown), `paymentMethod` (string dropdown)
   - UI: Clean form with file upload, filters, list view
   - Security: Role-based access control

2. **Company Structure:**
   - `companies/{companyId}` collection
   - `companies/{companyId}/users/{userId}` for team members
   - Company selector UI
   - Clean, modular design

### What We Need to Add 🎯

1. **Financial Accounts System:**
   - Dedicated accounts collection
   - Link expenses/income to accounts
   - Account balance tracking
   - Multiple account types (bank, credit card, cash, investment, loan)

2. **Income Module:**
   - New income collection
   - Similar structure to expenses
   - Link to financial accounts
   - Integration with expenses for P&L

3. **Funding & Investment Tracking:**
   - Seed funding tracking
   - Investor management
   - Agreement/terms storage
   - Link funding to accounts

---

## 🏗️ Proposed Data Model (Firestore)

### 1. Financial Accounts Collection
**Path:** `companies/{companyId}/financialAccounts/{accountId}`

```javascript
{
  name: "Main Business Checking",           // e.g., "ING Business Account"
  type: "bank" | "credit_card" | "cash" | "investment" | "loan" | "other",
  currency: "EUR",
  initialBalance: 10000,
  currentBalance: 8500,                     // Auto-updated via transactions
  linkedTo: ["expenses", "income"],         // Which modules use this account
  
  // Bank Account Details (if type === "bank")
  bankName: "ING",
  accountNumber: "NL**INGB****1234",       // Masked
  iban: "NL91ABNA0417164300",              // Optional
  swift: "INGBNL2A",                       // Optional
  
  // Card Details (if type === "credit_card")
  cardLastFour: "4321",
  cardType: "Visa" | "Mastercard" | "Amex",
  cardHolderName: "Biz-CoPilot",
  expiryDate: "2026-12",                   // Optional
  
  // Metadata
  description: "Primary operating account",
  isActive: true,
  createdAt: timestamp,
  createdBy: userId,
  updatedAt: timestamp
}
```

### 2. Enhanced Expense Document
**Path:** `companies/{companyId}/expenses/{expenseId}`

**Add New Field:**
```javascript
{
  // Existing fields...
  financialAccountId: "accountId123",      // NEW: Link to financialAccounts
  // Keep existing bankAccount (string) for backward compatibility during migration
  // Keep existing paymentMethod (string) for backward compatibility
}
```

### 3. New Income Collection
**Path:** `companies/{companyId}/income/{incomeId}`

```javascript
{
  date: "2025-01-15",
  source: "Client Payment" | "Investment Return" | "Loan Disbursement" | "Grant" | "Other",
  customer: "Client Name",                  // Who paid
  description: "Consulting services Q1 2025",
  amount: 5000.00,
  currency: "EUR",
  btw: 21,                                  // VAT rate
  
  // NEW: Account Linking
  financialAccountId: "accountId123",      // Where income was deposited
  
  // Optional
  invoiceId: "invoice123",                 // Future: link to invoices
  transactionId: "TXN-ABC-123",            // For bank reconciliation
  reconciled: false,
  
  // Metadata
  category: "Service Revenue" | "Product Sales" | "Investment" | "Other",
  notes: "",
  attachments: ["fileUrl1", "fileUrl2"],    // Receipts/invoices
  createdBy: userId,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 4. Funding Sources Collection
**Path:** `companies/{companyId}/funding/{fundingId}`

```javascript
{
  type: "seed_fund" | "angel_investor" | "vc_round" | "bank_loan" | "grant" | "personal_loan",
  name: "Seed Round 1",                     // or "John Investor", "ING Bank Loan"
  
  // Investment Details
  amount: 50000,
  currency: "EUR",
  dateReceived: "2025-01-15",
  equityPercentage: 15,                     // If applicable
  interestRate: 4.2,                       // If loan
  
  // Account Linking
  financialAccountId: "accountId123",      // Where funds were deposited
  
  // Agreement/Terms
  agreementUrl: "storage/contracts/seed-agreement.pdf",
  agreementType: "Term Sheet" | "SAFE" | "Loan Agreement" | "Grant Agreement",
  signedDate: "2025-01-10",
  
  // Investor Details (if type is investor-related)
  investorContact: {
    name: "Jane Investor",
    email: "jane@investor.com",
    phone: "+31612345678"
  },
  
  // Terms
  terms: "5% equity, convertible note, board seat",
  restrictions: "No restrictions",
  maturityDate: "2030-01-15",              // If applicable
  
  // Status
  status: "active" | "repaid" | "converted",
  
  // Metadata
  notes: "",
  createdBy: userId,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 5. Investors Collection (Detailed Tracking)
**Path:** `companies/{companyId}/investors/{investorId}`

```javascript
{
  name: "Jane Angel Investor",
  type: "Angel" | "VC" | "Family" | "Friend",
  
  // Investment History
  totalInvested: 100000,
  currency: "EUR",
  investments: [
    {
      fundingId: "funding123",              // Link to funding collection
      amount: 100000,
      date: "2025-03-01",
      equityOwned: 15
    }
  ],
  
  // Rights & Governance
  boardSeat: true,
  votingRights: true,
  equityPercentage: 15,
  
  // Contact
  contact: {
    name: "Jane Investor",
    email: "jane@investor.com",
    phone: "+31612345678"
  },
  
  // Documents
  documents: [
    {
      type: "Term Sheet",
      url: "storage/term-sheet.pdf",
      date: "2025-02-15"
    },
    {
      type: "Shareholder Agreement",
      url: "storage/shareholder-agreement.pdf",
      date: "2025-03-01"
    }
  ],
  
  // Communications Log
  communications: [
    {
      date: "2025-04-01",
      type: "Monthly Update",
      summary: "Q1 performance update",
      documentUrl: "storage/updates/q1-2025.pdf"
    }
  ],
  
  // Metadata
  notes: "Lead investor, strategic advisor",
  createdBy: userId,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 🎨 UI/UX Implementation Strategy

### Phase 1: Financial Accounts Management (Week 1)

**1.1 New Settings Section: "Financial Accounts"**
- **Location:** Settings → Financial Accounts tab
- **Components:**
  - `FinancialAccountsList.jsx`: Table view of all accounts
  - `FinancialAccountForm.jsx`: Modal for add/edit
  - `AccountBalanceWidget.jsx`: Shows current balance for each account

**1.2 Update Expense Form**
- Replace `bankAccount` dropdown with `FinancialAccountSelect` component
- Filter accounts by `linkedTo: ["expenses"]`
- Show account balance when selected

**1.3 Update Income Form** (New)
- Similar structure to Expense form
- Include `FinancialAccountSelect` for income deposits
- Filter accounts by `linkedTo: ["income"]`

### Phase 2: Income Module (Week 2)

**2.1 Income Tracker Component**
- **Location:** New `/modules/income` route
- **Components:**
  - `IncomeTracker.jsx`: Main component (mirror ExpenseTracker structure)
  - `IncomeForm.jsx`: Add/edit income modal
  - `IncomeList.jsx`: Table view with filters
  - `IncomeStats.jsx`: Dashboard widgets

**2.2 Navigation Update**
- Add "Income" link to main navigation
- Add to module dashboard

### Phase 3: Funding & Investors (Week 3)

**3.1 Funding Management**
- **Location:** Settings → Funding & Investors tab
- **Components:**
  - `FundingList.jsx`: List of all funding sources
  - `FundingForm.jsx`: Add seed fund, investor, loan
  - `FundingDetails.jsx`: View individual funding details

**3.2 Investor Management**
- **Location:** Settings → Funding & Investors tab → Investors section
- **Components:**
  - `InvestorsList.jsx`: List of investors
  - `InvestorProfile.jsx`: Detailed investor view
  - `InvestorForm.jsx`: Add/edit investor
  - `DocumentManager.jsx`: Upload/manage agreements

### Phase 4: Reporting & Integration (Week 4)

**4.1 Enhanced Dashboard**
- Add financial overview widgets
- Show account balances
- P&L calculation (Income - Expenses)
- Funding summary

**4.2 Reports Module Enhancement**
- Filter expenses/income by account
- Account-based cash flow reports
- Funding timeline visualization

---

## 🔧 Technical Implementation Details

### 1. Backend Functions (src/firebase.js)

```javascript
// Financial Accounts CRUD
export const getCompanyFinancialAccounts = async (companyId) => { /* ... */ };
export const addFinancialAccount = async (companyId, accountData) => { /* ... */ };
export const updateFinancialAccount = async (companyId, accountId, accountData) => { /* ... */ };
export const deleteFinancialAccount = async (companyId, accountId) => { /* ... */ };
export const updateAccountBalance = async (companyId, accountId, amount, type) => { /* ... */ }; // type: 'income' | 'expense'

// Income CRUD
export const getCompanyIncome = async (companyId) => { /* ... */ };
export const addCompanyIncome = async (companyId, userId, incomeData) => { /* ... */ };
export const updateCompanyIncome = async (companyId, incomeId, incomeData) => { /* ... */ };
export const deleteCompanyIncome = async (companyId, incomeId) => { /* ... */ };

// Funding CRUD
export const getCompanyFunding = async (companyId) => { /* ... */ };
export const addFunding = async (companyId, userId, fundingData) => { /* ... */ };
export const updateFunding = async (companyId, fundingId, fundingData) => { /* ... */ };
export const deleteFunding = async (companyId, fundingId) => { /* ... */ };

// Investors CRUD
export const getCompanyInvestors = async (companyId) => { /* ... */ };
export const addInvestor = async (companyId, userId, investorData) => { /* ... */ };
export const updateInvestor = async (companyId, investorId, investorData) => { /* ... */ };
export const deleteInvestor = async (companyId, investorId) => { /* ... */ };
```

### 2. Balance Update Logic

When an expense is added:
```javascript
// Auto-update account balance
if (expenseData.financialAccountId) {
  await updateAccountBalance(
    companyId, 
    expenseData.financialAccountId, 
    -expenseData.amount,  // Negative for expense
    'expense'
  );
}
```

When income is added:
```javascript
// Auto-update account balance
if (incomeData.financialAccountId) {
  await updateAccountBalance(
    companyId,
    incomeData.financialAccountId,
    incomeData.amount,  // Positive for income
    'income'
  );
}
```

### 3. Firestore Security Rules Update

```javascript
// Financial Accounts
match /companies/{companyId}/financialAccounts/{accountId} {
  allow read: if isCompanyMember(companyId);
  allow create, update, delete: if isOwner(companyId) || hasRole(companyId, ['manager']);
}

// Income
match /companies/{companyId}/income/{incomeId} {
  allow read: if isCompanyMember(companyId);
  allow create, update, delete: if isCompanyMember(companyId) && 
    (isOwner(companyId) || hasRole(companyId, ['manager', 'employee']));
}

// Funding
match /companies/{companyId}/funding/{fundingId} {
  allow read: if isCompanyMember(companyId);
  allow create, update, delete: if isOwner(companyId) || hasRole(companyId, ['manager']);
}

// Investors
match /companies/{companyId}/investors/{investorId} {
  allow read: if isCompanyMember(companyId) && 
    (isOwner(companyId) || hasRole(companyId, ['manager', 'accountant']));
  allow create, update, delete: if isOwner(companyId) || hasRole(companyId, ['manager']);
}
```

---

## 🚀 Migration Strategy (Non-Breaking)

### Step 1: Add Financial Accounts (No Breaking Changes)
1. Create `financialAccounts` collection
2. Add default accounts via UI (migration optional)
3. No changes to existing expenses yet

### Step 2: Enhance Expense Form (Backward Compatible)
1. Add `FinancialAccountSelect` component
2. Keep existing `bankAccount` field for backward compatibility
3. When user selects account, populate both `financialAccountId` and `bankAccount`
4. Existing expenses continue to work

### Step 3: Add Income Module (New Feature)
1. Create new income collection
2. Build income UI (mirror expenses)
3. No impact on existing expenses

### Step 4: Add Funding/Investors (New Feature)
1. Create funding and investors collections
2. Build UI in Settings
3. No impact on existing features

### Step 5: Migration Script (Optional, Future)
- Script to link existing expenses to accounts based on `bankAccount` string
- Can run when convenient, not blocking

---

## ✅ Implementation Checklist

### Week 1: Financial Accounts
- [ ] Create `FinancialAccountsList` component
- [ ] Create `FinancialAccountForm` modal
- [ ] Add Settings tab for Financial Accounts
- [ ] Create Firebase functions for accounts CRUD
- [ ] Update Firestore rules for accounts
- [ ] Create `FinancialAccountSelect` component
- [ ] Update Expense form to use account selector
- [ ] Test account creation and linking

### Week 2: Income Module
- [ ] Create `IncomeTracker` component (mirror ExpenseTracker)
- [ ] Create `IncomeForm` modal
- [ ] Create Firebase functions for income CRUD
- [ ] Update Firestore rules for income
- [ ] Add Income route to navigation
- [ ] Add Income to module dashboard
- [ ] Implement account linking in income
- [ ] Test income creation and listing

### Week 3: Funding & Investors
- [ ] Create `FundingList` component
- [ ] Create `FundingForm` modal
- [ ] Create `InvestorsList` component
- [ ] Create `InvestorProfile` component
- [ ] Create Firebase functions for funding/investors CRUD
- [ ] Update Firestore rules
- [ ] Add document upload for agreements
- [ ] Test funding and investor management

### Week 4: Integration & Polish
- [ ] Update dashboard with financial overview
- [ ] Add P&L calculation
- [ ] Update reports with account filtering
- [ ] Add balance update automation
- [ ] Test end-to-end flows
- [ ] Documentation

---

## 🎯 Design Principles (Maintained)

✅ **Modular Components:** Each feature in its own component
✅ **Consistent UI:** Reuse existing form patterns, buttons, modals
✅ **Clean Navigation:** Logical grouping (Settings tabs, module routes)
✅ **Progressive Disclosure:** Details in modals, not cluttering main views
✅ **Role-Based Access:** Financial data appropriately restricted
✅ **Backward Compatible:** Existing features continue to work

---

## 📝 Next Steps

1. **Start with Financial Accounts** - Foundation for everything else
2. **Build Income Module** - Complete the core financial tracking
3. **Add Funding/Investors** - Enhance company structure
4. **Integrate & Polish** - Bring it all together

Ready to start with Phase 1?

