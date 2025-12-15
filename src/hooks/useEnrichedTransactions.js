/**
 * Hook that provides transactions enriched with effective names.
 * 
 * Use this hook instead of useTransactions() when you need transactions
 * with effectiveMerchant and effectiveCategory pre-applied.
 * 
 * This ensures consistency between:
 * - Sankey Flow diagram
 * - Dashboard charts
 * - Transaction Table
 * - Calendar View
 */

import { useMemo } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { enrichTransactions } from '../utils/effectiveNameResolver';

/**
 * Returns transactions with effective names pre-computed
 * @returns {Object} All context values plus enriched transactions
 */
export function useEnrichedTransactions() {
    const context = useTransactions();

    const {
        transactions,
        globalRenames,
        mergedSubscriptions,
        chargeAssignments,
        manualRecurring,
        categoryOverrides
    } = context;

    // Memoize enriched transactions - only recompute when dependencies change
    const enrichedTransactions = useMemo(() => {
        return enrichTransactions(transactions, {
            globalRenames,
            mergedSubscriptions,
            chargeAssignments,
            manualRecurring,
            categoryOverrides
        });
    }, [transactions, globalRenames, mergedSubscriptions, chargeAssignments, manualRecurring, categoryOverrides]);

    // Return all context values, but with enriched transactions
    return {
        ...context,
        transactions: enrichedTransactions,
        rawTransactions: transactions // Expose raw transactions if needed
    };
}

export default useEnrichedTransactions;
