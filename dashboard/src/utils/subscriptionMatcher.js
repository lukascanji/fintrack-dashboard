/**
 * Subscription Matcher
 * Matches parsed subscription data to existing transactions
 */

import { amountsMatch } from '../features/recurring/utils/recurringUtils';
import { getMerchantKey } from './categorize';
import { getTransactionId } from './transactionId';

/**
 * Affiliation patterns to match against merchant descriptions
 * Maps affiliation name to array of patterns to search for
 */
export const DEFAULT_AFFILIATION_PATTERNS = {
    'AMAZON': ['AMAZON', 'AMZN', 'AMZ*'],
    'APPLE': ['APPLE', 'ITUNES', 'APP STORE'],
    'PAYPAL': ['PAYPAL', 'PP*'],
    'GOOGLE': ['GOOGLE', 'GOOGL*'],
};

/**
 * Check if a transaction matches an affiliation
 */
export function matchesAffiliation(transaction, affiliation, patterns = DEFAULT_AFFILIATION_PATTERNS) {
    if (!affiliation || !transaction.description) return false;

    const desc = transaction.description.toUpperCase();
    const affiliationPatterns = patterns[affiliation.toUpperCase()] || [affiliation.toUpperCase()];

    return affiliationPatterns.some(pattern => {
        if (pattern.endsWith('*')) {
            return desc.includes(pattern.slice(0, -1));
        }
        return desc.includes(pattern);
    });
}

/**
 * Check if transaction date matches expected billing day for a month
 * @param {Date} txnDate - Transaction date
 * @param {number} expectedMonth - Expected month (0-11)
 * @param {number} expectedYear - Expected year
 * @param {number} billingDay - Expected day of month (1-31)
 * @param {number} [tolerance=5] - Days of tolerance
 */
export function matchesBillingDate(txnDate, expectedMonth, expectedYear, billingDay, tolerance = 5) {
    if (!txnDate || billingDay === null) return false;

    const txnMonth = txnDate.getMonth();
    const txnYear = txnDate.getFullYear();
    const txnDay = txnDate.getDate();

    // Must match month and year
    if (txnMonth !== expectedMonth || txnYear !== expectedYear) return false;

    // Day must be within tolerance
    return Math.abs(txnDay - billingDay) <= tolerance;
}

/**
 * Match subscriptions to transactions
 * @param {Array} parsedSubscriptions - From parseSubscriptionCSV
 * @param {Array} transactions - All transactions
 * @param {Object} [options] - Matching options
 * @returns {Object} { matches: { subKey: txnIds[] }, unmatched: txnIds[], stats }
 */
