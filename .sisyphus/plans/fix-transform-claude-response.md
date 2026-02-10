# Fix transformClaudeResponse Error Passthrough

## TL;DR

> **Quick Summary**: Fix `transformClaudeResponse()` to skip the ReadableStream wrapper for non-2xx HTTP responses, allowing token limit errors to propagate correctly to the AI SDK and upstream recovery mechanisms.
> 
> **Deliverables**:
> - Fix in `lib/request/claude-tools-transform.ts` (~3 lines)
> - New test file `tests/unit/claude-tools-transform.test.ts`
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - sequential (fix → test → verify)
> **Critical Path**: Task 1 → Task 2 → Task 3

---

## Context

### Original Request
Customer reported that auto-compaction/recovery no longer triggers when conversation context exceeds the 200,000 token limit for Claude models accessed through the aicodewith auth plugin. Error: "prompt is too long: 208749 tokens > 200000 maximum".

### Interview Summary
**Key Discussions**:
- The user can only modify `opencode-aicodewith-auth` (this plugin), not opencode core or oh-my-opencode
- Problem is recent — auto-compaction previously worked
- Customer-reported with only a screenshot available (no logs)
- User chose: fix `transformClaudeResponse` to skip stream wrapping for error responses

**Research Findings**:
- Error recovery chain: API error → AI SDK classifies → ContextOverflowError → Session.Event.Error → oh-my-opencode recovery hook → 3-phase recovery (DCP → Truncation → Summarize)
- `transformClaudeResponse()` wraps ALL responses in a new ReadableStream (including 400 errors)
- The `mcp_` prefix replacement is only needed for successful tool-use responses
- Both `index.ts` and `index.minimal.ts` call the same `transformClaudeResponse` from the shared module — fixing the shared function fixes both

### Metis Review
**Identified Gaps** (addressed):
- `index.minimal.ts` also uses the same function → Confirmed shared module, single fix covers both
- No existing tests for `transformClaudeResponse` → Adding comprehensive test file
- Edge cases: 3xx redirects, status 0, no-body responses → All handled by `response.ok` check

---

## Work Objectives

### Core Objective
Ensure error responses from Claude API (especially token limit errors) pass through unchanged to the AI SDK, enabling proper error classification and triggering of upstream recovery mechanisms.

### Concrete Deliverables
- Modified `lib/request/claude-tools-transform.ts` — `transformClaudeResponse()` returns early for non-2xx responses
- New `tests/unit/claude-tools-transform.test.ts` — covers success, error, and edge case response paths

### Definition of Done
- [x] `bun test` → all tests pass (existing + new)
- [x] `bun run typecheck` → exit code 0
- [x] `bun run build` → exit code 0

### Must Have
- Early return in `transformClaudeResponse()` for non-2xx responses
- Tests covering 400 error passthrough, 200 success transformation, and edge cases

### Must NOT Have (Guardrails)
- Do NOT modify `transformClaudeRequest()` — unrelated to this issue
- Do NOT add logging, retry logic, or error body parsing — recovery is handled upstream
- Do NOT modify `index.ts` or `index.minimal.ts` call sites — the fix belongs in the shared function
- Do NOT refactor the stream transformation logic for success responses
- Do NOT add error response parsing or wrapping — pass through unchanged

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (tests-after, since the fix is 3 lines)
- **Framework**: vitest (via `bun test`)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Verification is done via running test suite, typecheck, and build commands.

---

## Execution Strategy

### Sequential Execution

```
Task 1: Apply the fix (no dependencies)
  ↓
Task 2: Create tests (depends on Task 1)
  ↓
Task 3: Full verification (depends on Task 2)
```

No parallelization needed — this is a 3-step quick fix.

---

## TODOs

