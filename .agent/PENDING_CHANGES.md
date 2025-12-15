# Pending Changes

Track changes since last commit. Clear after committing.

---

## Current Session Changes

### refactor: Unified data transformation layer for effective name propagation

Fixes the architectural inconsistency where Sankey/Dashboard visualizations used raw merchant names while Transactions/Recurring tabs respected renames, merges, and splits.

**New Files:**
- `src/utils/effectiveNameResolver.js` - Centralized name resolution logic
- `src/hooks/useEnrichedTransactions.js` - Hook providing pre-enriched transactions
- `src/__tests__/utils/effectiveNameResolver.test.js` - 17 test cases

**Modified Files:**
- `src/utils/stats.js` - Uses `effectiveMerchant` for merchantBreakdown
- `src/components/SankeyFlow.jsx` - Uses `useEnrichedTransactions` hook
- `src/App.jsx` - Uses `useEnrichedTransactions` for dashboard stats

**Tests:** All 166 unit tests pass (45 new tests added)

---

### feat: Add "send to pending" button for recurring items

**Modified Files:**
- `src/features/recurring/components/RecurringItem.jsx` - Added RotateCcw icon, sendToPending handler, and unapprove button
- `src/components/TransactionTable.jsx` - Fixed isRecurring to only show green badge for approved items

**Tests:** All 121 unit tests pass

---

## Notes
- When this list gets long, prompt user to commit
- Clear this file after each successful commit
