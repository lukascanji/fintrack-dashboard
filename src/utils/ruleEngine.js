/**
 * Rule Engine
 * Applies persistent user rules (renames, categories, subscriptions, merges) to transactions
 */

import { amountsMatch } from '../features/recurring/utils/recurringUtils';
import { getTransactionId } from './transactionId';
import { matchesAffiliation, matchesBillingDate, DEFAULT_AFFILIATION_PATTERNS } from './subscriptionMatcher';

/**
 * Apply all rules to a set of transactions
 * @param {Array} transactions - New transactions to apply rules to
 * @param {Object} rules - All available rules
 * @param {Object} rules.subscriptionRules - Subscription matching rules
 * @param {Object} rules.mergedSubscriptions - Merged subscription mappings
 * @param {Object} rules.globalRenames - Rename mappings (for reference, applied elsewhere)
 * @param {Object} [existingAssignments={}] - Already-existing charge assignments
 * @returns {Object} { chargeAssignments, appliedRules: { subscriptions, merges } }
 */
export function applyRulesToTransactions(transactions, rules, existingAssignments = {}) {
    const {
        subscriptionRules = {},
        mergedSubscriptions = {},
    } = rules;

    const chargeAssignments = {};
    const appliedRules = {
        subscriptions: [], // { transactionId, ruleName, ruleKey }
        merges: [], // { transactionId, sourceKey, targetKey }
    };

    transactions.forEach(txn => {
        const txnId = getTransactionId(txn);

        // Skip if already assigned
        if (existingAssignments[txnId]) return;

        // Try to match subscription rules
        const subscriptionMatch = matchSubscriptionRule(txn, subscriptionRules);
        if (subscriptionMatch) {
            chargeAssignments[txnId] = subscriptionMatch.targetKey;
            appliedRules.subscriptions.push({
                transactionId: txnId,
                ruleName: subscriptionMatch.serviceName,
                ruleKey: subscriptionMatch.targetKey
            });
            return; // Subscription rule takes precedence
        }

        // Check if transaction's natural merchantKey should be redirected via merge
        // (This applies when the transaction would naturally belong to a merged-away subscription)
        // Note: This is handled at display time, not at import time
    });

    return { chargeAssignments, appliedRules };
}

/**
 * Try to match a transaction against subscription rules
 * @param {Object} transaction 
 * @param {Object} subscriptionRules 
 * @returns {Object|null} { serviceName, targetKey } or null
 */
function matchSubscriptionRule(transaction, subscriptionRules) {
    const txnDate = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
    const txnAmount = transaction.debit || transaction.amount || 0;

    for (const [ruleKey, rule] of Object.entries(subscriptionRules)) {
        // Check affiliation match
        if (!matchesAffiliation(transaction, rule.affiliation, DEFAULT_AFFILIATION_PATTERNS)) {
            continue;
        }

        // Check amount match (any of the known amounts for this subscription)
        const amountMatches = rule.amounts.some(amount => amountsMatch(txnAmount, amount));
        if (!amountMatches) {
            continue;
        }

        // Check billing day match (if specified)
        if (rule.billingDay !== null) {
            // For rules, we check day tolerance but allow any month/year
            const txnDay = txnDate.getDate();
            const dayDiff = Math.abs(txnDay - rule.billingDay);
            if (dayDiff > 5 && dayDiff < 26) { // Allow wrap-around for end-of-month
                continue;
            }
        }

        // Match found!
        return {
            serviceName: rule.serviceName,
            targetKey: rule.targetKey
        };
    }

    return null;
}

/**
 * Generate subscription rules from CSV import data
 * These rules persist and apply to future transaction imports
 * @param {Object} importData - From generateImportData
 * @param {Array} parsedSubscriptions - Combined subscriptions from CSV
 * @returns {Object} subscriptionRules keyed by subscription key
 */
export function generateSubscriptionRules(importData, parsedSubscriptions) {
    const rules = {};

    importData.manualRecurringEntries.forEach(entry => {
        const sub = parsedSubscriptions.find(s => s.serviceName === entry.merchant);
        if (!sub) return;

        // Collect all unique amounts from price history
        const amounts = [...new Set(sub.priceHistory.map(p => p.amount))];

        rules[entry.merchantKey] = {
            serviceName: entry.merchant,
            affiliation: sub.affiliation,
            billingDay: sub.billingDay,
            amounts: amounts,
            targetKey: entry.merchantKey,
            createdAt: new Date().toISOString()
        };
    });

    return rules;
}

/**
 * Get summary of rules that would apply to transactions
 * Useful for preview/debugging
 */
export function previewRuleApplication(transactions, rules) {
    const result = applyRulesToTransactions(transactions, rules);
    return {
        totalTransactions: transactions.length,
        assignedBySubscription: result.appliedRules.subscriptions.length,
        assignedByMerge: result.appliedRules.merges.length,
        unassigned: transactions.length - Object.keys(result.chargeAssignments).length
    };
}
