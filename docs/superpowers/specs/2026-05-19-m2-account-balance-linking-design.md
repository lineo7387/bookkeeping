# M2 账户余额流水联动设计文档

## 1. 背景与目标

M1.5 已完成账户、分类、收入、支出、转账和流水基础 API，但 `accounts.current_balance` 仍由账户接口手工维护，流水创建、更新和删除不会自动影响余额。M2 的第一个增量目标是补齐基础账户余额，使用户记账后能看到可信的账户余额变化，并为后续基础统计提供一致的数据基础。

本次设计不追求一次性实现完整会计台账，而是优先完成可落地、可验证、可扩展的余额联动：

- 正式流水生命周期会自动影响相关账户余额。
- 流水写入和余额调整处于同一个数据库事务。
- 余额计算规则集中在后端 Service/Repository，不交给前端推导。
- 保留后续余额重算任务、余额变动台账和审计增强的演进空间。

## 2. 范围

本次包含：

- 创建 `income` 流水时，源账户余额增加。
- 创建 `expense` 流水时，源账户余额减少。
- 创建 `transfer` 流水时，源账户余额减少，目标账户余额增加。
- 更新流水时，先撤销旧流水对余额的影响，再应用新流水对余额的影响。
- 删除流水时，软删除流水，并撤销旧流水对余额的影响。
- 余额调整与流水创建、更新、软删除使用同一个 Prisma transaction。
- 更新 `docs/modules/accounts/账户说明.md` 和 `docs/modules/transactions/流水说明.md`，把 M2 余额规则写入模块文档。
- 补充单元测试覆盖创建、更新、删除、转账目标变更和类型变更场景。

本次不包含：

- 新增余额变动台账表。
- 新增历史流水余额重算接口或后台任务。
- 多币种汇率折算。
- 信用卡账单周期、额度、还款日等信用账户专项规则。
- AI 候选确认、统计 API 或前端页面改造。

## 3. 业务规则

### 3.1 金额方向

金额仍使用 Decimal 字符串入参和 Prisma Decimal 存储，禁止使用 float 计算。

余额影响规则：

```txt
income:
  account.current_balance += amount

expense:
  account.current_balance -= amount

transfer:
  source_account.current_balance -= amount
  target_account.current_balance += amount
```

`transfer` 的目标账户继续来自 `transactions.metadata.transferTargetAccountId`。本阶段仍采用 M1.5 的单条转账流水模型，Service 层封装余额影响，避免未来升级为双分录模型时影响前端接口。

### 3.2 创建流水

创建流水时沿用现有权限和校验：

- 先通过 `canCreateTransaction(userId, ledgerId)`。
- 校验源账户可见且未归档。
- 收入/支出必须校验分类属于同一账本且类型匹配。
- 转账必须校验目标账户可见、未归档且属于同一账本。
- 源账户或目标账户任一为私密账户时，流水强制为 `private`。

通过校验后，在同一个事务内：

1. 创建正式流水。
2. 按流水类型调整账户余额。
3. 返回创建后的流水摘要。

### 3.3 更新流水

更新流水必须先读取旧流水，计算旧影响和新影响：

1. 按旧流水撤销余额影响。
2. 写入流水更新。
3. 按更新后的流水应用新的余额影响。

该流程必须在同一个事务内完成。这样可以覆盖以下变化：

- 金额变化。
- 类型变化，例如 `expense` 改为 `income`。
- 源账户变化。
- 转账目标账户变化。
- 转账改为收入/支出时清空转账 metadata。
- 收入/支出改为转账时写入转账 metadata。

如果更新失败、目标账户非法或分类校验失败，不允许产生任何余额变化。

### 3.4 删除流水

删除流水继续采用软删除：

1. 先通过 `canUpdateTransaction(userId, transactionId)`。
2. 在事务内撤销旧流水余额影响。
3. 写入 `deleted_at`。

如果流水已删除或不可见，仍返回现有不泄露资源存在性的 not found 风格响应。

### 3.5 账户手工余额

M2 不删除账户接口中的 `currentBalance` 更新能力。原因是 MVP 阶段仍需要用户修正初始导入、漏记或历史数据造成的余额偏差。

但文档需明确：

- 创建账户时 `initial_balance` 和 `current_balance` 仍可设置。
- 日常正式流水会自动影响 `current_balance`。
- 手工修改 `current_balance` 是余额修正行为，不会反向创建流水。
- 后续引入余额变动台账后，应把手工修正记录为单独的 balance adjustment entry。

## 4. 架构设计

### 4.1 模块边界

保持现有 NestJS 分层：

- Controller 只处理 HTTP 入参、鉴权装饰器和响应。
- `TransactionsService` 负责权限后的业务流程、余额影响计算和异常语义。
- `TransactionsRepository` 负责 Prisma 读写和事务封装。
- `LedgerPolicyService` 继续负责账本、账户、流水权限判断。

不把余额规则放到前端，也不把权限判断下沉到 Repository。

### 4.2 Repository 事务接口

`TransactionsRepository` 增加事务型方法，避免 Service 手写分散 Prisma 调用：

```ts
createWithBalanceChanges(data, balanceChanges)
updateWithBalanceChanges(transactionId, data, balanceChanges)
softDeleteWithBalanceChanges(transactionId, deletedAt, balanceChanges)
```

`balanceChanges` 是经过 Service 计算后的账户差额列表：

