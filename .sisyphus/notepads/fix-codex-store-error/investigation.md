# Task 1 Investigation: chat.params → providerOptions Propagation

## Question
Does setting `output.options.providerOptions = { openai: { store: false } }` in the `chat.params` hook actually reach the AI SDK's request building logic?

## Investigation Results

### ✅ FINDING: YES - providerOptions DOES propagate, BUT with caveats

#### Evidence Chain

1. **Hook Type Signature** (@opencode-ai/plugin/dist/index.d.ts:134-145)
   ```typescript
   "chat.params"?: (input: {...}, output: {
     temperature: number;
     topP: number;
     topK: number;
     options: Record<string, any>;  // ← Generic options bag
   }) => Promise<void>;
   ```
   - The hook receives `output.options` as a generic `Record<string, any>`
   - This is a mutable object that plugins can modify

2. **Claude Implementation Pattern** (index.ts:428-447)
   ```typescript
   "chat.params": async (input, output) => {
     // Claude models: remove thinking if budgetTokens >= maxTokens
     const thinking = output.options?.thinking
     // ... validation ...
     const next = { ...output.options }
     delete next.thinking
     output.options = next  // ← Direct mutation of output.options
   }
   ```
   - Claude successfully modifies `output.options` to remove `thinking`
   - This proves the hook output is consumed downstream

3. **RequestBody Type Definition** (lib/types.ts:42-45)
   ```typescript
   providerOptions?: {
     openai?: Partial<ConfigOptions> & { store?: boolean; include?: string[] }
     [key: string]: unknown
   }
   ```
   - The RequestBody type explicitly supports `providerOptions.openai.store`
   - This is the structure that reaches the Codex API

4. **Request Transformer Usage** (lib/request/request-transformer.ts:50, 65, 70)
   ```typescript
   const providerOpenAI = body.providerOptions?.openai
   const existingEffort = body.reasoning?.effort ?? providerOpenAI?.reasoningEffort
   const verbosity = body.text?.verbosity ?? providerOpenAI?.textVerbosity
   ```
   - The transformer reads `body.providerOptions.openai` values
   - This confirms the path is recognized and used

5. **AI SDK Provider Support** (@ai-sdk/openai/dist/index.d.ts)
   ```typescript
   store?: boolean | undefined;
   ```
   - OpenAI provider explicitly supports `store` option
   - Anthropic provider supports `thinking` option (proven working)

#### Propagation Flow

```
chat.params hook output.options
    ↓
OpenCode SDK (consumes hook output)
    ↓
RequestBody.providerOptions
    ↓
lib/request/request-transformer.ts (reads providerOptions)
    ↓
Codex API request body
    ↓
AI SDK provider (uses store option)
```

### ⚠️ CRITICAL CAVEAT: Codex Models Don't Use providerOptions

**Current Implementation** (index.ts:428-434):
```typescript
"chat.params": async (input, output) => {
  if (input.model.providerID !== PROVIDER_ID) return
  
  // Codex models: no special handling needed (store defaults to false via OpenCode core)
  if (isCodexModel(input.model.id)) {
    return  // ← EARLY RETURN - NO MODIFICATIONS
  }
  
  // Claude models: remove thinking if budgetTokens >= maxTokens
  if (!input.model.id?.startsWith("claude-")) return
  // ... Claude-specific logic ...
}
```

**Problem**: The hook returns early for Codex models without any modifications. This means:
- Setting `output.options.providerOptions` for Codex models would be ignored
- The comment says "store defaults to false via OpenCode core" - but this is NOT via the hook

### 🔍 Where Does Codex Store=false Actually Come From?

The comment suggests OpenCode core handles it, but this needs verification:
- NOT from `chat.params` hook (early return)
- Possibly from OpenCode SDK's default behavior
- Possibly from Codex API's default behavior

## Conclusion

### For Claude Models
✅ **YES, providerOptions propagates**
- Syntax: `output.options.providerOptions = { openai: { store: false } }`
- BUT: Claude doesn't use `store` option (it uses `thinking`)
- This would be a no-op for Claude

### For Codex Models
❌ **NO, providerOptions does NOT propagate via chat.params hook**
- The hook returns early without processing
- The comment claims "store defaults to false via OpenCode core"
- This needs to be verified in OpenCode SDK source

## Recommendation for Task 2

Since `chat.params` hook doesn't process Codex models, **Task 2's approach (transformRequestBody) becomes the PRIMARY fix**:
- Modify `body.providerOptions.openai.store = false` in `transformRequestBody()`
- This is the only place where Codex request bodies are actually transformed
- This will reliably set store=false before the request reaches the API

## Next Steps

- Task 2: Implement store=false in transformRequestBody
- Task 3: Can be skipped (chat.params doesn't apply to Codex)
- Verify: Test that item_reference is NOT generated in Codex responses
