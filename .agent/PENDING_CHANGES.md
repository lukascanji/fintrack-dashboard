# Pending Changes

Track changes since last commit. Clear after committing.

---

## Current Session Changes

### Additional Test Coverage (2024-12-10)

**Files Added:**
- `dashboard/src/__tests__/components/calendarProjections.test.js` (7 tests)
- `dashboard/src/__tests__/utils/effectiveName.test.js` (8 tests)

**Coverage:**
- Split/merge exclusion logic for calendar projections
- nextDate calculation from assigned transactions
- getEffectiveName priority order (globalRenames → mergedSubscriptions → displayName → merchant)

**Tests:** 76/76 passing (+15 new)
- When this list gets long, prompt user to commit
- Clear this file after each successful commit
