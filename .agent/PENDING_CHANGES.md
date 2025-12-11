# Pending Changes

Track changes since last commit. Clear after committing.

---

## Current Session Changes

### feat: Add click-outside-to-close behavior to dropdowns

**New Files:**
- `src/hooks/useClickOutside.js` - Reusable hook for detecting clicks outside an element
- `src/components/DropdownPortal.jsx` - Portal component to render dropdowns at document.body level (fixes z-index stacking issues)

**Modified Files:**
- `src/features/transactions/components/TransactionRow.jsx` - Added click-outside for category and person dropdowns
- `src/features/recurring/components/RecurringItem.jsx` - Refactored category, share, and email dropdowns to use DropdownPortal
- `src/features/recurring/components/RecurringItem.module.css` - Added hasOpenDropdown class (unused after portal refactor)
- `src/features/recurring/components/RecurringList.jsx` - Minor styling update

**Tests:** All 121 unit tests pass

---

## Notes
- When this list gets long, prompt user to commit
- Clear this file after each successful commit
