import { getMerchantKey } from '../../../utils/categorize';

// Fuzzy amount matching: returns true if amounts are within 3% of each other
// (handles minor tax variations without grouping truly different subscriptions)
export function amountsMatch(a, b) {
    if (a === 0 || b === 0) return a === b;
    return Math.abs(a - b) / Math.max(a, b) < 0.03;
}

/**
 * Recalculate frequency from an array of transactions
 * This should be called whenever an item's transactions change (merge, split, reassign)
 * @param {Array} transactions - Array of transaction objects with date property
 * @returns {string} Frequency string: Weekly, Bi-Weekly, Monthly, Quarterly, Yearly, or Frequent
 */
export function recalculateFrequency(transactions) {
    if (!transactions || transactions.length < 2) {
        return 'Monthly'; // Default for insufficient data
    }

    // Sort by date ascending
    const sorted = [...transactions].sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateA - dateB;
    });

    // Calculate intervals between consecutive transactions
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
        const dateA = sorted[i - 1].date instanceof Date ? sorted[i - 1].date : new Date(sorted[i - 1].date);
        const dateB = sorted[i].date instanceof Date ? sorted[i].date : new Date(sorted[i].date);
        const daysDiff = (dateB - dateA) / (1000 * 60 * 60 * 24);

        // Skip invalid intervals (NaN or negative)
        if (isFinite(daysDiff) && daysDiff > 0) {
            intervals.push(daysDiff);
        }
    }

    if (intervals.length === 0) {
        return 'Monthly'; // Default if no valid intervals
    }

    // Calculate average interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Determine frequency with tolerance ranges
    if (avgInterval >= 5 && avgInterval <= 10) return 'Weekly';
    if (avgInterval >= 12 && avgInterval <= 18) return 'Bi-Weekly';
    if (avgInterval >= 20 && avgInterval <= 45) return 'Monthly';
    if (avgInterval >= 75 && avgInterval <= 110) return 'Quarterly';
    if (avgInterval >= 340 && avgInterval <= 400) return 'Yearly';

    // For intervals outside standard ranges, make best guess
    if (avgInterval < 12) return 'Weekly';
    if (avgInterval < 20) return 'Bi-Weekly';
    if (avgInterval < 75) return 'Monthly';
    if (avgInterval < 340) return 'Quarterly';
    return 'Yearly';
}

// Minimum occurrences to qualify as recurring
const MIN_OCCURRENCES = 2;
const MIN_YEARLY_OCCURRENCES = 2; // Lower threshold for yearly (only 2 data points over 1-2 years)

