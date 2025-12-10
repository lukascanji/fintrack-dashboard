# Pending Changes

Track changes since last commit. Clear after committing.

---

## Current Session Changes

### Unified Subscription Detection (Dec 10, 2024)

**Files Modified:**
1. `dashboard/src/features/recurring/utils/recurringUtils.js`
   - Added 'Frequent' fallback category for items that don't match standard interval patterns
   - Items with 2+ occurrences now always surface in Pending (no early return)
   - Added nextDate calculation for Frequent using average interval

2. `dashboard/src/components/TransactionTable.jsx`
   - Removed `countMatching()` function (no longer needed)
   - Removed `onAddAllRecurring` and `matchCount` props from TransactionRow
   - Enhanced search to also match effective names (renames, splits, merges)

3. `dashboard/src/features/transactions/components/TransactionRow.jsx`
   - Removed orange +N button and related code
   - Removed unused `onAddAllRecurring` and `matchCount` props
   - Fixed Plus import (re-added since still used by single add button)
   - Green recurring badge remains

4. `dashboard/src/features/recurring/utils/recurringUtils.test.js`
   - Added tests for Frequent fallback
   - Updated test for semi-monthly detection (detects as Bi-Weekly)

### Split Modal Dropdown Names (Dec 10, 2024)

**Files Modified:**
1. `dashboard/src/components/Subscriptions.jsx`
   - Added `globalRenames` and `mergedSubscriptions` props to SplitChargesModal
   - Added search and filter state (search, categoryFilter, statusFilter)
   - Added search bar and filter dropdowns (category, status)
   - Added filtered logic using getEffectiveName for search

2. `dashboard/src/components/SplitChargesModal.jsx`
   - Added `globalRenames` and `mergedSubscriptions` props
   - Added `getEffectiveName()` helper for resolving renamed subscription names
   - Passed `getEffectiveName` to child components

3. `dashboard/src/features/split-charges/components/ClusterPatternRow.jsx`
   - Added `getEffectiveName` prop
   - Updated dropdown options to use renamed names

4. `dashboard/src/features/split-charges/components/ChargeRow.jsx`
   - Added `getEffectiveName` prop
   - Updated dropdown options to use renamed names

**77 tests passing**

---

## Notes
- When this list gets long, prompt user to commit
- Clear this file after each successful commit
