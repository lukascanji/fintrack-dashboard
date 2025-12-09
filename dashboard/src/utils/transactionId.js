/**
 * Generate a consistent, deterministic ID for a transaction.
 * This is used when the transaction doesn't have a native ID from parsing,
 * or when we need to ensure consistent IDs across components.
 * 
 * The ID is based on immutable transaction properties:
 * - date
 * - amount (debit, credit, or amount field)
 * - description (first 20 chars, normalized)
 * 
 * @param {Object} transaction - The transaction object
 * @returns {string} A deterministic ID string
 */
export function getTransactionId(transaction) {
    // If transaction already has an ID, use it
    if (transaction.id) {
        return transaction.id;
    }

    // Generate deterministic ID from transaction properties
    // Normalize date to YYYY-MM-DD format regardless of input
    let dateStr = '';
    if (transaction.date) {
        let dateObj;
        if (transaction.date instanceof Date) {
            dateObj = transaction.date;
        } else {
            // Try parsing the string as a date
            dateObj = new Date(transaction.date);
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
            // Format as YYYY-MM-DD
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
        } else {
            // Fallback: just use the string representation
            dateStr = String(transaction.date);
        }
    }

    const amount = transaction.amount || transaction.debit || transaction.credit || 0;
    const amountStr = Math.abs(parseFloat(amount) || 0).toFixed(2);

    // Normalize description: lowercase, remove special chars, take first 20 chars
    const description = String(transaction.description || transaction.merchant || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);

    return `txn_${dateStr}_${amountStr}_${description}`;
}

/**
 * Ensure a transaction has an ID field set.
 * Mutates the transaction if ID is missing.
 * 
 * @param {Object} transaction - The transaction object
 * @returns {Object} The same transaction with ID ensured
 */
export function ensureTransactionId(transaction) {
    if (!transaction.id) {
        transaction.id = getTransactionId(transaction);
    }
    return transaction;
}
