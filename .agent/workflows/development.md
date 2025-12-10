---
description: Development protocol for FinTrack - changes, testing, committing
---

# FinTrack Development Protocol

## Before Making Changes

1. **Understand scope** - Read the request carefully
2. **For complex features**: Create implementation plan → get user approval
3. **For bug fixes/small changes**: Proceed directly

---

## Development Cycle

### 1. Make Changes
- Keep changes focused (one feature or fix at a time)
- Edit code files as needed

### 2. Verify
```bash
# turbo
npm run test
```
- All tests must pass before proceeding
- Check dev server compiles without errors

### 3. Manual Testing (if UI changes)
- Verify in browser
- Check related areas for side effects

### 4. Add Tests (at discretion)
- **New features**: Add corresponding tests
- **Bug fixes**: Add regression test to prevent recurrence
- **Priority**: User is paranoid about regressions, so err on the side of adding tests

### 5. Update Pending Changes
- Add entry to `/Users/lukas/Desktop/antigravity projects/transaction analysis/.agent/PENDING_CHANGES.md`
- Track: what changed, files modified, tests added

---

## Commit Protocol

### When to Commit
- Check `PENDING_CHANGES.md` periodically
- If substantial changes accumulated, prompt user: "We've made several changes. Ready to commit?"
- User decides when to batch commit

### Commit Message
- Descriptive, summarizes all pending changes
- Format: `feat: ...` or `fix: ...` or `refactor: ...`

### After Commit
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
| Verify | Run tests | `npm run test` |
| Dev server | Check compiles | `npm run dev` |
| Commit | Git commit | `git commit -m "..."` |
| Push | Push to GitHub | `git push` |
