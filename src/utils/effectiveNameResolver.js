/**
 * Centralized effective name resolution for transactions.
 * 
 * This module consolidates the duplicated getEffectiveName logic from various
 * components (Subscriptions.jsx, SplitChargesModal.jsx, CalendarView.jsx, TransactionRow.jsx)
 * into a single source of truth.
 * 
 * Resolution Priority:
 * 1. chargeAssignments[txnId] → subscription key → lookup display name
 * 2. globalRenames[merchantKey] (amount-suffixed key first, then base key)
 * 3. mergedSubscriptions[merchantKey]
 * 4. Fallback to raw merchant name
 */

import { getMerchantKey } from './categorize';

/**
 * Generate a consistent transaction ID for charge assignment lookup
 * @param {Object} t - Transaction object
 * @returns {string} Transaction ID
 */
export function getTransactionId(t) {
    if (t.id) return t.id;
    const dateStr = t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date;
    const amount = Math.abs(t.debit || t.credit || t.amount || 0).toFixed(2);
    const descKey = (t.description || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 12);
    return `txn_${dateStr}_${amount}_${descKey}`;
}

/**
 * Build a lookup map of effective names from metadata sources
 * @param {Object} metadata - Contains globalRenames, mergedSubscriptions, manualRecurring
 * @returns {Object} Map of merchantKey -> displayName
 */
export function buildEffectiveNamesMap(metadata) {
    const { globalRenames = {}, mergedSubscriptions = {}, manualRecurring = [] } = metadata;
    const effectiveNames = {};

    // 1. Add from manualRecurring (split names) - lowest priority
    manualRecurring.forEach(item => {
        if (item.merchantKey && (item.displayName || item.merchant)) {
            effectiveNames[item.merchantKey] = item.displayName || item.merchant;
        }
    });

    // 2. Add from mergedSubscriptions - medium priority
    Object.entries(mergedSubscriptions).forEach(([key, merge]) => {
        if (merge.displayName) {
            effectiveNames[key] = merge.displayName;
        }
    });

    // 3. Add from globalRenames - highest priority (overwrites if exists)
    Object.entries(globalRenames).forEach(([key, rename]) => {
        const displayName = typeof rename === 'string' ? rename : rename?.displayName;
        if (displayName) {
            effectiveNames[key] = displayName;
        }
    });

    return effectiveNames;
}

/**
 * Resolve the effective merchant name for a single transaction
 * @param {Object} transaction - Transaction object with description, merchant, debit/credit
 * @param {Object} metadata - Metadata containing globalRenames, mergedSubscriptions, chargeAssignments, manualRecurring
 * @returns {string} The effective display name
 */
export function resolveEffectiveMerchant(transaction, metadata) {
    const {
        globalRenames = {},
        mergedSubscriptions = {},
        chargeAssignments = {},
        manualRecurring = []
    } = metadata;

    const txnId = getTransactionId(transaction);
    const baseKey = getMerchantKey(transaction.description);
    const amount = Math.abs(transaction.debit || transaction.credit || transaction.amount || 0).toFixed(2);
    const amountKey = `${baseKey}-${amount}`;

    // 1. Check charge assignments first (for splits/merges)
    const assignedKey = chargeAssignments[txnId];
    if (assignedKey) {
        // Look up display name for the assigned subscription
        const effectiveNames = buildEffectiveNamesMap(metadata);
        if (effectiveNames[assignedKey]) {
            return effectiveNames[assignedKey];
        }
        // If assigned but no display name found, check if it's a manual recurring item
        const manualItem = manualRecurring.find(m => m.merchantKey === assignedKey);
        if (manualItem) {
            return manualItem.displayName || manualItem.merchant;
        }
    }

    // 2. Check globalRenames (amount key first, then base key)
    if (globalRenames[amountKey]?.displayName) {
        return globalRenames[amountKey].displayName;
    }
    if (globalRenames[baseKey]?.displayName) {
        return globalRenames[baseKey].displayName;
    }
    // Handle case where rename is stored as string instead of object
    if (typeof globalRenames[amountKey] === 'string') {
        return globalRenames[amountKey];
    }
    if (typeof globalRenames[baseKey] === 'string') {
        return globalRenames[baseKey];
    }

    // 3. Check mergedSubscriptions
    if (mergedSubscriptions[baseKey]?.displayName) {
        return mergedSubscriptions[baseKey].displayName;
    }
    if (mergedSubscriptions[amountKey]?.displayName) {
        return mergedSubscriptions[amountKey].displayName;
    }

    // 4. Fallback to raw merchant
    return transaction.merchant;
}

/**
 * Resolve the effective category for a transaction
 * Checks categoryOverrides first, then falls back to transaction.category
 * @param {Object} transaction - Transaction object
 * @param {Object} metadata - Metadata containing categoryOverrides
 * @returns {string} The effective category
 */
export function resolveEffectiveCategory(transaction, metadata) {
    const { categoryOverrides = {} } = metadata;
    const baseKey = getMerchantKey(transaction.description);
    const amount = Math.abs(transaction.debit || transaction.credit || transaction.amount || 0).toFixed(2);
    const amountKey = `${baseKey}-${amount}`;

    // Check both amount key and base key
    if (categoryOverrides[amountKey]) {
        return categoryOverrides[amountKey];
    }
    if (categoryOverrides[baseKey]) {
        return categoryOverrides[baseKey];
    }

    return transaction.category;
}

/**
 * Enrich a single transaction with effective names
 * @param {Object} transaction - Raw transaction
 * @param {Object} metadata - All metadata sources
 * @returns {Object} Transaction with effectiveMerchant and effectiveCategory added
 */
export function enrichTransaction(transaction, metadata) {
    return {
        ...transaction,
        effectiveMerchant: resolveEffectiveMerchant(transaction, metadata),
        effectiveCategory: resolveEffectiveCategory(transaction, metadata)
    };
}

/**
 * Enrich an array of transactions with effective names
 * @param {Array} transactions - Array of raw transactions
 * @param {Object} metadata - All metadata sources
 * @returns {Array} Transactions with effectiveMerchant and effectiveCategory added
 */
export function enrichTransactions(transactions, metadata) {
    if (!transactions || transactions.length === 0) return [];
    return transactions.map(t => enrichTransaction(t, metadata));
}