```ts
type AccountBalanceChange = {
  accountId: string
  delta: string
}
```

Repository 在事务内对每个账户执行 Decimal 增量更新：

```ts
currentBalance: { increment: delta }
```

负数 delta 表示扣减。对于转账，如果源账户和目标账户相同，Service 应拒绝，避免产生无意义流水和余额净零变动。

### 4.3 余额影响计算

`TransactionsService` 内部增加纯函数式辅助逻辑：

- `buildBalanceChanges(effect)`：把流水类型、金额、源账户、目标账户转成差额列表。
- `invertBalanceChanges(changes)`：撤销旧影响。
- `mergeBalanceChanges(changes)`：同一账户多次变化时合并差额，减少数据库更新次数。

这些函数不访问数据库，便于单元测试理解和后续抽到独立领域服务。

### 4.4 Decimal 处理

Service 不使用 `number` 做金额加减。实现可以使用 Prisma Decimal 或字符串符号处理：

- 创建新影响时，正向 delta 使用 `amount`。
- 负向 delta 使用 `-${amount}`。
- 撤销影响时只翻转符号。
- 合并同账户 delta 时使用 Prisma Decimal，最后转成字符串传给 Repository。

## 5. 数据流

### 创建支出流水

```txt
Controller
  -> TransactionsService.createTransaction
  -> Policy: canCreateTransaction
  -> 校验账户、分类、转账目标
  -> Service 计算 balanceChanges: [{ accountId, delta: "-86.00" }]
  -> Repository.createWithBalanceChanges
       transaction.create
       account.updateMany increment current_balance
  -> 返回 TransactionSummary
```

### 更新转账流水

```txt
Controller
  -> TransactionsService.updateTransaction
  -> Policy: canUpdateTransaction
  -> 读取旧流水
  -> 校验新源账户、新目标账户和分类
  -> 旧影响取反
  -> 新影响正向应用
  -> Repository.updateWithBalanceChanges
       account.updateMany increment reverse old changes
       transaction.updateMany
       account.updateMany increment new changes
  -> 返回更新后 TransactionSummary
```

### 删除流水

```txt
Controller
  -> TransactionsService.deleteTransaction
  -> Policy: canUpdateTransaction
  -> 读取旧流水
  -> 旧影响取反
  -> Repository.softDeleteWithBalanceChanges
       account.updateMany increment reverse old changes
       transaction.updateMany deleted_at
  -> 返回 { deleted: true }
```

## 6. 权限与隐私

本次不新增角色或 Policy 方法。

- 创建仍使用 `canCreateTransaction`。
- 查询仍使用 `canViewTransaction`。
- 更新和删除仍使用 `canUpdateTransaction`。
- 账户可用性仍使用 `canViewAccount`。
- 私密账户和私密流水仍在后端强制过滤。

余额调整只能发生在已经通过权限和业务校验的正式流水操作之后。不可见或非法账户不能通过余额接口间接被探测。

## 7. 异常情况

- 非账本成员创建流水：`MEMBER_ROLE_DENIED`。
- 不可见或已归档账户：`ACCOUNT_NOT_FOUND`。
- 分类类型不匹配：`VALIDATION_FAILED`。
- 转账缺少目标账户：`VALIDATION_FAILED`。
- 转账目标账户与源账户相同：`VALIDATION_FAILED`。
- 流水不存在、已删除或不可见：沿用现有 not found 风格响应。
- 事务中任一步失败：整笔流水写入和余额变化回滚。

## 8. 测试策略

单元测试优先覆盖 Service 对 Repository 的调用意图和业务规则：

- 创建收入时传入正向余额变化。
- 创建支出时传入负向余额变化。
- 创建转账时同时传入源账户负向和目标账户正向余额变化。
- 更新金额时撤销旧金额并应用新金额。
- 更新类型时正确转换方向。
- 更新源账户或转账目标账户时撤销旧账户影响并应用新账户影响。
- 删除流水时撤销旧余额影响并软删除。
- 转账源账户和目标账户相同时拒绝创建或更新。

Repository 测试通过 mock Prisma transaction 验证：

- 事务中先后执行流水写入和账户余额增量更新。
- 更新失败时不返回成功。
- 软删除失败时不返回成功。

完成前运行：

```bash
pnpm --filter @bookkeeping/shared-types build
pnpm --filter @bookkeeping/api prisma:generate
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
pnpm build
git diff --check
```

## 9. 后续扩展

### 9.1 余额重算

后续可增加内部维护能力：

- 按账户从 `initial_balance` 加总所有未删除正式流水影响，重算 `current_balance`。
- 支持单账户重算和整账本重算。
- 后台显示重算前后差异，由管理员或账本 owner/admin 确认。

### 9.2 余额变动台账

当产品需要更强审计能力时，新增 `account_balance_entries`：

```txt
id
ledger_id
account_id
transaction_id
type                 transaction | transfer | manual_adjustment | recalculation
delta
balance_after
created_by
created_at
metadata
```

届时流水联动仍可保留当前 Service 计算入口，只是在同一事务内额外写入余额台账，并把手工余额修正从账户普通更新升级为明确的 adjustment entry。

### 9.3 统计 API

账户余额联动完成后，基础统计可以基于可信的 `transactions` 和 `accounts.current_balance` 实现：

- 月度收支。
- 分类占比。
- 账户统计。
- 成员消费统计。

统计仍需遵循私密流水与私密账户过滤规则。
