---
description: Development protocol for FinTrack - changes, testing, committing
---

# FinTrack Development Protocol

## Pre-Flight Checklist (BEFORE Making Changes)

### For ANY change:
1. **Read `CODEBASE.md`** section relevant to the area
2. **Run:** `grep -r "functionName" src/` to find usages of code being modified
3. **State in response:** "This change might affect: X, Y, Z"

### High-Risk Areas (Extra Caution Required):
| Area | Why It's Risky | Before Changing |
|------|---------------|-----------------|
| `globalRenames` | 6 components depend on it | List all consumers |
| `merchantSplits` | Affects calendar + search | Test calendar view |
| `mergedSubscriptions` | Hides items from display | Verify merge targets exist |
| `chargeAssignments` | Overrides key lookup | Check TransactionRow behavior |
| `getMerchantKey()` | All recurring detection uses it | Run full test suite |

---

## Development Cycle

### 1. Make Changes
- Keep changes focused (one feature or fix at a time)
- Max 3 files without asking for complex changes
- Edit code files as needed

### 2. Verify
```bash
// turbo
npm run test
```
- All tests must pass before proceeding
- Check dev server compiles without errors

### 3. Manual Testing (if UI changes)
- Verify in browser
- Check related areas for side effects
- For recurring changes: test calendar view too

### 4. Add Tests (prioritize for risky areas)
- **New features**: Add corresponding tests
- **Bug fixes**: Add regression test to prevent recurrence
- **High-risk areas**: Always add tests

### 5. Update Pending Changes
- Add entry to `/Users/lukas/Desktop/antigravity projects/transaction analysis/.agent/PENDING_CHANGES.md`
- Track: what changed, files modified, tests added

---

## Atomic Commit Protocol

### When to Commit
- After EACH discrete fix or feature (not per session)
- Rule of thumb: "If this broke something, could I cleanly revert just this?"
- Prompt user: "This fix is complete—want to commit now?"

### Commit Message Format
- `fix:` for bug fixes (e.g., `fix: resolve Apple TV display in search`)
- `feat:` for new features
- `refactor:` for structural changes
- `docs:` for documentation
- `test:` for test additions

### Why Atomic Commits Matter
- `git bisect` works when tracking down regressions
- Can revert surgical fixes without unwinding unrelated work
- Clearer history for future context

---

## After Commit
- Clear `PENDING_CHANGES.md`
- Prompt user: "Ready to push to GitHub?"

---

## Chronicle Updates

After significant changes are committed:
- Update `PROJECT_CHRONICLE.md` with new entries
- Document: what was added/fixed, date, context

---

## Quick Reference

| Step | Action | Command/Tool |
|------|--------|--------------|
| Pre-flight | Check docs | Read `CODEBASE.md` |
| Usages | Find dependencies | `grep -r "name" src/` |
| Verify | Run tests | `npm run test` |
| Dev server | Check compiles | `npm run dev` |
| Commit | Git commit | `git commit -m "..."` |
| Push | Push to GitHub | `git push` |
