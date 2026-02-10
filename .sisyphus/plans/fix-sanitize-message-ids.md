# Fix: sanitizeItemIds 遗漏 message 类型 item 的 ID

## TL;DR

> **Quick Summary**: `sanitizeItemIds()` 只 strip call 类型 item 的 `id`，但 `msg_` 开头的 message item 带着 `id` 直接通过了。当 `store=false` 时，这些 ID 在 API 端不存在，下一轮引用就报错。
> 
> **Deliverables**:
> - 修复 `sanitizeItemIds()` 逻辑：strip 所有非匹配 call item 的 `id`（包括 message、reasoning 等）
> - 更新/新增测试
> 
> **Estimated Effort**: Quick (15 分钟)
> **Critical Path**: Task 1 → Task 2

---

## Context

### 错误信息
```
Item with id 'msg_0c4cb61177bb385c01698aec78d4148191aab448c3e5d42356' not found. 
Items are not persisted when `store` is set to false.
```

注意 ID 前缀是 `msg_`，不是 `fc_`。这是 **message 类型** 的 item。

### 根因
`sanitizeItemIds()` 在 `lib/request/request-transformer.ts:124` 有这段逻辑：
```typescript
if (!isCallItem || !("id" in item)) {
  return item;  // ← message 带 id 直接通过！
}
```

只有 `function_call`、`local_shell_call`、`custom_tool_call` 三种类型会被检查 ID。其他所有类型（message、reasoning 等）即使带 `id` 也直接放过了。

---

## Work Objectives

### Core Objective
修改 `sanitizeItemIds()` 使其 strip **所有** 带 `id` 的 item（除了有匹配 output 的 call item）。

### Must Have
- 所有非 call item 的 `id` 字段被 strip（包括 message、reasoning 等）
- 有匹配 output 的 call item 仍然保留 `id`
- 无匹配 output 的 call item 的 `id` 被 strip
- `item_reference` 仍然被过滤
- 测试覆盖新场景

### Must NOT Have
- 不要改其他文件
- 不要改 Claude/Gemini 路径

---

## TODOs

- [x] 1. 修复 sanitizeItemIds() 逻辑

  **What to do**:
  在 `lib/request/request-transformer.ts` 中修改 `sanitizeItemIds()` 的第二遍逻辑。

  **当前代码** (lines 114-143):
  ```typescript
  // Second pass: filter and conditionally strip IDs
  return input
    .filter((item) => item.type !== "item_reference")
    .map((item) => {
      const isCallItem = ...;
      if (!isCallItem || !("id" in item)) {
        return item;  // BUG: message 带 id 直接通过
      }
      // ... 只处理 call item
    });
  ```

  **修改为**:
  ```typescript
  // Second pass: filter and conditionally strip IDs
  return input
    .filter((item) => item.type !== "item_reference")
    .map((item) => {
      if (!("id" in item)) {
        return item;
      }

      // Check if this is a call item with a matching output
      const isCallItem =
        item.type === "function_call" ||
        item.type === "local_shell_call" ||
        item.type === "custom_tool_call";

      if (isCallItem) {
        const callId = (item as { call_id?: unknown }).call_id;
        const hasMatchingOutput =
          typeof callId === "string" &&
          callId.trim().length > 0 &&
          outputCallIds.has(callId.trim());

        if (hasMatchingOutput) {
          return item;  // Preserve id for matched calls
        }
      }

      // Strip id from ALL other items (messages, unmatched calls, reasoning, etc.)
      const { id, ...rest } = item as InputItem & { id: unknown };
      return rest as InputItem;
    });
  ```

  **关键变化**: 把 `if (!isCallItem || !("id" in item)) { return item; }` 拆开 — 先检查有没有 `id`，再检查是不是匹配的 call item。所有带 `id` 但不是匹配 call 的 item 都会被 strip。

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **References**:
  - `lib/request/request-transformer.ts:97-144` — 当前 sanitizeItemIds 实现

  **Acceptance Criteria**:
  - [x] message 类型 item 的 `id` 被 strip
  - [x] reasoning 类型 item 的 `id` 被 strip
  - [x] 有匹配 output 的 call item 仍保留 `id`
  - [x] `bun run typecheck` → exit code 0

  **Commit**: NO (groups with Task 2)

---

- [x] 2. 更新测试并提交

  **What to do**:
  在 `tests/unit/request-transformer.test.ts` 中添加测试：
  - message item 带 `id` → `id` 被 strip
  - reasoning item 带 `id` → `id` 被 strip
  - 混合场景：message + matched call → message 的 id 被 strip，call 的 id 保留

  然后运行验证并提交。

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **References**:
  - `tests/unit/request-transformer.test.ts` — 现有测试文件

  **Acceptance Criteria**:
  - [x] 新增至少 3 个测试用例
  - [x] `bun run test` → all tests pass
  - [x] `bun run typecheck` → exit code 0
  - [x] `bun run build` → exit code 0
  - [x] 已提交并 push

  **Commit**: YES
  - Message: `fix(codex): strip id from all item types (not just calls) to prevent "Item not found" error`
  - Pre-commit: `bun run test && bun run typecheck`

---

## Success Criteria

```bash
bun run test          # Expected: all tests pass
bun run typecheck     # Expected: exit code 0
bun run build         # Expected: exit code 0
```
