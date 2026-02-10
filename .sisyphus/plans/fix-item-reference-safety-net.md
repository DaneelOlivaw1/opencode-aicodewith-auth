# Fix: item_reference Still Leaking to API (v0.1.53)

## TL;DR

> **Quick Summary**: Despite v0.1.52 adding `sanitizeItemIds()` to filter `item_reference` entries, the bug persists. User captured the outgoing HTTP request via proxy and `item_reference` is STILL in the body. The fix needs: (1) reproduce the bug first with a curl test, (2) identify why the filter isn't working, (3) fix it, (4) verify with curl against a real OpenCode HTTP server.
> 
> **Deliverables**:
> - Bug reproduction via curl against OpenCode HTTP server
> - Root cause fix (likely silent catch swallowing errors in `transformRequestForCodex`)
> - Safety-net sanitization that works even when full transformation fails
> - E2E verification via curl proving the fix works
> - Version bump to 0.1.53, commit and push
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential (debugging requires step-by-step)
> **Critical Path**: Task 0 → Task 1 → Task 2 → Task 3 → Task 4

---

## Context

### Original Request
User reports the "Item with id not found" error STILL occurs with GPT-5.3 Codex during multi-turn conversations, despite the v0.1.52 fix. User captured the outgoing HTTP request via proxy (`--proxy http://localhost:9090`) and the `item_reference` entry is STILL present in the request body being sent to the API.

### Key Evidence from Captured Curl

The outgoing request body (AFTER our plugin should have transformed it) contains:
```json
{"type":"item_reference","id":"msg_062420f006f4f47201698af8acf180819186b552452948a2c0"}
```

This should have been filtered by `sanitizeItemIds()` at line 116 of `request-transformer.ts`:
```typescript
.filter((item) => item.type !== "item_reference")
```

### Hypothesis: Silent Catch Block

`transformRequestForCodex()` in `fetch-helpers.ts` has a silent `catch {}` (line 47) that returns `undefined` on ANY error. When it returns `undefined`, `index.ts` line 348 falls back to the ORIGINAL untransformed request:
```typescript
const requestInit = transformation?.updatedInit ?? init  // ← uses ORIGINAL request if transform fails
```

### Files Involved
- `lib/request/fetch-helpers.ts:23-50` - `transformRequestForCodex` with silent catch
- `lib/request/request-transformer.ts:97-147` - `sanitizeItemIds` (the filter)
- `lib/request/request-transformer.ts:213-264` - `transformRequestBody` (the pipeline)
- `index.ts:346-367` - Codex fetch handler
- `tests/docker/smoke-test.ts` - Example of `createOpencodeServer` usage for E2E testing

---

## Work Objectives

### Core Objective
1. **Reproduce** the bug by sending a multi-turn request with `item_reference` through the plugin
2. **Fix** the root cause so `item_reference` is ALWAYS stripped
3. **Verify** the fix with a real curl test against OpenCode HTTP server

### Must Have
- Bug reproduction BEFORE fixing
- Safety-net sanitization that works even when full transformation fails
- E2E curl verification AFTER fixing
- Debug logging in catch block

### Must NOT Have (Guardrails)
- Do NOT remove existing `sanitizeItemIds` function
- Do NOT add `as any` or `@ts-ignore`
- Do NOT skip the reproduction step — we need to understand WHY the filter isn't working

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest + `createOpencodeServer` for E2E)
- **Automated tests**: YES (unit tests + manual curl verification)
- **Framework**: vitest for unit, curl for E2E

---

## TODOs

- [x] 0. Reproduce the bug: call transformRequestForCodex with the exact captured request body

  **What to do**:
  - Create a small reproduction script (or add to tests) that:
    1. Takes the EXACT request body from the user's captured curl (with `item_reference` in the input array)
    2. Calls `transformRequestForCodex({ body: JSON.stringify(capturedBody) })` directly
    3. Parses the output and checks if `item_reference` is still present
    4. If it IS present → the bug is in our transform pipeline
    5. If it is NOT present → the bug is that the user hasn't updated, or there's a different code path
  - Also enable `DEBUG_CODEX_PLUGIN=1` and check if the catch block is being hit
  - Run with: `bun run` the script or `bun test` the test

  **Why this matters**: We MUST understand the root cause before fixing. Blindly adding safety nets without understanding why the existing filter doesn't work will lead to more bugs.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Debugging requires careful analysis and reproduction
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 1
  - **Blocked By**: None

  **References**:
  - `lib/request/fetch-helpers.ts:23-50` - `transformRequestForCodex` function
  - `lib/request/request-transformer.ts:97-147` - `sanitizeItemIds` function
  - User's captured curl body (in the conversation context — the `--data-raw` JSON)

  **Acceptance Criteria**:
  - [x] Reproduction script/test exists and runs
  - [x] Root cause is identified: either (a) transform is silently failing, (b) filter has a bug, or (c) user hasn't updated
  - [x] Findings documented in console output

  **Commit**: NO (investigation only)

