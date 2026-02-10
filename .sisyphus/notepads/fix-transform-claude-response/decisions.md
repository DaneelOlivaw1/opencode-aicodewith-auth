# Decisions: Fix transformClaudeResponse Error Passthrough

## [2026-02-10] Architectural Decisions

### Decision 1: Use response.ok check instead of status code range check

**Context**: Need to distinguish between success (2xx) and error (non-2xx) responses

**Options Considered**:
1. `response.status >= 200 && response.status < 300`
2. `response.ok`
3. Explicit status code checks for known errors (400, 413, 429, 500, etc.)

**Decision**: Use `response.ok`

**Rationale**:
- Standard Web API property specifically designed for this purpose
- More concise and readable
- Handles all 2xx codes correctly (including uncommon ones like 201, 204, 206, etc.)
- Handles all non-2xx codes correctly (3xx, 4xx, 5xx)
- Less error-prone than manual range checking

**Trade-offs**:
- None - this is the idiomatic approach

---

### Decision 2: Early return pattern (no wrapper, no new Response)

**Context**: How to pass error responses through unchanged

**Options Considered**:
1. Return the original response directly
2. Create a new Response with copied properties
3. Set a flag and conditionally apply stream transformation

**Decision**: Return original response directly with early return

**Rationale**:
- Preserves ALL response properties (headers, status, statusText, body, etc.)
- No risk of missing metadata during copying
- Simplest implementation (3 lines)
- Fastest execution path (no unnecessary object creation)
- Clear intent: "if error, do nothing, pass through"

**Trade-offs**:
- None - this is the optimal approach

---

### Decision 3: Placement after !response.body check

**Context**: Where to place the `!response.ok` check in the function

**Options Considered**:
1. First check in the function
2. After `!response.body` check
3. After stream creation

**Decision**: After `!response.body` check, before stream creation

**Rationale**:
- Logical ordering: null/undefined checks first, then branching logic
- Follows existing pattern (the `!response.body` check is already there)
- Prevents creating streams for error responses
- Matches the existing code structure

**Trade-offs**:
- Could technically be first, but placing after `!response.body` matches existing style

---

### Decision 4: No error body inspection or parsing

**Context**: Should the transform function look inside error bodies?

**Options Considered**:
1. Parse error body to check for specific error types
2. Add logging for error responses
3. Pass through unchanged without inspection

**Decision**: Pass through unchanged without inspection

**Rationale**:
- Separation of concerns: transform function's job is ONLY to strip `mcp_` prefix from success responses
- Error classification belongs in the AI SDK layer
- Adding parsing would:
  - Consume the response body stream (can only be read once)
  - Require reconstructing the Response
  - Add complexity and potential bugs
  - Violate single responsibility principle
- Upstream code (AI SDK + oh-my-opencode) already handles error parsing and recovery

**Trade-offs**:
- No visibility into errors at this layer, but that's intentional and correct

---

### Decision 5: Test both transformClaudeRequest and transformClaudeResponse

**Context**: Task 2 scope - what to test?

**Options Considered**:
1. Only test `transformClaudeResponse` (the function we fixed)
2. Test both `transformClaudeResponse` and `transformClaudeRequest`
3. Test entire request/response flow (integration test)

**Decision**: Test both transform functions (unit tests only)

**Rationale**:
- Neither function had existing tests
- Both are in the same file and closely related
- Request transformation also deals with `mcp_` prefix (adds it)
- Having comprehensive test coverage for both improves maintainability
- Unit tests are fast and deterministic (no API calls)
- Integration tests are out of scope and would require mocking/real API access

**Trade-offs**:
- More work (32 tests instead of ~14), but worth it for complete coverage

---

### Decision 6: Commit both changes together

**Context**: When to commit? Separate commits for fix and tests, or together?

**Options Considered**:
1. Commit Task 1 immediately, then commit Task 2
2. Commit both together after Task 2 complete
3. Commit after all 3 tasks complete

**Decision**: Commit Task 1 + Task 2 together (as per plan)

**Rationale**:
- The plan explicitly specifies this strategy in the Commit Strategy table
- Fix without tests is incomplete (could introduce regressions)
- Tests without fix would fail (no code to test)
- Atomic commit: both the fix and its verification land together
- Task 3 is verification only (no code changes), so doesn't need a commit

**Trade-offs**:
- If Task 2 failed, would need to commit Task 1 separately, but this didn't happen

---

### Decision 7: Document but don't fix pre-existing test failure

**Context**: `omo-config-sync.test.ts` fails with `vi.mocked is not a function`

**Options Considered**:
1. Fix the failing test as part of this work
2. Document and continue
3. Block on fixing the failure

**Decision**: Document and continue

**Rationale**:
- Verified the failure existed BEFORE our changes (stashed our work, tested on clean main)
- Failure is unrelated to our scope (different test file, different code area)
- Out of scope for this plan (plan is about `transformClaudeResponse`, not vitest compatibility)
- Our 32 tests pass cleanly
- TypeScript typecheck passes
- Build passes
- Fixing unrelated issues would violate single responsibility and plan boundaries

**Trade-offs**:
- Full test suite shows 1 failure, but it's documented as pre-existing
- Someone else should fix this separately (likely a vitest version upgrade issue with `vi.mocked` API)
