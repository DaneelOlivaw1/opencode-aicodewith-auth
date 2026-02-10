# Fix: 移除 previousResponseId 顶层字段

## TL;DR

> **Quick Summary**: 真正导致 "Item not found" 错误的是请求体顶层的 `previousResponseId` 字段，不是 `input` 数组里的 `id`。AI SDK 在第二轮对话时自动设置这个字段引用上一轮响应，但 `store=false` 时上一轮响应没被存储。
> 
> **Deliverables**:
> - 在 `transformRequestBody()` 中移除 `previousResponseId`
> - 添加测试
> 
> **Estimated Effort**: Quick (10 分钟)
> **Critical Path**: Task 1 → Task 2

---

## Context

### 错误信息
```
Item with id 'msg_026ff8a7a5d3efdf01698af08c7e90819496efc6fbc6f98301' not found.
Items are not persisted when `store` is set to false.
```

### 根因
AI SDK 在多轮对话时，在请求体**顶层**添加 `previousResponseId` 字段：
```json
{
  "model": "gpt-5.3-codex",
  "store": false,
  "previousResponseId": "msg_026ff8a7a5d3efdf...",  // ← 罪魁祸首
  "input": [...]
}
```

当 `store=false` 时，上一轮的响应没被存储，所以 API 找不到这个 ID。

### 为什么之前的修复没用
- `sanitizeItemIds()` 只处理 `input` 数组里的 item
- `body.store = false` 正确设置了 store
- 但 `previousResponseId` 是顶层字段，完全没被处理

---

## TODOs

- [x] 1. 在 transformRequestBody() 中移除 previousResponseId

  **What to do**:
  在 `lib/request/request-transformer.ts` 的 `transformRequestBody()` 函数中，在 `body.store = false` 之后添加：
  ```typescript
  body.store = false
  delete body.previousResponseId  // 新增：移除顶层引用
  delete body.previous_response_id  // 新增：也处理 snake_case 版本
  ```

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **References**:
  - `lib/request/request-transformer.ts:227-230` — 当前 body.store = false 的位置
  - `lib/types.ts` — RequestBody 类型（有 `[key: string]: unknown` 允许任意字段）

  **Acceptance Criteria**:
  - [ ] `previousResponseId` 被从请求体中移除
  - [ ] `previous_response_id` 也被移除（snake_case 版本）
  - [ ] `bun run typecheck` → exit code 0

  **Commit**: NO (groups with Task 2)

---

- [x] 2. 添加测试并提交 + push + bump 版本

  **What to do**:
  在 `tests/unit/request-transformer.test.ts` 中添加测试：
  - transformRequestBody 移除 previousResponseId
  - transformRequestBody 移除 previous_response_id

  然后运行验证、bump 版本到 0.1.51、提交并 push。

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **References**:
  - `tests/unit/request-transformer.test.ts` — 现有测试文件

  **Acceptance Criteria**:
  - [ ] 新增测试用例
  - [ ] `bun run test` → all tests pass
  - [ ] `bun run typecheck` → exit code 0
  - [ ] `bun run build` → exit code 0
  - [ ] 版本 bump 到 0.1.51
  - [ ] 已提交并 push

  **Commit**: YES
  - Message: `fix(codex): remove previousResponseId from request body when store=false`
  - Pre-commit: `bun run test && bun run typecheck`
