/**
 * Configuration Snapshot Utilities
 * 
 * Provides functions to:
 * 1. Export full state as JSON backup
 * 2. Generate human-readable markdown with transaction-level detail
 * 3. Reset to fresh state for testing
 * 4. Restore from backup
 */

// All localStorage keys used by FinTrack
const STORAGE_KEYS = [
    'fintrack_recurring_approved',
    'fintrack_recurring_denied',
    'fintrack_manual_recurring',
    'fintrack_merged_subscriptions',
    'fintrack_split_subscriptions',
    'fintrack_global_renames',
    'fintrack_category_overrides',
    'fintrack_category_rules',
    'fintrack_shared_subscriptions',
    'fintrack_emails',
    'fintrack_charge_assignments',
    'fintrack_subscription_rules',
    'fintrack_transformation_log',
    'fintrack_dismissed_suggestions',
    'fintrack_consolidated_items',
    'fintrack_people_list'
];

/**
 * Export all FinTrack state as JSON
 * @returns {string} JSON string of all state
 */
export function exportStateAsJSON() {
    const state = {};

    STORAGE_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
            try {
                state[key] = JSON.parse(value);
            } catch (e) {
                state[key] = value;
            }
        }
    });

    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        version: '1.0',
        state
    }, null, 2);
}

/**
 * Generate a detailed markdown snapshot with transaction-level detail
 * @param {Object[]} transactions - Array of all transactions
 * @param {Object[]} recurringItems - Array of processed recurring items
 * @returns {string} Markdown document
 */