- [x] 1. Fix `transformClaudeResponse` to skip stream wrapping for error responses

  **What to do**:
  - In `lib/request/claude-tools-transform.ts`, function `transformClaudeResponse()`
  - After the existing `!response.body` early return (line 111-113), add a new early return:
    ```ts
    if (!response.ok) {
      return response;
    }
    ```
  - This ensures non-2xx responses (400, 413, 429, 500, etc.) are returned unchanged
  - The `mcp_` prefix removal is only needed for successful responses containing tool-use blocks

  **Must NOT do**:
  - Do NOT modify `transformClaudeRequest()` 
  - Do NOT add any logging or error parsing
  - Do NOT change the existing stream transformation logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line addition to an existing function
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2, Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `lib/request/claude-tools-transform.ts:110-146` — The `transformClaudeResponse` function to modify. The existing `!response.body` check at line 111-113 shows the pattern for early returns.

  **API/Type References**:
  - `Response.ok` — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Response/ok) — Returns `true` for HTTP status 200-299

  **Context References**:
  - `index.ts:392-394` — Claude request handling that calls `transformClaudeResponse`. Note: does NOT check `response.ok` before calling, so the function itself must handle it.
  - `index.minimal.ts:392` — Same call pattern, same shared function

  **WHY Each Reference Matters**:
  - `claude-tools-transform.ts:110-146`: This is the EXACT function to modify. The early return pattern at line 111-113 shows where to add the new check.
  - `index.ts:392-394`: Shows that the function is called unconditionally after `fetch()` — confirming the function must handle non-2xx internally.

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify the code change was applied correctly
    Tool: Bash (grep)
    Preconditions: File exists at lib/request/claude-tools-transform.ts
    Steps:
      1. Read the file and verify `!response.ok` check exists after `!response.body` check
      2. Verify the check returns `response` directly (not a new Response)
    Expected Result: The function has the early return for non-2xx responses
    Evidence: File content captured
  ```

  **Commit**: YES
  - Message: `fix(claude): skip stream wrapping for non-2xx error responses`
  - Files: `lib/request/claude-tools-transform.ts`
  - Pre-commit: `bun run typecheck`

---

- [x] 2. Create comprehensive tests for `transformClaudeResponse` and `transformClaudeRequest`

  **What to do**:
  - Create `tests/unit/claude-tools-transform.test.ts`
  - Test cases for `transformClaudeResponse`:
    - **400 error passthrough**: Response with `status: 400` and JSON error body → returned unchanged, body content identical
    - **500 error passthrough**: Response with `status: 500` → returned unchanged
    - **200 success with mcp_ prefix**: Response with `status: 200` and body containing `"name": "mcp_bash"` → body contains `"name": "bash"` (prefix stripped)
    - **200 success without mcp_ prefix**: Response with `status: 200` and body without `mcp_` → body unchanged
    - **No body**: Response with no body → returned as-is
    - **Error response with mcp_ text**: 400 response whose error body happens to contain `mcp_` text → NOT modified (because non-2xx)
  - Test cases for `transformClaudeRequest`:
    - Request with tools → tools get `mcp_` prefix
    - Request with tool_use content blocks → names get `mcp_` prefix
    - Request with metadata → `user_id` injected
    - Request with no body → returned as-is

  **Must NOT do**:
  - Do NOT create integration tests or tests requiring API calls
  - Do NOT modify any production code

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard unit test creation following existing patterns
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `tests/unit/request-transformer.test.ts:1-7` — Test file pattern: `import { describe, it, expect } from "vitest"`, imports from `../../lib/...`
  
  **API/Type References**:
  - `lib/request/claude-tools-transform.ts` — The functions being tested: `transformClaudeRequest` and `transformClaudeResponse`
  - `Response` — Web API Response constructor for creating test responses

  **WHY Each Reference Matters**:
  - `request-transformer.test.ts`: Shows the exact import pattern and test structure used in this project
  - `claude-tools-transform.ts`: The source of truth for function signatures and behavior

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All new tests pass
    Tool: Bash (bun test)
    Preconditions: Test file created at tests/unit/claude-tools-transform.test.ts
    Steps:
      1. Run: bun test tests/unit/claude-tools-transform.test.ts
      2. Assert: exit code 0
      3. Assert: output contains test count with 0 failures
    Expected Result: All tests pass
    Evidence: Terminal output captured

  Scenario: Error response passthrough test is correct
    Tool: Bash (bun test)
    Preconditions: Test file exists
    Steps:
      1. Run: bun test tests/unit/claude-tools-transform.test.ts -t "400"
      2. Assert: test passes
      3. Assert: response body is unchanged
    Expected Result: 400 error response passes through without modification
    Evidence: Terminal output captured
  ```

  **Commit**: YES (group with Task 1)
  - Message: `test(claude): add unit tests for claude-tools-transform`
  - Files: `tests/unit/claude-tools-transform.test.ts`
  - Pre-commit: `bun test`

---

- [x] 3. Full verification: tests, typecheck, build

  **What to do**:
  - Run the complete verification suite:
    1. `bun test` — all test suites pass
    2. `bun run typecheck` — no TypeScript errors
    3. `bun run build` — build succeeds

  **Must NOT do**:
  - Do NOT make any code changes in this task
  - Do NOT skip any verification step

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Just running verification commands
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 2

  **References**:
  
  **Pattern References**:
  - `package.json:29-31` — Script definitions: `test`, `typecheck`, `build`

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Full test suite passes
    Tool: Bash
    Preconditions: Tasks 1 and 2 complete
    Steps:
      1. Run: bun test
      2. Assert: exit code 0
      3. Assert: output shows all test suites pass, 0 failures
    Expected Result: All existing + new tests pass
    Evidence: Terminal output captured

  Scenario: Type checking passes
    Tool: Bash
    Preconditions: Task 1 complete
    Steps:
      1. Run: bun run typecheck
      2. Assert: exit code 0
    Expected Result: No TypeScript errors
    Evidence: Terminal output captured

  Scenario: Build succeeds
    Tool: Bash
    Preconditions: Task 1 complete
    Steps:
      1. Run: bun run build
      2. Assert: exit code 0
      3. Assert: dist/ directory contains updated files
    Expected Result: Build completes successfully
    Evidence: Terminal output captured
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1+2 | `fix(claude): skip stream wrapping for error responses to preserve error format` | `lib/request/claude-tools-transform.ts`, `tests/unit/claude-tools-transform.test.ts` | `bun test && bun run typecheck && bun run build` |

---

## Success Criteria

### Verification Commands
```bash
bun test                    # Expected: all tests pass, 0 failures
bun run typecheck           # Expected: exit code 0
bun run build               # Expected: exit code 0
```

### Final Checklist
- [x] `transformClaudeResponse()` returns early for non-2xx responses
- [x] No `mcp_` stripping occurs on error response bodies
- [x] All existing tests still pass
- [x] New tests cover 400 passthrough, 200 transformation, and edge cases
- [x] TypeScript types are clean
- [x] Build produces valid output
