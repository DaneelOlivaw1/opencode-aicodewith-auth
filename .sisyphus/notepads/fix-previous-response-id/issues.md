# Issues: Fix previousResponseId Issue

## [2026-02-10 17:12] Known Issues

### Previous Failed Attempts
1. First fix: Added `store` parameter - didn't work
2. Second fix: Added `sanitizeItemIds()` - didn't work
3. Root cause: Both fixes missed the top-level `previousResponseId` field

### Potential Gotchas
- Must handle both camelCase and snake_case versions
- RequestBody type has `[key: string]: unknown` allowing arbitrary fields
- Must verify with actual multi-turn conversation test

## [2026-02-10 17:13] Pre-existing Test Failure

### Issue
- Test: `claude-tools-transform.test.ts > handles response with only status 2xx but empty body`
- Error: `Response constructor: Invalid response status code 204`
- Root cause: Response constructor doesn't accept 204 status with empty body in this environment

### Assessment
- **NOT related to our previousResponseId fix**
- Pre-existing issue in the codebase
- Our new tests (previousResponseId removal) all pass ✅

### Decision
- Fix this test as part of Task 2 to ensure clean test suite
- Then proceed with version bump and commit