export function generateDetailedSnapshot(transactions, recurringItems) {
    const lines = [];
    const now = new Date();

    // Header
    lines.push(`# FinTrack Configuration Snapshot`);
    lines.push(`**Exported:** ${now.toLocaleString()}`);
    lines.push(`**Total Transactions:** ${transactions.length}`);
    lines.push(`**Recurring Items:** ${recurringItems.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Get state from localStorage
    const approvedItems = JSON.parse(localStorage.getItem('fintrack_recurring_approved') || '[]');
    const deniedItems = JSON.parse(localStorage.getItem('fintrack_recurring_denied') || '[]');
    const mergedSubscriptions = JSON.parse(localStorage.getItem('fintrack_merged_subscriptions') || '{}');
    const splitSubscriptions = JSON.parse(localStorage.getItem('fintrack_split_subscriptions') || '{}');
    const globalRenames = JSON.parse(localStorage.getItem('fintrack_global_renames') || '{}');
    const categoryOverrides = JSON.parse(localStorage.getItem('fintrack_category_overrides') || '{}');
    const chargeAssignments = JSON.parse(localStorage.getItem('fintrack_charge_assignments') || '{}');
    const manualRecurring = JSON.parse(localStorage.getItem('fintrack_manual_recurring') || '[]');

    // Summary Section
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Approved Items | ${approvedItems.length} |`);
    lines.push(`| Denied Items | ${deniedItems.length} |`);
    lines.push(`| Merged Items | ${Object.keys(mergedSubscriptions).length} |`);
    lines.push(`| Split Items | ${Object.keys(splitSubscriptions).length} |`);
    lines.push(`| Renames | ${Object.keys(globalRenames).length} |`);
    lines.push(`| Category Overrides | ${Object.keys(categoryOverrides).length} |`);
    lines.push(`| Manual Recurring | ${manualRecurring.length} |`);
    lines.push(`| Transaction Assignments | ${Object.keys(chargeAssignments).length} |`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Renames Section
    if (Object.keys(globalRenames).length > 0) {
        lines.push('## Renames');
        lines.push('');
        lines.push('| Original | Display Name | Amount |');
        lines.push('|----------|--------------|--------|');
        Object.entries(globalRenames).forEach(([key, value]) => {
            lines.push(`| ${value.originalMerchant || key} | **${value.displayName}** | $${value.amount?.toFixed(2) || 'N/A'} |`);
        });
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    // Category Overrides Section
    if (Object.keys(categoryOverrides).length > 0) {
        lines.push('## Category Overrides');
        lines.push('');
        lines.push('| Item | Category |');
        lines.push('|------|----------|');
        Object.entries(categoryOverrides).forEach(([key, category]) => {
            lines.push(`| ${key} | **${category}** |`);
        });
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    // Merged Items Section - Detailed
    if (Object.keys(mergedSubscriptions).length > 0) {
        lines.push('## Merged Items (Detailed)');
        lines.push('');

        Object.entries(mergedSubscriptions).forEach(([targetKey, merge]) => {
            lines.push(`### ${merge.displayName || targetKey}`);
            lines.push('');
            lines.push(`- **Target Key:** \`${targetKey}\``);
            lines.push(`- **Created:** ${merge.createdAt || 'Unknown'}`);
            lines.push(`- **Merged From:** ${merge.mergedFrom?.join(', ') || 'N/A'}`);
            lines.push('');

            // Find all transactions assigned to this merged item
            const assignedTxnIds = Object.entries(chargeAssignments)
                .filter(([_, target]) => target === targetKey)
                .map(([txnId]) => txnId);

            if (assignedTxnIds.length > 0) {
                lines.push('**Transactions:**');
                lines.push('');
                lines.push('| Date | Amount | Description | Original Merchant |');
                lines.push('|------|--------|-------------|-------------------|');

                // Find matching transactions
                transactions.forEach(txn => {
                    // Skip transactions with missing required fields
                    if (!txn || txn.amount === undefined || txn.amount === null) return;

                    const txnDate = txn.date instanceof Date ? txn.date : new Date(txn.date);
                    const txnAmount = typeof txn.amount === 'number' ? txn.amount : parseFloat(txn.amount) || 0;
                    const txnDesc = txn.description || '';

                    if (assignedTxnIds.some(id => id.includes(txnDesc.substring(0, 10)) && id.includes(Math.abs(txnAmount).toFixed(2)))) {
                        const dateStr = txnDate instanceof Date && !isNaN(txnDate)
                            ? txnDate.toLocaleDateString()
                            : String(txn.date);
                        lines.push(`| ${dateStr} | $${Math.abs(txnAmount).toFixed(2)} | ${txnDesc.substring(0, 40) || 'N/A'} | ${txn.merchant || 'N/A'} |`);
                    }
                });
            }
            lines.push('');
        });
        lines.push('---');
        lines.push('');
    }

    // Per-Item Detail Section
    lines.push('## All Recurring Items (Detailed)');
    lines.push('');

    recurringItems.forEach(item => {
        const isApproved = approvedItems.includes(item.merchantKey);
        const isDenied = deniedItems.includes(item.merchantKey);
        const isMerged = mergedSubscriptions[item.merchantKey];
        const rename = globalRenames[item.merchantKey];
        const category = categoryOverrides[item.merchantKey] || item.category;

        lines.push(`### ${item.displayName || item.merchant}`);
        lines.push('');
        lines.push(`- **Merchant Key:** \`${item.merchantKey}\``);
        lines.push(`- **Status:** ${isApproved ? '✅ Approved' : isDenied ? '❌ Denied' : '⏳ Pending'}`);
        lines.push(`- **Frequency:** ${item.frequency}`);
        lines.push(`- **Category:** ${category || 'UNKNOWN'}`);
        lines.push(`- **Latest Amount:** $${item.latestAmount?.toFixed(2) || 'N/A'}`);
        if (rename) {
            lines.push(`- **Renamed From:** ${rename.originalMerchant}`);
        }
        if (isMerged) {
            lines.push(`- **Is Merged Target:** Yes (from: ${isMerged.mergedFrom?.join(', ')})`);
        }
        lines.push('');

        // Transaction details
        if (item.allTransactions && item.allTransactions.length > 0) {
            lines.push('**Transactions:**');
            lines.push('');
            lines.push('| Date | Amount | Description |');
            lines.push('|------|--------|-------------|');

            item.allTransactions
                .filter(txn => txn && txn.amount !== undefined && txn.amount !== null)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .forEach(txn => {
                    const txnDate = txn.date instanceof Date ? txn.date : new Date(txn.date);
                    const txnAmount = typeof txn.amount === 'number' ? txn.amount : parseFloat(txn.amount) || 0;
                    const dateStr = txnDate instanceof Date && !isNaN(txnDate)
                        ? txnDate.toLocaleDateString()
                        : String(txn.date);
                    lines.push(`| ${dateStr} | $${Math.abs(txnAmount).toFixed(2)} | ${txn.description?.substring(0, 50) || 'N/A'} |`);
                });
            lines.push('');
        }
        lines.push('');
    });

    lines.push('---');
    lines.push('');

    // Charge Assignments Detail
    lines.push('## Charge Assignments');
    lines.push('');
    lines.push('Shows which transactions were explicitly assigned to items (via merge, reassign, gap-fill, etc.)');
    lines.push('');

    // Group by target
    const byTarget = {};
    Object.entries(chargeAssignments).forEach(([txnId, target]) => {
        if (!byTarget[target]) byTarget[target] = [];
        byTarget[target].push(txnId);
    });

    Object.entries(byTarget).forEach(([target, txnIds]) => {
        lines.push(`### ${target}`);
        lines.push('');
        lines.push(`${txnIds.length} transactions assigned:`);
        lines.push('');
        txnIds.slice(0, 20).forEach(id => {
            lines.push(`- \`${id}\``);
        });
        if (txnIds.length > 20) {
            lines.push(`- ... and ${txnIds.length - 20} more`);
        }
        lines.push('');
    });

    // Manual Recurring
    if (manualRecurring.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Manual Recurring Items');
        lines.push('');
        manualRecurring.forEach(item => {
            lines.push(`- **${item.displayName || item.merchant}** (\`${item.merchantKey}\`) - $${item.amount?.toFixed(2) || 'N/A'}`);
        });
        lines.push('');
    }

    // Restoration Instructions
    lines.push('---');
    lines.push('');
    lines.push('## How to Restore');
    lines.push('');
    lines.push('### Option 1: Automatic (JSON Backup)');
    lines.push('1. Open browser console in FinTrack');
    lines.push('2. Run: `restoreFromBackup(jsonString)` with the exported JSON');
    lines.push('3. Refresh the page');
    lines.push('');
    lines.push('### Option 2: Manual Recreation');
    lines.push('Use the Recurring tab tools:');
    lines.push('1. Import your CSV transactions');
    lines.push('2. Approve items from the pending list');
    lines.push('3. Use the merge tool to combine items (select 2+ → Merge Selected)');
    lines.push('4. Use rename (pencil icon) to change display names');
    lines.push('5. Use category dropdown to assign categories');
    lines.push('');
    lines.push('Refer to the detailed sections above for exact items and transactions.');

    return lines.join('\n');
}

/**
 * Reset all FinTrack state to fresh
 */
export function resetToFresh() {
    STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(key);
    });
    console.log('🗑️ All FinTrack state cleared. Refresh the page to start fresh.');
}

/**
 * Restore state from JSON backup
 * @param {string} jsonString - The exported JSON string
 */
export function restoreFromBackup(jsonString) {
    try {
        const backup = JSON.parse(jsonString);

        if (!backup.state) {
            console.error('Invalid backup format');
            return false;
        }

        Object.entries(backup.state).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
        });

        console.log(`✅ Restored ${Object.keys(backup.state).length} state keys from backup (${backup.exportedAt})`);
        return true;
    } catch (e) {
        console.error('Failed to restore from backup:', e);
        return false;
    }
}

/**
 * Download a string as a file
 * @param {string} content - Content to download
 * @param {string} filename - Name of the file
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
