# Draft: Context Window Recovery Fix

## Problem Statement
When the conversation context exceeds the 200,000 token limit, the auto-compaction/recovery mechanism no longer triggers. Instead, the user sees a "Bad Request: prompt is too long" error and the session stops working.

## Error Message Observed
```
Bad Request: {
  "error": {
    "type": "<nil>",
    "message": "{\"type\":\"error\",\"error\":{\"type\":\"invalid_request_error\",\"message\":\"prompt is too long: 208749 tokens > 200000 maximum\"},\"request_id\":\"req_011CXyqu2pFVnHZpgp1kmjKK\"} (traceid: ...)"
  },
  "type": "error"
}
```

## Root Cause Analysis

### Multiple Recovery Mechanisms Exist

1. **OpenCode Core `isOverflow`** (`packages/opencode/src/session/processor.ts:274`)
   - Checks after `finish-step` — NOT triggered if the API call fails before any step finishes

2. **Preemptive Compaction** (`oh-my-opencode/src/hooks/preemptive-compaction/index.ts`)
   - Checks after `message.updated` with assistant finish — NOT triggered if no assistant completes

3. **Anthropic Context Window Limit Recovery** (`oh-my-opencode/src/hooks/anthropic-context-window-limit-recovery/`)
   - Listens for `session.error` event — SHOULD trigger, but depends on error classification

### The Bug Path

**When the error comes through the streaming path (not APICallError):**

1. `processor.ts` catches the error at line 339
2. `MessageV2.fromError(e)` at line 344:
   - The error is a plain JSON object from the Anthropic streaming response
   - It's NOT an `APICallError` instance (from @ai-sdk)
   - The `default` case runs `ProviderError.parseStreamError(e)`
   - `parseStreamError` checks for `error.code` (not `error.type`!)
   - Anthropic errors use `error.type: "invalid_request_error"`, NOT `error.code`
   - So `parseStreamError` returns `undefined`
   - The error becomes `NamedError.Unknown({ message: JSON.stringify(e) })`

3. `SessionRetry.retryable(error)` at line 345:
   - `ContextOverflowError.isInstance(error)` → false (it's Unknown)
   - `APIError.isInstance(error)` → false
   - Falls to JSON parsing at line 70-98
   - Parses the JSON from `error.data.message`
   - **Line 95: `return JSON.stringify(json)`** — CATCH-ALL that treats ALL JSON errors as retryable
   - Returns non-undefined → the error is considered RETRYABLE

4. The processor RETRIES the request instead of publishing `Session.Event.Error`
   - The retry hits the same token limit → retries again
   - Eventually exhausts retries → error is published
   - But by then, state might be corrupted or the user has already seen the error

### Alternative Bug Path (if it IS classified as ContextOverflowError)

Even if properly classified, the recovery has a secondary issue:

1. `session.error` event fires with the error
2. `parseAnthropicTokenLimitError()` parses it — finds tokens: 208749 > 200000
3. `getLastAssistant()` returns null (no prior assistant message in new session)
4. `providerID` and `modelID` are both `undefined`
5. Phase 1 (DCP) runs — but may not help if no tool outputs exist yet
6. Phase 2 (Truncation) runs — but may not help if no tool outputs exist yet
7. Phase 3 (Summarize) — **SKIPPED because `providerID && modelID` check fails** (line 485)
8. Shows "Summarize Skipped: Missing providerID or modelID" toast
9. Falls through to "Auto Compact Failed"

## Research Findings

### Key Files Examined
- `packages/opencode/src/session/processor.ts` — error catch block (lines 339-364)
- `packages/opencode/src/session/retry.ts` — retryable() catch-all (line 95)
- `packages/opencode/src/session/message-v2.ts` — fromError() and ContextOverflowError
- `packages/opencode/src/provider/error.ts` — parseStreamError and parseAPICallError
- `oh-my-opencode/src/hooks/anthropic-context-window-limit-recovery/parser.ts` — token error parser
- `oh-my-opencode/src/hooks/anthropic-context-window-limit-recovery/executor.ts` — 3-phase recovery
- `oh-my-opencode/src/hooks/anthropic-context-window-limit-recovery/index.ts` — event handler
- `oh-my-opencode/src/hooks/preemptive-compaction/index.ts` — preemptive compaction

### provider-config.json Model Limits
- `claude-opus-4-6-20260205`: context=200000, output=64000
- `claude-sonnet-4-5-20250929`: context=200000, output=64000

## Confirmed Fixes Needed

### Fix 1: `ProviderError.parseStreamError` — Handle Anthropic streaming errors
- File: `packages/opencode/src/provider/error.ts`
- Currently only checks `error.code`, but Anthropic errors use `error.type`
- Should detect `invalid_request_error` with "prompt is too long" as context_overflow

### Fix 2: `SessionRetry.retryable` — Don't treat token limit errors as retryable
- File: `packages/opencode/src/session/retry.ts`
- Line 95: `return JSON.stringify(json)` catches ALL JSON errors as retryable
- Should check for overflow patterns BEFORE the catch-all return

### Fix 3: Recovery hook — Get providerID/modelID from user message when no assistant exists
- File: `oh-my-opencode/src/hooks/anthropic-context-window-limit-recovery/index.ts`
- When `lastAssistant` is null, should fall back to the user message's model info
- Or get from the session's configured model

## Open Questions
- Is the error actually coming through the streaming path or the APICallError path?
- How did this used to work — was there a change in the AI SDK or the Anthropic SDK that changed how errors propagate?
- Should the fix be in opencode core, oh-my-opencode, or both?

## Scope Boundaries
- INCLUDE: Diagnosing and fixing the auto-compaction trigger failure
- INCLUDE: Both opencode core and oh-my-opencode fixes
- EXCLUDE: Changing the compaction algorithm itself
- EXCLUDE: Changing how the aicodewith proxy routes requests
