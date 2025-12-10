# Pending Changes

Track changes since last commit. Clear after committing.

---

## Current Session Changes

### Calendar Future Projections Fix (2024-12-10)

**Files Modified:**
- `dashboard/src/components/CalendarView.jsx`

**Fix 1: Include splits and merges in projections**
- Added `splitSubscriptions` to context import
- Merged subscriptions now project correctly

**Fix 2: Split subscription timing and amounts**
- Parent subscriptions that were split are now EXCLUDED from projections
- Split children calculate `nextDate` from their assigned transactions
- Amount is derived from actual transaction data
- Frequency is auto-detected from transaction patterns

---

### Merge Dropdown Display Names (2024-12-10)

**Files Modified:**
- `dashboard/src/components/Subscriptions.jsx`

**Fix:**
- Added `globalRenames` to context import
- Created `getEffectiveName()` helper that checks: globalRenames → mergedSubscriptions → displayName → merchant
- Dropdown options now show renamed names correctly
- Pre-fill uses renamed name when selecting existing item

**Tests:** 61/61 passing
- When this list gets long, prompt user to commit
- Clear this file after each successful commit
