# Learnings: Fix transformClaudeResponse Error Passthrough

## [2026-02-10] Task 1-3: Complete Fix Implementation

### Conventions & Patterns Discovered

1. **Response.ok is the standard check for HTTP success**
   - `response.ok` returns `true` for status codes 200-299
   - This is cleaner than manually checking `response.status >= 200 && response.status < 300`
   - Pattern: Place error early returns immediately after null/undefined checks

2. **Stream transformation only needed for successful responses**
   - The `mcp_` prefix stripping is ONLY relevant for 2xx responses with tool-use content
   - Error responses should pass through completely unchanged to preserve error metadata
   - The AI SDK relies on reading error response bodies to classify errors

3. **Test organization patterns in this project**
   - Use `describe()` for function grouping
   - Use nested `describe()` for scenario categories
   - Test files import from `../../lib/...` (relative path from tests/unit/)
   - Use `vitest` framework: `import { describe, it, expect } from "vitest"`

4. **Pre-existing test failures don't block unrelated work**
   - `omo-config-sync.test.ts` has a `vi.mocked` error (likely vitest version compatibility)
   - Verified this failure existed BEFORE our changes by stashing and testing on clean main
   - Our test file passes cleanly (32/32 tests)
   - Documented but not fixed (out of scope for this plan)

### Gotchas & Edge Cases

1. **ReadableStream wrapper breaks error parsing**
   - Wrapping ALL responses (including errors) in a new ReadableStream prevents the AI SDK from reading error bodies correctly
   - The AI SDK needs the ORIGINAL response object to classify errors as `ContextOverflowError`
   - Solution: Early return for non-2xx before creating any streams

2. **Both index.ts and index.minimal.ts use the same shared function**
   - No need to modify both files separately
   - Single fix in `lib/request/claude-tools-transform.ts` covers both entry points
   - This is the correct pattern for shared utilities

3. **Test body reading requires await**
   - When testing Response objects, must use `await response.text()` to read body
   - Body can only be read once (stream is consumed)
   - For tests comparing body content, read once and compare the string

### Technical Decisions

1. **Placement of the `!response.ok` check**
   - Positioned after `!response.body` check (line 111-113)
   - Before stream creation logic (line 118+)
   - This ordering makes logical sense: null checks first, then success/error branching

2. **No error body parsing in the transform function**
   - We do NOT attempt to parse or inspect error bodies
   - We do NOT add logging or retry logic
   - The function's job is ONLY to pass errors through unchanged
   - Error handling belongs upstream in the AI SDK and oh-my-opencode

3. **Test coverage approach**
   - Cover both `transformClaudeResponse` (14 tests) and `transformClaudeRequest` (18 tests)
   - Test error cases (400, 500, 404, network errors)
   - Test success cases (with/without mcp_ prefix)
   - Test edge cases (no body, empty body, redirects, malformed responses)
   - Total: 32 comprehensive tests

### Recovery Chain Understanding

```
Error Flow (How Recovery Works):
1. Claude API returns 400 error (e.g., token limit exceeded)
2. Our fix: transformClaudeResponse passes error unchanged
3. AI SDK (@ai-sdk/anthropic) reads error body
4. AI SDK calls MessageV2.fromError() to classify
5. If token limit: Creates ContextOverflowError
6. Error emitted as Session.Event.Error
7. oh-my-opencode hook catches ContextOverflowError
8. oh-my-opencode triggers 3-phase recovery:
   - Phase 1: DCP (Dynamic Context Pruning)
   - Phase 2: Truncation (if DCP insufficient)
   - Phase 3: Summarization (if truncation insufficient)
9. Conversation continues automatically
```

### Verification Strategy

1. **Test our changes first**
   - Run: `bun test tests/unit/claude-tools-transform.test.ts`
   - Ensures our new code works correctly in isolation
   - Fast feedback (12ms vs 148ms for full suite)

2. **Then verify project health**
   - TypeScript typecheck: `bun run typecheck`
   - Full build: `bun run build`
   - Full test suite: `bun test` (with caveat about pre-existing failure)

3. **Document pre-existing issues**
   - Don't let unrelated failures block completion
   - Verify the failure existed before our changes
   - Document clearly what's our responsibility vs. what's pre-existing

### Files Changed

1. **lib/request/claude-tools-transform.ts** (+4 lines)
   - Added early return for non-2xx responses
   - Lines 115-117: `if (!response.ok) { return response; }`

2. **tests/unit/claude-tools-transform.test.ts** (+432 lines)
   - New comprehensive test suite
   - 32 tests covering all scenarios

### Commit Details

- **Hash**: 4ba1880e42a0762aa440ad7f848cceaea48283d6
- **Message**: fix(claude): skip stream wrapping for error responses to preserve error format
- **Files**: 2 changed, 436 insertions(+)
- **Branch**: main (1 commit ahead of origin/main)
