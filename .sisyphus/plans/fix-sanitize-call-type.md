# Fix: sanitizeRequestBody wrong type check breaks tool calling

## TL;DR

> **Quick Summary**: `sanitizeRequestBody` checks `item.type === "call"` but actual types are `"function_call"`, `"local_shell_call"`, `"custom_tool_call"`. This strips `id` from ALL items including tool calls, breaking tool call correlation.
> 
> **Deliverables**:
> - Fix type check in `sanitizeRequestBody`
> - Update unit test for `sanitizeRequestBody` to cover call types
> - Bump version to 0.1.56
> - Push to GitHub
> 
> **Estimated Effort**: Quick (5 min)
> **Parallel Execution**: NO - sequential

---

## TODOs

- [ ] 1. Fix type check in sanitizeRequestBody

  **What to do**:
  In `lib/request/fetch-helpers.ts` line 37, change:
  ```typescript
  if (item.type === "call") return item
  ```
  To:
  ```typescript
  if (
    item.type === "function_call" ||
    item.type === "local_shell_call" ||
    item.type === "custom_tool_call"
  ) return item
  ```
  
  Also remove the 3 unnecessary comments (lines 27, 31, 36).

  **References**:
  - `lib/request/request-transformer.ts:124-127` — correct type check pattern already used in `sanitizeItemIds`

  **Acceptance Criteria**:
  - [ ] `bun run test` → all tests pass
  - [ ] `bun run build` → succeeds
  - [ ] `grep "function_call" dist/index.js` shows the new type checks in sanitizeRequestBody

- [ ] 2. Bump version to 0.1.56 and push

  **What to do**:
  - Update `package.json` version to `0.1.56`
  - `git add -A && git commit -m "fix(codex): fix sanitizeRequestBody type check — was 'call' instead of 'function_call'"`
  - `git push`

---

## Success Criteria

```bash
bun run test    # All 235 tests pass
bun run build   # Succeeds
```
