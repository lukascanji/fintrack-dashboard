/**
 * Smart Subscription Consolidation Engine
 * Detects merge and split opportunities within recurring items
 */

import { getMerchantKey } from '../../../utils/categorize';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract merchant affiliation (APPLE, AMAZON, PAYPAL, etc.)
 * Checks merchantKey first, then fallback to merchant/displayName for split items
 */
function getAffiliation(merchantKey, merchant = '', displayName = '') {
    // Combine all sources to check
    const sources = [merchantKey, merchant, displayName].filter(Boolean);

    for (const source of sources) {
        const key = (source || '').toUpperCase();
        if (key.startsWith('APPLE') || key.includes('APPLE')) return 'APPLE';
        if (key.startsWith('AMAZON') || key.startsWith('AMZN') || key.includes('AMAZON')) return 'AMAZON';
        if (key.startsWith('PAYPAL') || key.includes('PAYPAL')) return 'PAYPAL';
        if (key.startsWith('GOOGLE') || key.includes('GOOGLE')) return 'GOOGLE';
        if (key.startsWith('MICROSOFT') || key.startsWith('MSFT')) return 'MICROSOFT';
        if (key.startsWith('NETFLIX') || key.includes('NETFLIX')) return 'NETFLIX';
        if (key.startsWith('SPOTIFY') || key.includes('SPOTIFY')) return 'SPOTIFY';
    }

    // Extract first 6 chars of merchantKey as fallback affiliation
    return (merchantKey || '').toUpperCase().slice(0, 6);
}

/**
 * Get period in days based on frequency
 */
function getPeriodDays(frequency) {
    switch (frequency) {
        case 'Weekly': return 7;
        case 'Bi-Weekly': return 14;
        case 'Monthly': return 30;
        case 'Quarterly': return 90;
        case 'Yearly': return 365;
        case 'Frequent': return 30; // Default to monthly for frequent
        default: return 30;
    }
}

/**
 * Calculate average billing day of month from transactions
 */
function getAverageBillingDay(transactions) {
    if (!transactions || transactions.length === 0) return null;
    const days = transactions.map(t => new Date(t.date).getDate());
    return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
}

/**
 * Generate a unique hash for a suggestion (for dismissed tracking)
 */
function generateSuggestionHash(items, type) {
    const keys = items.map(i => i.merchantKey).sort().join('|');
    return `${type}_${keys}`;
}

/**
 * Generate data hash to detect when underlying data changes
 */
function generateDataHash(items) {
    return items.map(i => `${i.merchantKey}:${i.count}:${i.latestAmount}`).sort().join('|');
}

// ============================================
// MERGE DETECTION
// ============================================

/**
 * Detect potential merge candidates
 * Groups items by affiliation, then checks for date continuity
 */
function detectMergeCandidates(recurringItems) {
    const suggestions = [];

    // Group by affiliation
    const affiliationGroups = {};
    recurringItems.forEach(item => {
        const affil = getAffiliation(item.merchantKey, item.baseMerchant || item.merchant, item.displayName);
        if (!affiliationGroups[affil]) affiliationGroups[affil] = [];
        affiliationGroups[affil].push(item);
    });

    // For each affiliation group with 2+ items, check for merge opportunities
    Object.entries(affiliationGroups).forEach(([affiliation, items]) => {
        if (items.length < 2) return;

        // Sort by first date
        items.sort((a, b) => {
            const aFirst = a.firstDate ? new Date(a.firstDate) : new Date();
            const bFirst = b.firstDate ? new Date(b.firstDate) : new Date();
            return aFirst - bFirst;
        });

        // Check each pair for continuity
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const itemA = items[i];
                const itemB = items[j];

                const mergeScore = calculateMergeScore(itemA, itemB);

                if (mergeScore.confidence >= 0.5) {
                    suggestions.push({
                        id: generateSuggestionHash([itemA, itemB], 'merge'),
                        type: 'merge',
                        confidence: mergeScore.confidence,
                        items: [itemA, itemB],
                        reason: {
                            primary: mergeScore.primary,
                            details: mergeScore.details
                        },
                        suggestedName: itemB.merchant, // Use the more recent one
                        dataHash: generateDataHash([itemA, itemB])
                    });
                }
            }
        }
    });

    return suggestions;
}

