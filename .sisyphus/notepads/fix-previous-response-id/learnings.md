# Learnings: Fix previousResponseId Issue

## [2026-02-10 17:12] Initial Analysis

### Root Cause
- AI SDK adds `previousResponseId` field at the **top level** of request body during multi-turn conversations
- When `store=false`, previous responses are not persisted, causing "Item not found" errors
- Previous fixes only handled `input` array items, not the top-level field

### Key Insights
- `sanitizeItemIds()` only processes items in `input` array
- `body.store = false` is correctly set
- `previousResponseId` is a top-level field that was completely untouched

### Architecture
- Request transformation happens in `lib/request/request-transformer.ts`
- `transformRequestBody()` is the entry point for body modifications
- Current location of `body.store = false`: lines 227-230

## [2026-02-10 17:13] Task 1 Status Check

### Code Changes - ALREADY COMPLETE ✅
- `lib/request/request-transformer.ts:230-231` already has:
  ```typescript
  delete body.previousResponseId
  delete body.previous_response_id
  ```

### Tests - ALREADY COMPLETE ✅
- `tests/unit/request-transformer.test.ts:320-365` has comprehensive tests:
  - Removes previousResponseId (camelCase)
  - Removes previous_response_id (snake_case)
  - Removes both if both present
  - Preserves other fields

### Next Steps
- Run verification (tests, typecheck, build)
- Bump version from 0.1.51 to 0.1.52
- Commit and push
