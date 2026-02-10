# Issues: fix-item-reference-safety-net

## [2026-02-10] Task 0: Reproduction Findings

### Issue: Code Works But User Reports Bug
- **Symptom**: User captured traffic shows `item_reference` in outgoing request
- **Our Test**: Shows `item_reference` is correctly filtered
- **Gap**: Need to understand why user's experience differs from our test

### Possible Causes
1. **Version mismatch**: User may not be running v0.1.52
2. **Build issue**: dist/ may not contain the fix
3. **Cache issue**: Old plugin code may be cached
4. **Different path**: Request may bypass our transformation

### Investigation Needed
- Check dist/index.js for sanitizeItemIds code
- Verify package.json version
- Test with real OpenCode HTTP server (user demanded this)
