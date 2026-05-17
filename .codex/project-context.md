# 项目上下文

## 一句话概述

Bookkeeping 是一个面向个人与家庭共享场景的智能记账平台，包含 NestJS 主业务服务、FastAPI AI 服务、Vue 后台、uni-app 用户端，以及面向未来多端和多 AI 能力扩展的工程底座。

## 第一阶段产品范围

- 用户注册、登录和设备会话。
- 个人账本和家庭账本。
- 家庭成员邀请、成员角色和权限。
- 账户、分类、收入、支出、转账。
- 默认共享流水和私密流水。
- AI 文本记账。
- AI 票据识别。
- 月度收支、分类占比、账户统计、成员消费统计。
- 后台用户、账本、AI 任务和审计管理。

## 非第一阶段范围

- 小商户财务。
- 税务和进销存。
- 复杂资产管理。
- 完整双分录会计系统。
- Android、iOS、鸿蒙全量上架流程。

## 核心建模原则

- 交易属于账本：`transactions.ledger_id`。
- 交易由成员创建：`transactions.created_by`。
- 权限来自成员关系：`ledger_members`。
- AI 结果必须先进入候选表，用户确认后才能生成正式流水。
- 私密流水和私密账户从第一版进入模型。

## 推荐应用结构

```txt
apps/
  api/
  ai-service/
  admin-web/
  mobile/

packages/
  shared-types/
  api-client/
  validation/
  config/
```

## 视觉系统

根目录 `designer.md` 是前端视觉系统基准，风格为 High-Fidelity Claymorphism。后台 Web 可以适当克制装饰密度，用户端应更完整表达圆润、柔软、轻量动效和高触感风格。