/**
 * Calculate merge score between two items
 * Refined scoring with graduated gap, frequency mismatch, and price direction
 */
function calculateMergeScore(itemA, itemB) {
    let confidence = 0;
    const details = [];
    let primary = '';

    // CRITICAL: First check for date continuity and overlapping
    const dateScore = calculateDateContinuity(itemA, itemB);

    // If items are overlapping (running concurrently), reject completely
    if (dateScore.isOverlapping) {
        console.log(`Rejecting merge: ${itemA.merchant} and ${itemB.merchant} overlap by ${dateScore.overlapDays} days`);
        return { confidence: 0, details: [], primary: '' };
    }

    // 1. Same affiliation (base requirement, already filtered)
    const affiliationA = getAffiliation(itemA.merchantKey, itemA.baseMerchant || itemA.merchant, itemA.displayName);
    const affiliationB = getAffiliation(itemB.merchantKey, itemB.baseMerchant || itemB.merchant, itemB.displayName);
    if (affiliationA === affiliationB) {
        confidence += 0.3;
        details.push(`Same merchant: ${affiliationA}`);
    }

    // 2. Date continuity with GRADUATED scoring based on gap vs expected period
    if (dateScore.isContiguous && dateScore.gapDays !== undefined) {
        const expectedPeriod = getPeriodDays(itemA.frequency);
        const gapRatio = dateScore.gapDays / expectedPeriod;

        // Gap scoring: how close is the gap to the expected period?
        // gapRatio ≈ 1.0 = perfect, gapRatio > 2.0 = weak
        let gapScore = 0;
        if (gapRatio >= 0.7 && gapRatio <= 1.3) {
            // Gap is within ±30% of expected period - full score
            gapScore = 0.3;
            details.push(`Date continuity: ${dateScore.gapDays}-day gap (matches ${itemA.frequency} pattern)`);
        } else if (gapRatio > 0.3 && gapRatio <= 1.5) {
            // Gap is close but not ideal - partial score
            gapScore = 0.15;
            details.push(`Date continuity: ${dateScore.gapDays}-day gap (expected ~${expectedPeriod} days)`);
        } else if (gapRatio <= 2.0) {
            // Gap is within tolerance but far from expected - minimal score
            gapScore = 0.05;
            details.push(`Date continuity: ${dateScore.gapDays}-day gap (weak match for ${itemA.frequency})`);
        } else {
            // Gap is too large - no score
            details.push(`Large gap: ${dateScore.gapDays} days (expected ~${expectedPeriod})`);
        }

        confidence += gapScore;
        if (gapScore > 0 && !primary) primary = `Date continuity: ${dateScore.gapDays}-day gap`;
    }

    // 3. Frequency mismatch penalty
    const freqA = itemA.frequency;
    const freqB = itemB.frequency;
    if (freqA && freqB && freqA !== freqB) {
        // Different frequencies - apply penalty
        confidence -= 0.1;
        details.push(`Frequency mismatch: ${freqA} → ${freqB}`);
    }

    // 4. Billing day alignment (±5 days)
    const dayA = getAverageBillingDay(itemA.allTransactions || []);
    const dayB = getAverageBillingDay(itemB.allTransactions || []);
    if (dayA && dayB && Math.abs(dayA - dayB) <= 5) {
        confidence += 0.2;
        details.push(`Same billing day: ~${dayA}th of month`);
    }

    // 5. Amount similarity with price direction consideration
    const amtA = itemA.latestAmount || 0;
    const amtB = itemB.latestAmount || 0;
    if (amtA > 0 && amtB > 0) {
        const ratio = Math.max(amtA, amtB) / Math.min(amtA, amtB);
        if (ratio <= 1.5) {
            const pctChange = ((amtB - amtA) / amtA * 100).toFixed(0);
            const isIncrease = amtB >= amtA;

            if (isIncrease) {
                // Price increase is normal - full score
                confidence += 0.2;
                details.push(`Price increase: $${amtA.toFixed(2)} → $${amtB.toFixed(2)} (+${pctChange}%)`);
            } else {
                // Price decrease is unusual - half score
                confidence += 0.1;
                details.push(`Price decrease: $${amtA.toFixed(2)} → $${amtB.toFixed(2)} (${pctChange}%)`);
            }

            if (!primary && isIncrease) primary = 'Price increase detected';
        }
    }

    // Ensure confidence doesn't go negative
    confidence = Math.max(0, confidence);

    return { confidence, details, primary: primary || 'Pattern match' };
}