// Detect recurring transactions (subscriptions) with fuzzy matching
export function detectSubscriptions(transactions) {
    if (!transactions || transactions.length === 0) return [];

    // Group by fuzzy merchant key (first 8 chars normalized)
    const groups = {};

    transactions
        .filter(t => t.debit > 0) // Only debits (money out)
        .forEach(t => {
            const merchantKey = getMerchantKey(t.description);

            // Find existing group that matches this merchant
            let matchedKey = null;
            for (const key of Object.keys(groups)) {
                if (key === merchantKey) {
                    matchedKey = key;
                    break;
                }
            }

            if (!matchedKey) {
                groups[merchantKey] = {
                    merchant: t.merchant,
                    category: t.category,
                    transactions: []
                };
                matchedKey = merchantKey;
            }

            groups[matchedKey].transactions.push(t);
        });

    const subscriptions = [];

    Object.entries(groups).forEach(([merchantKey, group]) => {
        // Skip if less than minimum yearly threshold (we'll check per-frequency later)
        if (group.transactions.length < MIN_YEARLY_OCCURRENCES) return;

        // Sort by date
        group.transactions.sort((a, b) => a.date - b.date);

        // Find clusters of similar amounts (fuzzy matching)
        const amountClusters = [];
        group.transactions.forEach(txn => {
            let foundCluster = false;
            // Use debit since we filtered for debit > 0
            const txnAmount = txn.debit || txn.amount;

            for (const cluster of amountClusters) {
                if (amountsMatch(cluster.baseAmount, txnAmount)) {
                    cluster.transactions.push(txn);
                    foundCluster = true;
                    break;
                }
            }
            if (!foundCluster) {
                amountClusters.push({
                    baseAmount: txnAmount,
                    transactions: [txn]
                });
            }
        });

        // Process EACH cluster that meets min occurrences (umbrella merchant split)
        // e.g., Apple.com might have Apple Music ($10.99) and iCloud ($2.99)
        amountClusters.forEach(cluster => {
            // Skip clusters with less than 2 transactions (minimum for any pattern)
            if (cluster.transactions.length < MIN_YEARLY_OCCURRENCES) return;

            const txns = cluster.transactions;
            const clusterAmount = cluster.baseAmount;

            // Calculate intervals first to determine frequency
            const intervals = [];
            for (let i = 1; i < txns.length; i++) {
                const daysDiff = (txns[i].date - txns[i - 1].date) / (1000 * 60 * 60 * 24);
                intervals.push(daysDiff);
            }

            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

            // Determine frequency with tolerance (widened tolerances to catch more edge cases)
            let frequency = null;
            if (avgInterval >= 5 && avgInterval <= 10) frequency = 'Weekly';
            else if (avgInterval >= 12 && avgInterval <= 18) frequency = 'Bi-Weekly';
            else if (avgInterval >= 20 && avgInterval <= 45) frequency = 'Monthly';
            else if (avgInterval >= 75 && avgInterval <= 110) frequency = 'Quarterly';
            else if (avgInterval >= 340 && avgInterval <= 400) frequency = 'Yearly';
            else frequency = 'Frequent'; // Fallback for irregular patterns - still surface in Pending

            // Apply frequency-specific minimum occurrences
            // Yearly only needs 2, others need 4
            const minRequired = frequency === 'Yearly' ? MIN_YEARLY_OCCURRENCES : MIN_OCCURRENCES;
            if (txns.length < minRequired) return;

            // Create unique key: merchantKey-amount (for umbrella merchants)
            const uniqueKey = amountClusters.length > 1
                ? `${merchantKey}-${clusterAmount.toFixed(2)}`
                : merchantKey;

            // Calculate amounts
            const amounts = txns.map(t => t.debit || t.amount);
            const latestAmount = amounts[amounts.length - 1];
            const previousAmount = amounts.length > 1 ? amounts[amounts.length - 2] : latestAmount;
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const totalSpent = amounts.reduce((a, b) => a + b, 0);

            // Detect price change
            const priceChange = latestAmount - previousAmount;
            const priceChangePercent = previousAmount > 0 ? (priceChange / previousAmount) * 100 : 0;

            // Calculate next renewal
            const lastDate = txns[txns.length - 1].date;
            const nextDate = new Date(lastDate);
            if (frequency === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (frequency === 'Bi-Weekly') nextDate.setDate(nextDate.getDate() + 14);
            else if (frequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            else if (frequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
            else if (frequency === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
            else if (frequency === 'Frequent') nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

            // Display name includes amount hint if umbrella
            const displayMerchant = amountClusters.length > 1
                ? `${group.merchant} ($${clusterAmount.toFixed(2)})`
                : group.merchant;

            subscriptions.push({
                merchantKey: uniqueKey,
                merchant: displayMerchant,
                baseMerchant: group.merchant, // Original merchant name
                category: group.category,
                frequency,
                count: txns.length,
                latestAmount,
                avgAmount,
                priceChange,
                priceChangePercent,
                firstDate: txns[0].date,
                lastDate,
                nextDate,
                totalSpent,
                isUmbrellaItem: amountClusters.length > 1,
                allTransactions: txns
            });
        });
    });

    // Sort by total spent descending
    return subscriptions.sort((a, b) => b.totalSpent - a.totalSpent);
}
