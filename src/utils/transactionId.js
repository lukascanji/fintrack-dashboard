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
    const date = transaction.date instanceof Date
        ? transaction.date.toISOString().split('T')[0]
        : String(transaction.date || '').split('T')[0];

    const amount = transaction.amount || transaction.debit || transaction.credit || 0;
    const amountStr = Math.abs(parseFloat(amount) || 0).toFixed(2);

    // Normalize description: lowercase, remove special chars, take first 20 chars
    const description = String(transaction.description || transaction.merchant || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);

    return `txn_${date}_${amountStr}_${description}`;
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
