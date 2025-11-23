# Account Routing Verification Report

## Overview
This document verifies that all Expense Tracker and Income Tracker transactions are correctly routed to and deducted/added from the appropriate financial accounts.

## Expense Tracker Flow

### 1. Expense Creation (`addCompanyExpense`)
- **Location**: `src/firebase.js:460`
- **Process**:
  1. Expense document is created in Firestore
  2. `createExpenseLedgerEntry` is called automatically
  3. Ledger entry ID is stored in expense document

### 2. Expense Ledger Entry Creation (`createExpenseLedgerEntry`)
- **Location**: `src/firebase.js:2449`
- **Logic**:
  - **If expense is PAID and has `financialAccountId`**:
    - **Debit**: Expense ledger account (category-based, e.g., "Expense • Subscriptions")
    - **Credit**: Financial account's ledger account (asset account, e.g., "Bank • ING Business Acc.")
    - **Financial Account Impact**: Balance DECREASES (money going out)
  
  - **If expense is NOT PAID**:
    - **Debit**: Expense ledger account
    - **Credit**: Accounts Payable (liability account)
    - **Financial Account Impact**: No direct impact (accrual accounting)

### 3. Financial Account Balance Update
- **Location**: `src/firebase.js:2151` (`computeFinancialAccountAdjustments`)
- **Calculation**: `delta = (debit - credit) * multiplier`
- **For Paid Expense**:
  - Debit = 0, Credit = amount
  - Delta = (0 - amount) = **-amount** ✓
  - Account balance: `currentBalance + (-amount)` = **decreased** ✓

- **Location**: `src/firebase.js:2384` (in `createLedgerEntry`)
- **Update**: `currentBalance = currentBalance + delta`
- **Transaction Safety**: Uses Firestore transactions to ensure atomicity

### 4. Expense Update (`updateCompanyExpense`)
- **Location**: `src/firebase.js:507`
- **Process**:
  1. If ledger-relevant fields change (amount, financialAccountId, paymentStatus), old ledger entry is reversed
  2. New ledger entry is created with updated data
  3. Financial account balance is automatically adjusted

## Income Tracker Flow

### 1. Income Creation (`addCompanyIncome`)
- **Location**: `src/firebase.js:3081`
- **Process**:
  1. Income document is created in Firestore
  2. `createIncomeLedgerEntry` is called automatically
  3. Ledger entry ID is stored in income document

### 2. Income Ledger Entry Creation (`createIncomeLedgerEntry`)
- **Location**: `src/firebase.js:2519`
- **Logic**:
  - **If income has `financialAccountId`**:
    - **Debit**: Financial account's ledger account (asset account, e.g., "Bank • ING Business Acc.")
    - **Credit**: Revenue ledger account (category-based, e.g., "Revenue • Service Revenue")
    - **Financial Account Impact**: Balance INCREASES (money coming in)
  
  - **If income has NO `financialAccountId`**:
    - **Debit**: Accounts Receivable (asset account)
    - **Credit**: Revenue ledger account
    - **Financial Account Impact**: No direct impact (accrual accounting)

### 3. Financial Account Balance Update
- **Location**: `src/firebase.js:2151` (`computeFinancialAccountAdjustments`)
- **Calculation**: `delta = (debit - credit) * multiplier`
- **For Income with Account**:
  - Debit = amount, Credit = 0
  - Delta = (amount - 0) = **+amount** ✓
  - Account balance: `currentBalance + (+amount)` = **increased** ✓

- **Location**: `src/firebase.js:2384` (in `createLedgerEntry`)
- **Update**: `currentBalance = currentBalance + delta`
- **Transaction Safety**: Uses Firestore transactions to ensure atomicity

### 4. Income Update (`updateCompanyIncome`)
- **Location**: `src/firebase.js:3138`
- **Process**:
  1. If ledger-relevant fields change (amount, financialAccountId, category), old ledger entry is reversed
  2. New ledger entry is created with updated data
  3. Financial account balance is automatically adjusted

## Invoice Payment Flow

### 1. Invoice Marked as Paid (`updateCompanyInvoice`)
- **Location**: `src/firebase.js:4139`
- **Process**:
  1. When invoice status changes from unpaid to paid AND has `financialAccountId`:
  2. Income record is automatically created
  3. `createIncomeLedgerEntry` is called for the income record
  4. Financial account balance is increased (same as income flow above)

## Verification Checklist

### ✅ Expense Routing
- [x] Paid expenses with financial account → Account balance decreases
- [x] Unpaid expenses → No account impact (accrual)
- [x] Expense updates → Old entry reversed, new entry created
- [x] Expense deletion → Ledger entry reversed

### ✅ Income Routing
- [x] Income with financial account → Account balance increases
- [x] Income without financial account → No account impact (accrual)
- [x] Income updates → Old entry reversed, new entry created
- [x] Income deletion → Ledger entry reversed

### ✅ Invoice Payment Routing
- [x] Invoice marked as paid → Income record created
- [x] Income record → Account balance increases
- [x] Ledger entry created for both income and invoice

### ✅ Transaction Safety
- [x] All ledger entries use Firestore transactions
- [x] Financial account balance updates are atomic
- [x] Ledger account balance updates are atomic
- [x] Reversals properly undo previous entries

## Account Balance Calculation Formula

For each transaction:
```
delta = (debit - credit) * multiplier
newBalance = currentBalance + delta
```

**Examples:**
- **Paid Expense (€100)**: delta = (0 - 100) = -100 → Balance decreases by €100 ✓
- **Income (€500)**: delta = (500 - 0) = +500 → Balance increases by €500 ✓
- **Reversal**: multiplier = -1 → delta is negated → Previous entry is undone ✓

## Conclusion

✅ **All transactions are correctly routed to and deducted/added from the appropriate financial accounts.**

The system uses double-entry bookkeeping principles:
- Expenses debit expense accounts and credit asset/liability accounts
- Income debits asset/receivable accounts and credits revenue accounts
- Financial account balances are automatically updated via ledger entries
- All updates are atomic and transaction-safe

## Testing Recommendations

1. **Test Paid Expense**:
   - Create expense with paymentStatus="paid" and financialAccountId
   - Verify account balance decreases by expense amount
   - Check ledger entry shows correct debit/credit

2. **Test Income**:
   - Create income with financialAccountId
   - Verify account balance increases by income amount
   - Check ledger entry shows correct debit/credit

3. **Test Invoice Payment**:
   - Mark invoice as paid with financialAccountId
   - Verify income record is created
   - Verify account balance increases by invoice total
   - Check ledger entries are created

4. **Test Updates**:
   - Update expense amount or payment status
   - Verify old ledger entry is reversed
   - Verify new ledger entry is created
   - Verify account balance reflects changes

5. **Test Reversals**:
   - Delete expense or income
   - Verify ledger entry is reversed
   - Verify account balance is restored