export function matchSubscriptionsToTransactions(parsedSubscriptions, transactions, options = {}) {
    const {
        affiliationPatterns = DEFAULT_AFFILIATION_PATTERNS,
        amountTolerance = 0.03, // 3% - uses amountsMatch
        dateTolerance = 5, // days
    } = options;

    // STEP 1: Group subscriptions by service name (combine multi-year rows)
    const groupedByService = {};
    parsedSubscriptions.forEach(sub => {
        const key = sub.serviceName;
        if (!groupedByService[key]) {
            groupedByService[key] = {
                serviceName: sub.serviceName,
                affiliation: sub.affiliation,
                billingDay: sub.billingDay,
                priceHistory: []
            };
        }
        // Combine price histories from all years
        groupedByService[key].priceHistory.push(...sub.priceHistory);
        // Use billingDay from any row that has it
        if (sub.billingDay !== null && groupedByService[key].billingDay === null) {
            groupedByService[key].billingDay = sub.billingDay;
        }
    });

    const combinedSubscriptions = Object.values(groupedByService);

    const matches = {}; // subscriptionKey -> transactionIds[]
    const matchedTxnIds = new Set();
    const stats = {
        totalSubscriptions: combinedSubscriptions.length,
        totalTransactions: transactions.length,
        matchedTransactions: 0,
        unmatchedTransactions: 0,
        subscriptionStats: {} // subscriptionKey -> { matched, total }
    };

    // STEP 2: For each COMBINED subscription, find matching transactions
    combinedSubscriptions.forEach((sub, idx) => {
        const subKey = `import_${sub.serviceName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${idx}`;
        matches[subKey] = [];

        // Filter transactions by affiliation first
        const affiliationTxns = transactions.filter(t =>
            matchesAffiliation(t, sub.affiliation, affiliationPatterns)
        );

        // For each price point in history, find matching transactions
        sub.priceHistory.forEach(pricePoint => {
            affiliationTxns.forEach(txn => {
                const txnId = getTransactionId(txn);

                // Skip if already matched
                if (matchedTxnIds.has(txnId)) return;

                const txnAmount = txn.debit || txn.amount || 0;

                // Check amount match (fuzzy)
                if (!amountsMatch(txnAmount, pricePoint.amount)) return;

                // Check date match (if billing day specified)
                if (sub.billingDay !== null) {
                    if (!matchesBillingDate(txn.date, pricePoint.month, pricePoint.year, sub.billingDay, dateTolerance)) {
                        return;
                    }
                } else {
                    // No billing day - just check month/year
                    if (txn.date.getMonth() !== pricePoint.month ||
                        txn.date.getFullYear() !== pricePoint.year) {
                        return;
                    }
                }

                // Match found!
                matches[subKey].push(txnId);
                matchedTxnIds.add(txnId);
            });
        });

        stats.subscriptionStats[subKey] = {
            serviceName: sub.serviceName,
            matched: matches[subKey].length,
            expectedMonths: sub.priceHistory.length
        };
    });

    // Find unmatched umbrella transactions
    const umbrellaAffiliations = [...new Set(combinedSubscriptions.map(s => s.affiliation).filter(Boolean))];
    const unmatchedTxnIds = transactions
        .filter(t => {
            const txnId = getTransactionId(t);
            if (matchedTxnIds.has(txnId)) return false;
            // Only include if it matches one of the affiliations
            return umbrellaAffiliations.some(aff => matchesAffiliation(t, aff, affiliationPatterns));
        })
        .map(t => getTransactionId(t));

    stats.matchedTransactions = matchedTxnIds.size;
    stats.unmatchedTransactions = unmatchedTxnIds.length;

    return { matches, unmatched: unmatchedTxnIds, stats, parsedSubscriptions: combinedSubscriptions };
}

/**
 * Generate subscription entries for import
 * Creates the data structures needed for manualRecurring, chargeAssignments, etc.
 */
export function generateImportData(matchResults, parsedSubscriptions) {
    const { matches, stats } = matchResults;

    const manualRecurringEntries = [];
    const chargeAssignmentUpdates = {};
    const globalRenameUpdates = {};

    Object.entries(matches).forEach(([subKey, txnIds]) => {
        const subStats = stats.subscriptionStats[subKey];
        if (!subStats || txnIds.length === 0) return;

        const sub = parsedSubscriptions.find(s => s.serviceName === subStats.serviceName);
        if (!sub) return;

        // Create manual recurring entry
        manualRecurringEntries.push({
            merchantKey: subKey,
            merchant: subStats.serviceName,
            displayName: subStats.serviceName,
            isManuallyCreated: true,
            isImported: true,
            affiliation: sub.affiliation,
            billingDay: sub.billingDay,
            latestAmount: sub.priceHistory[sub.priceHistory.length - 1]?.amount,
            frequency: 'Monthly', // Assume monthly for calendar imports
            count: txnIds.length
        });

        // Create charge assignments
        txnIds.forEach(txnId => {
            chargeAssignmentUpdates[txnId] = subKey;
        });

        // Create global rename
        globalRenameUpdates[subKey] = {
            displayName: subStats.serviceName,
            isImported: true
        };
    });

    return {
        manualRecurringEntries,
        chargeAssignmentUpdates,
        globalRenameUpdates
    };
}