/**
 * Check if two items have date continuity based on their frequencies
 * CRITICAL: Also rejects items with overlapping date ranges
 */
function calculateDateContinuity(itemA, itemB) {
    const aLastDate = itemA.lastDate ? new Date(itemA.lastDate) : null;
    const bFirstDate = itemB.firstDate ? new Date(itemB.firstDate) : null;
    const aFirstDate = itemA.firstDate ? new Date(itemA.firstDate) : null;
    const bLastDate = itemB.lastDate ? new Date(itemB.lastDate) : null;

    if (!aLastDate || !bFirstDate || !aFirstDate || !bLastDate) {
        return { isContiguous: false, reason: '', isOverlapping: false };
    }

    // CRITICAL: Check for overlapping date ranges
    // Two items overlap if: A starts before B ends AND B starts before A ends
    // ANY overlap means these are concurrent subscriptions - reject completely
    const hasOverlap = (aFirstDate <= bLastDate) && (bFirstDate <= aLastDate);

    if (hasOverlap) {
        // Calculate overlap for logging purposes
        const overlapStart = Math.max(aFirstDate, bFirstDate);
        const overlapEnd = Math.min(aLastDate, bLastDate);
        const overlapDays = Math.max(0, (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));

        // ANY overlap = concurrent subscriptions = cannot merge
        return {
            isContiguous: false,
            reason: '',
            isOverlapping: true,
            overlapDays: Math.round(overlapDays)
        };
    }

    // Use the frequency of itemA (the earlier one) to determine expected gap
    const periodDays = getPeriodDays(itemA.frequency);
    const tolerance = periodDays * 2.0; // Allow up to 2x period for graduated scoring

    // Check if B starts after A ends (forward continuity)
    const gapAfter = (bFirstDate - aLastDate) / (1000 * 60 * 60 * 24);
    if (gapAfter > 0 && gapAfter <= tolerance) {
        return {
            isContiguous: true,
            reason: `Date continuity: ${Math.round(gapAfter)}-day gap between subscriptions`,
            isOverlapping: false,
            gapDays: Math.round(gapAfter)
        };
    }

    // Check if B ends before A starts (backward continuity - B is older)
    const gapBefore = (aFirstDate - bLastDate) / (1000 * 60 * 60 * 24);
    if (gapBefore > 0 && gapBefore <= tolerance) {
        return {
            isContiguous: true,
            reason: `Date continuity: ${Math.round(gapBefore)}-day gap between subscriptions`,
            isOverlapping: false,
            gapDays: Math.round(gapBefore)
        };
    }

    return { isContiguous: false, reason: '', isOverlapping: false };
}

// ============================================
// SPLIT DETECTION
// ============================================

/**
 * Detect potential split candidates
 * Items with "Frequent" frequency, bi-weekly, or multiple amount clusters
 */
function detectSplitCandidates(recurringItems) {
    const suggestions = [];

    recurringItems.forEach(item => {
        const splitScore = calculateSplitScore(item);

        if (splitScore.confidence >= 0.5 && splitScore.clusters.length > 1) {
            suggestions.push({
                id: generateSuggestionHash([item], 'split'),
                type: 'split',
                confidence: splitScore.confidence,
                items: [item],
                reason: {
                    primary: splitScore.primary,
                    details: splitScore.details
                },
                suggestedSplits: splitScore.clusters.map((cluster, idx) => ({
                    name: `${item.merchant} (${cluster.frequency || 'Group'} ${idx + 1})`,
                    amount: cluster.baseAmount,
                    count: cluster.transactions.length,
                    transactionIds: cluster.transactions.map(t => t.id || `${t.date}_${t.amount}`)
                })),
                dataHash: generateDataHash([item])
            });
        }
    });

    return suggestions;
}

