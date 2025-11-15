/**
 * EXPIRATION MONITORING SYSTEM
 * 
 * Monitors and generates notifications for:
 * - Contract expirations
 * - Domain expirations
 * - Subscription renewals
 * - Payment due dates
 * - Budget alerts
 * - Invoice due dates
 */

import { 
  getCompanyContracts, 
  getCompanyInvoices, 
  getCompanySubscriptions,
  createCompanyNotification,
  getCompanyNotifications
} from '../firebase';

// Note: getCompanySubscriptions should be available from firebase.js
// If not, we'll need to add it

/**
 * Check for expiring contracts and create notifications
 */
export const checkContractExpirations = async (companyId, userId = null) => {
  try {
    const contracts = await getCompanyContracts(companyId);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const notifications = [];

    for (const contract of contracts) {
      if (!contract.endDate || contract.status === 'expired' || contract.status === 'cancelled') {
        continue;
      }

      const endDate = contract.endDate?.toDate ? contract.endDate.toDate() : new Date(contract.endDate);
      const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      // Check if already notified (avoid duplicates)
      const existingNotifications = await getCompanyNotifications(companyId, {
        userId: userId,
        limit: 100
      });
      const alreadyNotified = existingNotifications.some(n => 
        n.type === 'contract_expiration' && 
        n.metadata?.contractId === contract.id &&
        !n.read
      );

      if (alreadyNotified) continue;

      if (daysUntilExpiry <= 0) {
        // Contract expired
        notifications.push({
          type: 'contract_expiration',
          title: `Contract Expired: ${contract.name || contract.reference || 'Unnamed Contract'}`,
          message: `The contract "${contract.name || contract.reference}" expired on ${endDate.toLocaleDateString()}. Please review and renew if needed.`,
          userId: userId,
          priority: 'urgent',
          actionUrl: `/settings?tab=contracts&contract=${contract.id}`,
          metadata: {
            contractId: contract.id,
            contractName: contract.name,
            expiredDate: endDate.toISOString(),
            daysOverdue: Math.abs(daysUntilExpiry)
          }
        });
      } else if (daysUntilExpiry <= 7) {
        // Expiring within 7 days
        notifications.push({
          type: 'contract_expiration',
          title: `Contract Expiring Soon: ${contract.name || contract.reference || 'Unnamed Contract'}`,
          message: `The contract "${contract.name || contract.reference}" expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} (${endDate.toLocaleDateString()}).`,
          userId: userId,
          priority: 'high',
          actionUrl: `/settings?tab=contracts&contract=${contract.id}`,
          metadata: {
            contractId: contract.id,
            contractName: contract.name,
            expiryDate: endDate.toISOString(),
            daysUntilExpiry
          }
        });
      } else if (daysUntilExpiry <= 30) {
        // Expiring within 30 days
        notifications.push({
          type: 'contract_expiration',
          title: `Contract Expiring: ${contract.name || contract.reference || 'Unnamed Contract'}`,
          message: `The contract "${contract.name || contract.reference}" expires in ${daysUntilExpiry} days (${endDate.toLocaleDateString()}).`,
          userId: userId,
          priority: 'normal',
          actionUrl: `/settings?tab=contracts&contract=${contract.id}`,
          metadata: {
            contractId: contract.id,
            contractName: contract.name,
            expiryDate: endDate.toISOString(),
            daysUntilExpiry
          }
        });
      }
    }

    // Create notifications
    for (const notification of notifications) {
      await createCompanyNotification(companyId, notification);
    }

    return notifications.length;
  } catch (error) {
    console.error('Error checking contract expirations:', error);
    return 0;
  }
};

/**
 * Check for overdue invoices and create notifications
 */