- [x] 1. Fix the root cause + add safety-net sanitization

  **What to do** (based on reproduction findings):
  
  **If transform is silently failing (most likely)**:
  - In `fetch-helpers.ts`, modify the catch block in `transformRequestForCodex()`:
    1. Log the error via `logDebug` so failures are visible
    2. Instead of returning `undefined`, perform a minimal sanitization:
       - Parse the body JSON
       - Delete `previousResponseId` and `previous_response_id`
       - Filter `item_reference` from `input` array
       - Strip `id` fields from non-call items
       - Return the sanitized body
  - Add a new exported function `sanitizeRequestBody(bodyStr: string): string` that does the minimal sanitization above, with its own try/catch returning the original string on failure
  
  **Additionally (safety net in index.ts)**:
  - In `index.ts` codex fetch handler, after `const requestInit = transformation?.updatedInit ?? init`:
    - If `transformation` is `undefined`, apply `sanitizeRequestBody` to `init.body` before sending

  **Must NOT do**:
  - Do NOT change the existing `sanitizeItemIds` function
  - Do NOT change the existing `transformRequestBody` function
  - Do NOT remove any existing logic

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding the full request pipeline
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 2
  - **Blocked By**: Task 0

  **References**:
  - `lib/request/fetch-helpers.ts:23-50` - `transformRequestForCodex` with silent catch
  - `lib/request/request-transformer.ts:97-147` - `sanitizeItemIds` (pattern to follow)
  - `index.ts:346-367` - Codex request handler
  - `lib/logger.ts:66` - `logDebug` function
  - `lib/types.ts:22-50` - Type definitions

  **Acceptance Criteria**:
  - [x] `sanitizeRequestBody` function exists in `fetch-helpers.ts`
  - [x] Catch block logs errors via `logDebug`
  - [x] When transformation fails, request body is still sanitized
  - [x] `lsp_diagnostics` clean on all modified files

  **Commit**: NO (commit with tests in Task 2)

- [x] 2. Add unit tests + verify with curl against OpenCode HTTP server

  **What to do**:
  
  **Unit tests** (in `tests/unit/`):
  - Test `sanitizeRequestBody` removes `item_reference` from input array
  - Test `sanitizeRequestBody` removes `previousResponseId` from top level
  - Test `sanitizeRequestBody` returns original string on parse failure
  - Test `sanitizeRequestBody` handles missing input array
  - Test `transformRequestForCodex` returns sanitized body even when internal transform throws

  **E2E curl verification** (CRITICAL — this is what the user asked for):
  - Write a small script `tests/repro-item-reference.ts` that:
    1. Starts an OpenCode HTTP server via `createOpencodeServer` (see `tests/docker/smoke-test.ts` for pattern)
    2. Sets up auth with a test API key
    3. Uses the OpenCode SDK client to send a prompt
    4. Intercepts the outgoing fetch call (via custom fetch in provider settings) to capture the request body being sent to the API
    5. Verifies the captured body does NOT contain `item_reference` or `previousResponseId`
    6. OR: simpler approach — just call `transformRequestForCodex` with the exact captured body and verify output
  - Run: `bun tests/repro-item-reference.ts`

  **Simpler alternative for curl test**:
  - After building (`bun run build`), write a test that imports the built `dist/index.js` and calls the transform function with the exact captured request body, verifying the output is clean

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Mix of unit tests and E2E verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `tests/unit/request-transformer.test.ts` - Existing test patterns
  - `tests/docker/smoke-test.ts` - `createOpencodeServer` usage pattern
  - `lib/request/fetch-helpers.ts` - Functions to test

  **Acceptance Criteria**:
  - [x] Unit tests for `sanitizeRequestBody` pass
  - [x] E2E/integration test proves `item_reference` is stripped from outgoing requests
  - [x] All existing tests still pass: `bun run test`
  - [x] No test deletions

  **Commit**: YES
  - Message: `fix(codex): add safety-net sanitization to prevent item_reference leaking to API`
  - Files: `lib/request/fetch-helpers.ts`, `index.ts`, `tests/unit/*.test.ts`
  - Pre-commit: `bun run test && bun run build`

- [x] 3. Bump version, build, and push

  **What to do**:
  - Bump version in `package.json` from `0.1.52` to `0.1.53`
  - Run full verification: `bun run build && bun run test && bun run typecheck`
  - Commit and push to main

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple version bump and deploy
  - **Skills**: [`git-master`]
    - `git-master`: Needed for commit and push operations

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:
  - `package.json:3` - Version field

  **Acceptance Criteria**:
  - [x] Version is `0.1.53` in package.json
  - [x] `bun run build` exits 0
  - [x] `bun run test` all pass
  - [x] `bun run typecheck` exits 0
  - [x] Changes committed and pushed to main

  **Commit**: YES
  - Message: `chore: bump version to 0.1.53`
  - Files: `package.json`
  - Pre-commit: `bun run build && bun run test`

- [x] 4. Final E2E verification (post-deploy)

  **What to do**:
  - After pushing, verify the fix works end-to-end:
    1. Run `bun run build` to get fresh dist
    2. Run the reproduction test from Task 0 again to confirm it passes
    3. Optionally: if OpenCode server can be started locally, send a multi-turn conversation and verify no `item_reference` errors

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 3

  **Acceptance Criteria**:
  - [x] Reproduction test passes (item_reference is stripped)
  - [x] Build output in `dist/index.js` contains the safety-net code

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `fix(codex): add safety-net sanitization to prevent item_reference leaking to API` | fetch-helpers.ts, index.ts, tests | bun run test && bun run build |
| 3 | `chore: bump version to 0.1.53` | package.json | bun run build |

---

## Success Criteria

### Verification Commands
```bash
bun run test      # Expected: all tests pass
bun run build     # Expected: exit code 0
bun run typecheck # Expected: exit code 0
```

### Final Checklist
- [x] Bug reproduced BEFORE fixing
- [x] Root cause identified and documented
- [x] `item_reference` entries are ALWAYS stripped before API call
- [x] `previousResponseId` is ALWAYS stripped before API call
- [x] Silent catch block now logs errors
- [x] Safety net works even when full transformation fails
- [x] E2E curl/integration test proves the fix works
- [x] All tests pass
- [x] Build succeeds
- [x] Version bumped to 0.1.53
- [x] Changes pushed to main