/**
 * Calculate split score for an item
 */
function calculateSplitScore(item) {
    let confidence = 0;
    const details = [];
    let primary = '';
    const clusters = [];

    const transactions = item.allTransactions || [];
    if (transactions.length < 4) {
        return { confidence: 0, details: [], primary: '', clusters: [] };
    }

    // 1. Check for "Frequent" frequency label (strong indicator)
    if (item.frequency === 'Frequent') {
        confidence += 0.3;
        details.push('Labeled as "Frequent" - irregular pattern detected');
        primary = 'Irregular payment pattern';
    }

    // 2. Check for bi-weekly (uncommon, hints at mixed subscriptions)
    if (item.frequency === 'Bi-Weekly') {
        confidence += 0.2;
        details.push('Bi-weekly pattern is uncommon - may contain multiple subscriptions');
    }

    // 3. Detect multiple distinct amount clusters
    const amountClusters = detectAmountClusters(transactions);
    if (amountClusters.length > 1) {
        confidence += 0.4;
        details.push(`${amountClusters.length} distinct price points detected`);
        amountClusters.forEach(cluster => {
            details.push(`  • ~$${cluster.baseAmount.toFixed(2)}: ${cluster.transactions.length} charges`);
            clusters.push(cluster);
        });
        if (!primary) primary = 'Multiple subscription amounts detected';
    } else if (amountClusters.length === 1) {
        clusters.push(amountClusters[0]);
    }

    // 4. Detect multiple day-of-month clusters (NEW!)
    // This catches items like AMAZON $11.29 that have same amount but different billing days
    if (amountClusters.length <= 1) {
        const dayOfMonthClusters = detectDayOfMonthClusters(transactions);
        if (dayOfMonthClusters.length > 1) {
            confidence += 0.4;
            details.push(`${dayOfMonthClusters.length} distinct billing day patterns detected`);
            dayOfMonthClusters.forEach(cluster => {
                details.push(`  • ~${cluster.dayOfMonth}${getOrdinalSuffix(cluster.dayOfMonth)} of month: ${cluster.transactions.length} charges`);
            });
            if (!primary) primary = 'Multiple billing day patterns detected';

            // Replace clusters with day-based clusters if no amount clusters
            if (clusters.length <= 1) {
                clusters.length = 0;
                dayOfMonthClusters.forEach(cluster => {
                    clusters.push({
                        baseAmount: cluster.averageAmount,
                        transactions: cluster.transactions,
                        frequency: 'Monthly',
                        dayOfMonth: cluster.dayOfMonth
                    });
                });
            }
        }
    }

    // 5. High transaction count (soft signal)
    if (transactions.length >= 15) {
        confidence += 0.1;
        details.push(`High volume: ${transactions.length} charges`);
    }

    return { confidence: Math.min(confidence, 1), details, primary: primary || 'Pattern detected', clusters };
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n) {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

/**
 * Detect distinct day-of-month clusters within transactions
 */
function detectDayOfMonthClusters(transactions) {
    const clusters = {};

    transactions.forEach(txn => {
        const date = new Date(txn.date);
        const dayOfMonth = date.getDate();

        // Find existing cluster within ±3 days tolerance
        let foundCluster = null;
        for (const clusterDay of Object.keys(clusters)) {
            if (Math.abs(dayOfMonth - parseInt(clusterDay)) <= 3) {
                foundCluster = clusterDay;
                break;
            }
        }

        if (foundCluster) {
            clusters[foundCluster].transactions.push(txn);
        } else {
            clusters[dayOfMonth] = {
                dayOfMonth,
                transactions: [txn]
            };
        }
    });

    // Calculate average amount for each cluster and filter to clusters with 2+ transactions
    return Object.values(clusters)
        .filter(c => c.transactions.length >= 2)
        .map(cluster => ({
            ...cluster,
            averageAmount: cluster.transactions.reduce((sum, t) => sum + (t.debit || t.amount || 0), 0) / cluster.transactions.length
        }))
        .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
}

/**
 * Detect distinct amount clusters within transactions
 */
function detectAmountClusters(transactions) {
    const clusters = [];

    transactions.forEach(txn => {
        const amount = txn.debit || txn.amount || 0;
        if (amount === 0) return;

        // Find existing cluster within 5% tolerance
        let foundCluster = false;
        for (const cluster of clusters) {
            const ratio = Math.abs(cluster.baseAmount - amount) / cluster.baseAmount;
            if (ratio < 0.05) { // 5% tolerance
                cluster.transactions.push(txn);
                foundCluster = true;
                break;
            }
        }

        if (!foundCluster) {
            clusters.push({
                baseAmount: amount,
                transactions: [txn]
            });
        }
    });

    // Calculate frequency for each cluster
    clusters.forEach(cluster => {
        if (cluster.transactions.length >= 2) {
            const sorted = [...cluster.transactions].sort((a, b) =>
                new Date(a.date) - new Date(b.date)
            );
            const intervals = [];
            for (let i = 1; i < sorted.length; i++) {
                const diff = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / (1000 * 60 * 60 * 24);
                intervals.push(diff);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

            if (avgInterval >= 25 && avgInterval <= 35) cluster.frequency = 'Monthly';
            else if (avgInterval >= 80 && avgInterval <= 100) cluster.frequency = 'Quarterly';
            else if (avgInterval >= 350 && avgInterval <= 380) cluster.frequency = 'Yearly';
            else if (avgInterval >= 12 && avgInterval <= 18) cluster.frequency = 'Bi-Weekly';
            else cluster.frequency = 'Frequent';
        }
    });

    // Only return clusters with 2+ transactions
    return clusters.filter(c => c.transactions.length >= 2);
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Detect all consolidation suggestions (merges and splits)
 * 
 * @param {Array} allRecurringItems - All approved/manual recurring items
 * @param {Object} dismissedSuggestions - Previously dismissed { [id]: { dataHash } }
 * @param {Object} consolidatedItems - Already consolidated items to skip
 * @returns {Array} Sorted suggestions by confidence
 */
export function detectConsolidationSuggestions(
    allRecurringItems,
    dismissedSuggestions = {},
    consolidatedItems = {}
) {
    if (!allRecurringItems || allRecurringItems.length === 0) {
        return [];
    }

    // Filter out already consolidated items
    const eligibleItems = allRecurringItems.filter(item =>
        !consolidatedItems[item.merchantKey]
    );

    // Detect merge and split candidates
    const mergeSuggestions = detectMergeCandidates(eligibleItems);
    const splitSuggestions = detectSplitCandidates(eligibleItems);

    const allSuggestions = [...mergeSuggestions, ...splitSuggestions];

    // Filter out dismissed suggestions (unless data has changed)
    const activeSuggestions = allSuggestions.filter(suggestion => {
        const dismissed = dismissedSuggestions[suggestion.id];
        if (!dismissed) return true; // Not dismissed

        // Check if data has changed since dismissal
        return dismissed.dataHash !== suggestion.dataHash;
    });

    // Sort by confidence (highest first)
    activeSuggestions.sort((a, b) => b.confidence - a.confidence);

    return activeSuggestions;
}

/**
 * Generate a merged display name from items
 */
export function generateMergedName(items, globalRenames = {}) {
    // Check if any item has a custom rename
    for (const item of items) {
        if (globalRenames[item.merchantKey]?.displayName) {
            return globalRenames[item.merchantKey].displayName;
        }
    }

    // Use the most recent item's merchant name
    const sorted = [...items].sort((a, b) => {
        const aDate = a.lastDate ? new Date(a.lastDate) : new Date(0);
        const bDate = b.lastDate ? new Date(b.lastDate) : new Date(0);
        return bDate - aDate;
    });

    return sorted[0]?.merchant || 'Merged Subscription';
}
