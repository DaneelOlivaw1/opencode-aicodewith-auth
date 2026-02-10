# Fix Codex "Item Not Found" Store Error

## TL;DR

> **Quick Summary**: Fix the `"Item with id 'fc_xxx' not found"` error in GPT 5.3 Codex multi-turn conversations by ensuring `store: false` is explicitly propagated at all layers, and improving `stripItemIds()` to be a smarter safety net that preserves function_call IDs with matching outputs.
> 
> **Deliverables**:
> - Explicit `store: false` in `transformRequestBody()` (belt-and-suspenders)
> - `chat.params` hook injects `providerOptions.openai.store = false` for Codex models
> - Smarter `stripItemIds()` that preserves matched function_call IDs
> - Unit tests for all changes
> 
> **Estimated Effort**: Short (2-3 hours)
> **Parallel Execution**: NO - sequential (each task builds on previous)
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5

---

## Context

### Original Request
User reports `invalid_request_error` when using GPT 5.3 Codex: `"Item with id 'fc_0d7213f11e3770a701698aca0b1384819146f1606949e8774' not found. Items are not persisted when 'store' is set to false."` The error occurs during multi-turn conversations, not immediately.

### Interview Summary
**Key Discussions**:
- store=true causes API errors (AICodewith proxy doesn't support it)
- store=false means items aren't persisted, so item_reference can't work
- Previous "loop thinking" bug was about reasoning effort (xhigh → high), not related to store
- Git history shows: store=true was tried (commit 2b8a419) but reverted (commit 03a92d8) because API errors
- Bug 2 (TUI garbled output) is explicitly out of scope

**Research Findings**:
- AI SDK source confirms: `item_reference` only generated when `store=true && id != null`
- AI SDK issue #3118: compaction path may not pass providerOptions, causing store default mismatch
- OpenAI Responses API: store=false is stateless, must send full history, no item_reference allowed
- Current `stripItemIds()` removes ALL IDs (too aggressive) — prevents error but loses function_call/output matching

### Metis Review
**Identified Gaps** (addressed):
- `chat.params` → `providerOptions` propagation is unverified → Added validation task (Task 1)
- `body.store` never explicitly set in `transformRequestBody()` → Added as primary fix layer
- `stripItemIds` is not exported → Will export for direct unit testing
- Should preserve IDs for all tool types (function_call, local_shell_call, custom_tool_call) → Included
- Existing test `request-transformer.test.ts:54-62` asserts item_reference passes through `filterInput()` → This is correct (filterInput is no-op, stripItemIds does the work)

---

## Work Objectives

### Core Objective
Eliminate the "Item not found" error in Codex multi-turn conversations by ensuring `store: false` is explicitly set at all layers and improving the ID stripping logic to be smarter.

### Concrete Deliverables
- Modified `lib/request/request-transformer.ts`: explicit `body.store = false` + smarter `stripItemIds()`
- Modified `index.ts`: `chat.params` hook injects `providerOptions.openai.store = false`
- New/updated test file: `tests/unit/request-transformer.test.ts` with store and stripItemIds tests

### Definition of Done
- [x] `bun run test` → all tests pass (0 failures)
- [x] `bun run typecheck` → exit code 0
- [x] `bun run build` → exit code 0
- [x] No `item_reference` items survive to the API request body
- [x] `function_call` IDs with matching `function_call_output` are preserved

### Must Have
- `body.store = false` explicitly set in `transformRequestBody()`
- `providerOptions.openai.store = false` injected in `chat.params` for Codex models
- `stripItemIds()` filters `item_reference` but preserves matched tool call IDs
- Unit tests covering all new behavior

### Must NOT Have (Guardrails)
- Do NOT set `store: true` anywhere — it causes API errors
- Do NOT touch Claude or Gemini code paths — this is Codex-only
- Do NOT modify `filterInput()` — it's intentionally a no-op
- Do NOT modify `normalizeOrphanedToolOutputs()` — it already works correctly
- Do NOT add e2e tests requiring live API calls
- Do NOT fix Bug 2 (TUI garbled output) — explicitly out of scope
- Do NOT create new helper files for store logic — too small to warrant
- Do NOT add JSDoc to existing functions unless directly modified
- Do NOT refactor `filterInput()` to merge with `stripItemIds()` — different responsibilities

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (Tests-after — write implementation first, then tests)
- **Framework**: vitest (existing)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Every task includes QA scenarios using Bash commands to verify.

---

## Execution Strategy

### Sequential Execution (No Parallelism)

Each task depends on the previous one:

```
Task 1: Validate chat.params → providerOptions propagation path
  ↓
Task 2: Add body.store = false in transformRequestBody()
  ↓
Task 3: Inject providerOptions in chat.params hook
  ↓
Task 4: Make stripItemIds() smarter
  ↓
Task 5: Add unit tests + verify all passes
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 3, 4, 5 | None |
| 3 | 1, 2 | 5 | None |
| 4 | 2 | 5 | None |
| 5 | 2, 3, 4 | None | None (final) |

---

## TODOs

- [x] 1. Validate chat.params → providerOptions propagation path

  **What to do**:
  - Read the OpenCode plugin SDK types to understand how `chat.params` hook's `output.options` maps to AI SDK call options
  - Check `@opencode-ai/plugin` and `@opencode-ai/sdk` type definitions for the `chat.params` hook signature
  - Specifically verify: does setting `output.options.providerOptions = { openai: { store: false } }` actually reach the AI SDK?
  - Search for how OpenCode core consumes the `chat.params` output — look in `node_modules/@opencode-ai/` for the hook invocation
  - If `providerOptions` propagation is confirmed → proceed with Task 3 as planned
  - If `providerOptions` does NOT propagate → Task 2 (`body.store = false` in transformRequestBody) becomes the PRIMARY fix, and Task 3 should be skipped or adapted

  **Must NOT do**:
  - Do NOT modify any files in this task — this is investigation only
  - Do NOT run the application or make API calls

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: This is a focused investigation task — read types and trace code paths
  - **Skills**: []
    - No special skills needed — just file reading and code tracing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (first task)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `index.ts:428-434` — Current `chat.params` hook implementation for Codex models (currently a no-op early return)
  - `index.ts:436-447` — Claude `chat.params` implementation that modifies `output.options` (shows the pattern for how to set options)

  **API/Type References**:
  - `node_modules/@opencode-ai/plugin/` — Plugin type definitions, specifically `Hooks["chat.params"]` type
  - `node_modules/@opencode-ai/sdk/` — SDK types that define how hooks are consumed

  **Documentation References**:
  - AI SDK `providerOptions` documentation: how `providerOptions.openai.store` is consumed by `@ai-sdk/openai`

  **WHY Each Reference Matters**:
  - `index.ts:436-447` shows the existing pattern for modifying `output.options` in `chat.params` — if Claude's thinking removal works via this pattern, store injection should too
  - The plugin/SDK types will confirm whether `providerOptions` is a recognized key in the options bag

  **Acceptance Criteria**:

  - [x] Investigation complete: documented whether `output.options.providerOptions` propagates to AI SDK
  - [x] If YES: confirm the exact syntax needed (e.g., `output.options = { ...output.options, providerOptions: { openai: { store: false } } }`)
  - [x] If NO: document the alternative approach (set `body.store = false` in transformRequestBody as primary fix)

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify plugin type definitions exist and are readable
    Tool: Bash
    Preconditions: Project dependencies installed
    Steps:
      1. ls node_modules/@opencode-ai/plugin/
      2. Assert: directory exists and contains type definition files
      3. Search for "chat.params" in the type definitions
      4. Assert: Hook type signature found
    Expected Result: Type definitions readable, chat.params hook signature documented
    Evidence: Terminal output captured
  ```

  **Commit**: NO (investigation only, no code changes)

---

- [x] 2. Add explicit `body.store = false` in transformRequestBody()

  **What to do**:
  - In `lib/request/request-transformer.ts`, function `transformRequestBody()` (line 166-214):
    - Add `body.store = false` after `body.stream = true` (around line 181)
    - This ensures the API request body ALWAYS has `store: false` regardless of what the AI SDK or OpenCode core sets
  - This is the most reliable fix layer — it operates directly on the request body before it's sent to the API

  **Must NOT do**:
  - Do NOT set `store: true` — it causes API errors
  - Do NOT modify any other fields in `transformRequestBody()`
  - Do NOT change the function signature

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line addition in one file
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 3, 4, 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `lib/request/request-transformer.ts:166-214` — `transformRequestBody()` function where the change goes
  - `lib/request/request-transformer.ts:180-182` — Existing pattern: `body.model = normalizedModel; body.stream = true; body.instructions = codexInstructions;` — add `body.store = false` in the same block

  **API/Type References**:
  - `lib/types.ts:30-32` — `RequestBody` interface with `store?: boolean` field — confirms the field exists in the type

  **WHY Each Reference Matters**:
  - `request-transformer.ts:180-182` shows the exact location and pattern for setting body fields — `body.store = false` follows the same convention
  - `types.ts:30-32` confirms `store` is already in the type definition, so no type changes needed

  **Acceptance Criteria**:

  - [x] `body.store = false` is set in `transformRequestBody()` after `body.stream = true`
  - [x] `bun run typecheck` → exit code 0
  - [x] `bun run build` → exit code 0

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify store=false is set in transformRequestBody
    Tool: Bash
    Preconditions: Code change applied
    Steps:
      1. grep -n "body.store" lib/request/request-transformer.ts
      2. Assert: output contains "body.store = false"
      3. bun run typecheck
      4. Assert: exit code 0
      5. bun run build
      6. Assert: exit code 0
    Expected Result: store=false explicitly set, typecheck and build pass
    Evidence: Terminal output captured
  ```

  **Commit**: NO (groups with Task 5)

---

- [x] 3. Inject providerOptions.openai.store = false in chat.params hook

  **What to do**:
  - In `index.ts`, function `chat.params` hook (line 428-434):
    - Replace the early return for Codex models with `providerOptions.openai.store = false` injection
    - The exact implementation depends on Task 1's findings about how `output.options` maps to AI SDK options
    - If propagation works: set `output.options = { ...output.options, providerOptions: { ...output.options?.providerOptions, openai: { ...output.options?.providerOptions?.openai, store: false } } }`
    - If propagation doesn't work: skip this task (Task 2's `body.store = false` is the primary fix)
  - This prevents the AI SDK from generating `item_reference` items at the source, before the request body is even built

  **Must NOT do**:
  - Do NOT modify the Claude section of `chat.params` (lines 436-447)
  - Do NOT add store handling for non-Codex models
  - Do NOT remove the existing Codex model check (`isCodexModel(input.model.id)`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small modification in one function
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `index.ts:428-447` — Full `chat.params` hook showing both Codex (no-op) and Claude (modifies output.options) sections
  - `index.ts:436-447` — Claude's `chat.params` implementation: shows how to read and modify `output.options` — use this as the pattern for Codex store injection

  **API/Type References**:
  - Task 1 findings — Whether `providerOptions` propagates through `output.options`
  - `@ai-sdk/openai` source: `convert-to-openai-responses-input.ts:168-176` — Confirms AI SDK checks `store` before creating `item_reference`

  **WHY Each Reference Matters**:
  - `index.ts:436-447` is the exact pattern to follow — Claude's hook modifies `output.options` to remove thinking, we modify it to inject store=false
  - AI SDK source confirms that setting store=false at this level prevents item_reference generation

  **Acceptance Criteria**:

  - [x] `chat.params` hook injects `store: false` into providerOptions for Codex models
  - [x] Claude `chat.params` behavior unchanged
  - [x] `bun run typecheck` → exit code 0

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify chat.params injects store=false for Codex
    Tool: Bash
    Preconditions: Code change applied
    Steps:
      1. grep -n "store" index.ts
      2. Assert: output contains "store: false" in the chat.params section
      3. grep -A5 "isCodexModel" index.ts
      4. Assert: Codex section now sets providerOptions instead of early return
      5. bun run typecheck
      6. Assert: exit code 0
    Expected Result: store=false injected for Codex models, typecheck passes
    Evidence: Terminal output captured
  ```

  **Commit**: NO (groups with Task 5)

---

- [x] 4. Make stripItemIds() smarter — preserve matched tool call IDs

  **What to do**:
  - In `lib/request/request-transformer.ts`, modify `stripItemIds()` (lines 90-100):
    - **Keep**: filtering out `item_reference` type items (safety net)
    - **Change**: instead of stripping ALL `id` fields, only strip IDs from items that DON'T have a matching output in the same request
    - Logic: collect all `call_id` values from output items (`function_call_output`, `local_shell_call_output`, `custom_tool_call_output`), then preserve `id` on call items (`function_call`, `local_shell_call`, `custom_tool_call`) whose `call_id` matches an output's `call_id`
    - Use the same `call_id` extraction pattern from `normalizeOrphanedToolOutputs()` in `input-utils.ts`
  - **Export** `stripItemIds` from `request-transformer.ts` for direct unit testing
  - Rename to `sanitizeItemIds` to better reflect the new behavior (optional but recommended)

  **Must NOT do**:
  - Do NOT remove `item_reference` filtering — it's the last line of defense
  - Do NOT modify `normalizeOrphanedToolOutputs()` — it handles a different concern
  - Do NOT modify `filterInput()` — it's intentionally a no-op
  - Do NOT change the call site in `transformRequestBody()` — just change the function's internal logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Moderate logic change requiring understanding of item types and matching
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `lib/request/request-transformer.ts:90-100` — Current `stripItemIds()` implementation to modify
  - `lib/request/helpers/input-utils.ts:125-130` — `getCallId()` helper that extracts `call_id` from items — reuse this pattern
  - `lib/request/helpers/input-utils.ts:158-182` — `collectCallIds()` that collects call IDs by type — reuse this pattern for matching
  - `lib/request/helpers/input-utils.ts:184-219` — `normalizeOrphanedToolOutputs()` that handles orphaned outputs — shows the matching logic pattern

  **API/Type References**:
  - `lib/types.ts:22-28` — `InputItem` interface with `id?: string` and `[key: string]: unknown` (call_id is accessed via index signature)

  **WHY Each Reference Matters**:
  - `input-utils.ts:125-130` shows the exact pattern for safely extracting `call_id` from items — reuse to avoid reimplementing
  - `input-utils.ts:158-182` shows how to collect call IDs by type — the matching logic for determining which IDs to preserve
  - `input-utils.ts:184-219` shows the complete orphaned output handling — understanding this prevents accidentally breaking the pipeline

  **Acceptance Criteria**:

  - [x] `stripItemIds` (or `sanitizeItemIds`) is exported from `request-transformer.ts`
  - [x] `item_reference` items are still filtered out
  - [x] `function_call` items with matching `function_call_output` (by `call_id`) retain their `id` field
  - [x] `function_call` items WITHOUT matching output have `id` stripped
  - [x] Same logic applies to `local_shell_call`/`custom_tool_call` and their outputs
  - [x] Items without `id` field are passed through unchanged
  - [x] `bun run typecheck` → exit code 0

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify stripItemIds preserves matched IDs
    Tool: Bash
    Preconditions: Code change applied
    Steps:
      1. grep -n "export.*stripItemIds\|export.*sanitizeItemIds" lib/request/request-transformer.ts
      2. Assert: function is exported
      3. grep -n "item_reference" lib/request/request-transformer.ts
      4. Assert: item_reference filtering still present
      5. bun run typecheck
      6. Assert: exit code 0
    Expected Result: Function exported, item_reference filtered, matched IDs preserved
    Evidence: Terminal output captured
  ```

  **Commit**: NO (groups with Task 5)

---

- [x] 5. Add unit tests and verify all changes

  **What to do**:
  - Add tests to `tests/unit/request-transformer.test.ts` covering:
    
    **stripItemIds / sanitizeItemIds tests:**
    - Filters out `item_reference` type items
    - Strips `id` from items without matching output (function_call without function_call_output)
    - Preserves `id` on function_call items that have matching function_call_output (by call_id)
    - Preserves `id` on local_shell_call items that have matching local_shell_call_output
    - Preserves `id` on custom_tool_call items that have matching custom_tool_call_output
    - Passes through items without `id` field unchanged
    - Handles empty input array
    - Handles mixed items (some matched, some not)
    
    **transformRequestBody store tests:**
    - Output body always has `store: false`
    - `store: false` is set even if input body has `store: true`
    - `store: false` is set even if input body has no `store` field
    
  - Run full test suite: `bun run test`
  - Run typecheck: `bun run typecheck`
  - Run build: `bun run build`

  **Must NOT do**:
  - Do NOT modify existing passing tests (unless they assert old stripItemIds behavior that changed)
  - Do NOT add e2e tests requiring live API calls
  - Do NOT add tests for Claude or Gemini paths

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Writing tests following existing patterns, moderate complexity
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3, 4

  **References**:

  **Pattern References**:
  - `tests/unit/request-transformer.test.ts` — Existing test file with patterns to follow (describe/it blocks, direct function imports)
  - `tests/unit/claude-tools-transform.test.ts` — 32 comprehensive tests showing the project's test style and conventions

  **Test References**:
  - `tests/unit/request-transformer.test.ts:54-62` — Existing test for `filterInput` that asserts `item_reference` passes through (this is correct — filterInput is a no-op, stripItemIds does the filtering)

  **WHY Each Reference Matters**:
  - `request-transformer.test.ts` is the exact file to add tests to — follow its existing import patterns and describe block structure
  - `claude-tools-transform.test.ts` shows the comprehensive test style expected (32 tests covering happy path, error cases, edge cases)

  **Acceptance Criteria**:

  - [x] New tests added for `stripItemIds`/`sanitizeItemIds` (minimum 8 test cases)
  - [x] New tests added for `transformRequestBody` store behavior (minimum 3 test cases)
  - [x] `bun run test` → all tests pass (0 failures)
  - [x] `bun run typecheck` → exit code 0
  - [x] `bun run build` → exit code 0

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All tests pass including new ones
    Tool: Bash
    Preconditions: All code changes from Tasks 2-4 applied, new tests written
    Steps:
      1. bun run test -- --reporter=verbose 2>&1
      2. Assert: All tests pass (0 failures)
      3. Assert: New test descriptions appear in output (e.g., "stripItemIds", "store")
      4. bun run typecheck
      5. Assert: exit code 0
      6. bun run build
      7. Assert: exit code 0
    Expected Result: All tests pass, typecheck clean, build succeeds
    Evidence: Terminal output captured to .sisyphus/evidence/task-5-test-results.txt

  Scenario: Verify no regressions in existing tests
    Tool: Bash
    Preconditions: All changes applied
    Steps:
      1. bun run test tests/unit/claude-tools-transform.test.ts -- --reporter=verbose
      2. Assert: 32/32 tests pass (no regressions)
      3. bun run test tests/unit/request-transformer.test.ts -- --reporter=verbose
      4. Assert: All tests pass including new ones
    Expected Result: Zero regressions, all new tests pass
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `fix(codex): prevent "Item not found" error by enforcing store=false and preserving matched tool call IDs`
  - Files: `lib/request/request-transformer.ts`, `index.ts`, `tests/unit/request-transformer.test.ts`
  - Pre-commit: `bun run test && bun run typecheck`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 5 | `fix(codex): prevent "Item not found" error by enforcing store=false and preserving matched tool call IDs` | `lib/request/request-transformer.ts`, `index.ts`, `tests/unit/request-transformer.test.ts` | `bun run test && bun run typecheck && bun run build` |

---

## Success Criteria

### Verification Commands
```bash
bun run test                    # Expected: all tests pass, 0 failures
bun run typecheck               # Expected: exit code 0
bun run build                   # Expected: exit code 0
grep "store" lib/request/request-transformer.ts  # Expected: body.store = false
grep "store" index.ts           # Expected: store: false in chat.params
```

### Final Checklist
- [x] `body.store = false` explicitly set in `transformRequestBody()`
- [x] `providerOptions.openai.store = false` injected in `chat.params` for Codex models
- [x] `stripItemIds` filters `item_reference` items (safety net preserved)
- [x] `stripItemIds` preserves `id` on tool call items with matching outputs
- [x] All new tests pass
- [x] All existing tests pass (zero regressions)
- [x] Typecheck passes
- [x] Build succeeds
- [x] No `store: true` anywhere in codebase
- [x] Claude and Gemini paths untouched