export const checkOverdueInvoices = async (companyId, userId = null) => {
  try {
    const invoices = await getCompanyInvoices(companyId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications = [];
    const overdueInvoices = invoices.filter(inv => {
      if (inv.status === 'paid') return false;
      if (!inv.dueDate) return false;
      const dueDate = inv.dueDate?.toDate ? inv.dueDate.toDate() : new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });

    // Check if already notified
    const existingNotifications = await getCompanyNotifications(companyId, {
      userId: userId,
      limit: 100
    });

    for (const invoice of overdueInvoices) {
      const dueDate = invoice.dueDate?.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate);
      const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));

      const alreadyNotified = existingNotifications.some(n => 
        n.type === 'overdue_invoice' && 
        n.metadata?.invoiceId === invoice.id &&
        !n.read &&
        // Only notify again if significantly more overdue (every 7 days)
        (daysOverdue % 7 === 0 || daysOverdue <= 7)
      );

      if (alreadyNotified && daysOverdue % 7 !== 0 && daysOverdue > 7) continue;

      notifications.push({
        type: 'overdue_invoice',
        title: `Overdue Invoice: ${invoice.invoiceNumber || invoice.id}`,
        message: `Invoice ${invoice.invoiceNumber || invoice.id} for €${parseFloat(invoice.total || 0).toLocaleString()} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.`,
        userId: userId,
        priority: daysOverdue > 30 ? 'urgent' : daysOverdue > 14 ? 'high' : 'normal',
        actionUrl: `/modules/invoices?invoice=${invoice.id}`,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.total,
          daysOverdue,
          dueDate: dueDate.toISOString()
        }
      });
    }

    // Create notifications
    for (const notification of notifications) {
      await createCompanyNotification(companyId, notification);
    }

    return notifications.length;
  } catch (error) {
    console.error('Error checking overdue invoices:', error);
    return 0;
  }
};

/**
 * Check for subscription renewals
 */
export const checkSubscriptionRenewals = async (companyId, userId = null) => {
  try {
    const subscriptions = await getCompanySubscriptions(companyId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const notifications = [];
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active' && sub.autoRenew);

    // Check if already notified
    const existingNotifications = await getCompanyNotifications(companyId, {
      userId: userId,
      limit: 100
    });

    for (const subscription of activeSubscriptions) {
      if (!subscription.nextBillingDate) continue;

      const nextBilling = subscription.nextBillingDate?.toDate ? subscription.nextBillingDate.toDate() : new Date(subscription.nextBillingDate);
      nextBilling.setHours(0, 0, 0, 0);
      const daysUntilRenewal = Math.ceil((nextBilling - today) / (1000 * 60 * 60 * 24));

      if (daysUntilRenewal < 0 || daysUntilRenewal > 7) continue;

      const alreadyNotified = existingNotifications.some(n => 
        n.type === 'subscription_renewal' && 
        n.metadata?.subscriptionId === subscription.id &&
        !n.read
      );

      if (alreadyNotified) continue;

      notifications.push({
        type: 'subscription_renewal',
        title: `Subscription Renewal: ${subscription.planName || 'Subscription'}`,
        message: `The subscription "${subscription.planName || 'Subscription'}" will renew in ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? 's' : ''} (${nextBilling.toLocaleDateString()}) for €${parseFloat(subscription.amount || 0).toLocaleString()}.`,
        userId: userId,
        priority: daysUntilRenewal <= 1 ? 'high' : 'normal',
        actionUrl: `/modules/invoices?tab=subscriptions&subscription=${subscription.id}`,
        metadata: {
          subscriptionId: subscription.id,
          planName: subscription.planName,
          amount: subscription.amount,
          nextBillingDate: nextBilling.toISOString(),
          daysUntilRenewal
        }
      });
    }

    // Create notifications
    for (const notification of notifications) {
      await createCompanyNotification(companyId, notification);
    }

    return notifications.length;
  } catch (error) {
    console.error('Error checking subscription renewals:', error);
    return 0;
  }
};

/**
 * Run all expiration checks
 */
export const runExpirationChecks = async (companyId, userId = null) => {
  try {
    const results = {
      contracts: 0,
      invoices: 0,
      subscriptions: 0,
      total: 0
    };

    results.contracts = await checkContractExpirations(companyId, userId);
    results.invoices = await checkOverdueInvoices(companyId, userId);
    results.subscriptions = await checkSubscriptionRenewals(companyId, userId);
    results.total = results.contracts + results.invoices + results.subscriptions;

    return results;
  } catch (error) {
    console.error('Error running expiration checks:', error);
    return { contracts: 0, invoices: 0, subscriptions: 0, total: 0 };
  }
};

