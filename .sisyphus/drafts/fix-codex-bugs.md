# Draft: Fix GPT 5.3 Codex Bugs (store error + TUI garbled output)

## Requirements (confirmed)
- User reports two bugs when using GPT 5.3 Codex model

## Bug 1: "Item with id 'fc_xxx' not found" Error
- **Error**: `invalid_request_error` - Items not persisted when `store` is set to false
- **Root cause analysis**: 
  - `stripItemIds()` in request-transformer.ts:90-100 removes ALL `id` fields and filters `item_reference` items
  - `store` parameter exists in types.ts:32 but is NEVER explicitly set in the transformation pipeline
  - OpenCode core defaults `store` to `false` (comment at index.ts:431)
  - When store=false, OpenAI Responses API doesn't persist items, so next turn can't reference them
  - The plugin strips IDs AND doesn't set store=true → double failure

## Bug 2: TUI Garbled Output / Protocol Marker Leakage
- **Symptoms**: `++#+#+#+#+#analysis to=functions.todowrite` appearing in terminal
- **Root cause analysis**:
  - Protocol markers are NOT defined in this plugin codebase
  - They come from OpenCode core or LLM provider responses
  - The plugin has NO response filtering for these markers
  - Streaming responses pass through untouched (fetch-helpers.ts:102-106)
  - This is confirmed as OpenCode core TUI rendering bug (issues #12663, #10945, #10783)
  - NOT a plugin-level issue - it's OpenCode SDK/TUI level

## Technical Decisions
- (pending user input)

## Research Findings
- **Provider architecture**: Plugin routes by model prefix (gpt-*/codex-* → Codex API, claude-* → Anthropic, gemini-* → Gemini)
- **Request transformation**: `transformRequestBody()` handles model normalization, reasoning config, input filtering
- **stripItemIds()**: Removes ALL id fields and item_reference items from input before sending to API
- **store parameter**: Defined in types but never used in transformation pipeline
- **Claude fix already done**: `transformClaudeResponse()` already has error passthrough fix (response.ok check)
- **Test infrastructure**: vitest exists, 32 tests for claude-tools-transform

## Git History Analysis (CRITICAL)
- **stripItemIds() was added** in commit 3ed7fb2 (Feb 9 17:55) to align with store=false behavior
- **Loop thinking bug** (commit 672042c, Feb 9 14:28) was about reasoning effort being xhigh → fixed by reducing to high
- **Attempt to set store=true** (commit 2b8a419, Feb 9 19:05) → FAILED because API doesn't actually persist items
- **Reverted to store=false + stripItemIds** (commit 03a92d8, Feb 9 20:07) → current state (v0.1.47)
- **The fundamental problem**: store=true doesn't work (API error), store=false means IDs are meaningless
- **User confirms**: store=true causes API errors, not just code errors

## User Clarifications
- store=true → API 报错 (not code error)
- Loop thinking bug = model stuck thinking on first step of todo, repeating thinking (reasoning effort too high)
- Bug 2 (TUI garbled) → 以后再说, not in scope for this plan
- Bug 1 reproduction: not immediate, happens after using for a while (multi-turn accumulation)

## The Core Problem (FULLY UNDERSTOOD)

### AI SDK item_reference Generation Logic
From AI SDK source (`convert-to-openai-responses-input.ts:168-176`):
```typescript
if (store && id != null) {
  input.push({ type: 'item_reference', id });
  break;
}
```
The AI SDK ONLY creates item_reference when `store=true` AND item has an `id`.

### The Actual Bug Flow
1. OpenCode core sends request with `store` not explicitly set
2. AI SDK defaults `store` to some value (possibly true in certain paths like compaction)
3. AI SDK creates `item_reference` items for items with IDs
4. Plugin's `stripItemIds()` removes these references AND all IDs
5. But the stripping is AFTER the AI SDK has already decided to use references
6. In some code paths (compaction?), `providerOptions` may not be passed, causing AI SDK to default to store=true
7. This creates item_references that can't resolve → "Item not found" error

### Key Insight from AI SDK Issue #3118
> "AI SDK @ai-sdk/openai@2.0.50 introduced item_reference usage that breaks plugins requiring store: false. 
> Compaction calls generateText() WITHOUT providerOptions, causing AI SDK to default to store: true 
> and create item_reference items that can't resolve."

### Why stripItemIds() Exists But Isn't Enough
- It strips IDs and item_references from the request body
- But the error happens BEFORE the plugin's fetch interceptor is called
- The AI SDK generates the request body with item_references, then the plugin strips them
- However, in some paths the AI SDK may send the request directly without going through the plugin's transform

### Solution Direction
The fix needs to ensure `store: false` is ALWAYS propagated to the AI SDK so it never generates 
item_reference items in the first place. This should be done at the `chat.params` hook level 
(index.ts:428-434) where providerOptions can be set.

Additionally, `stripItemIds()` should be kept as a safety net but made smarter:
- Keep filtering item_reference (safety net)
- But PRESERVE function_call IDs that have matching function_call_output items in the same request
- This allows the API to correctly match function calls with their outputs

## Scope Boundaries
- INCLUDE: Bug 1 (store/item_reference error) fix
- EXCLUDE: Bug 2 (TUI garbled output) - deferred to later
