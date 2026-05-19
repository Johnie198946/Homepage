# 后台内部信阅读入口与交互完善 Spec

## Why
当前商务留言已经进入后台内部信收件箱，但管理员如何进入后台、在哪里阅读用户消息、如何从未读到处理完成，交互还不够直观。需要把后台阅读入口、消息列表、详情阅读和处理动作完整设计出来，确保你能直接在后台看到并处理用户来信。

## What Changes
- 新增后台“内部信/消息中心”可见入口与引导说明
- 优化后台默认进入消息阅读场景的交互
- 增强消息列表、详情、未读提示和处理动作的可读性
- 保留现有留言入库和状态流转能力
- **BREAKING** 后台原 `Business` 文案和交互将调整为更明确的“内部信/消息中心”语义

## Impact
- Affected specs: 商务留言内部信、后台仪表盘、管理员消息处理流程
- Affected code: `src/app/components/Admin.tsx`、`src/app/routes.tsx`、前端文案、相关 inquiry API 消费层

## ADDED Requirements
### Requirement: 后台提供明确的内部信阅读入口
系统 SHALL 在后台为管理员提供明确的内部信阅读入口，使管理员知道在哪里查看访客发来的商务留言。

#### Scenario: 管理员进入后台首页
- **WHEN** 管理员登录后台
- **THEN** 系统 SHALL 明确展示“内部信”或“消息中心”入口
- **AND** SHALL 说明该入口用于阅读访客提交的商务留言

#### Scenario: 存在未读内部信
- **WHEN** 后台存在未读留言
- **THEN** 系统 SHALL 在入口处显示未读数量
- **AND** SHOULD 将管理员优先引导到消息阅读区域

### Requirement: 后台提供完整的消息阅读界面
系统 SHALL 提供完整的后台消息阅读界面，用于阅读、识别和处理每一条访客留言。

#### Scenario: 管理员查看消息列表
- **WHEN** 管理员进入内部信页面
- **THEN** 系统 SHALL 展示消息列表
- **AND** 每条消息 SHALL 至少显示姓名、邮箱、公司、提交时间、未读状态和处理状态

#### Scenario: 管理员查看消息详情
- **WHEN** 管理员点击一条消息
- **THEN** 系统 SHALL 展示完整消息详情
- **AND** SHALL 包含姓名、邮箱、公司、来源页面、提交时间和留言正文
- **AND** SHALL 将消息标记为已读

#### Scenario: 管理员处理消息
- **WHEN** 管理员在详情页中跟进该留言
- **THEN** 系统 SHALL 支持将该消息更新为 `new`、`in_progress`、`resolved`
- **AND** SHALL 在界面中清晰反映当前处理状态

### Requirement: 后台空状态和帮助提示
系统 SHALL 在后台消息中心提供空状态和帮助提示，让管理员知道如何使用内部信模式。

#### Scenario: 没有任何商务留言
- **WHEN** 系统中还没有访客留言
- **THEN** 后台 SHALL 显示空状态提示
- **AND** SHALL 告知管理员用户在 `About` 页提交后会出现在这里

#### Scenario: 管理员首次查看内部信
- **WHEN** 管理员进入消息中心
- **THEN** 系统 SHOULD 显示简短说明
- **AND** SHOULD 说明“点击左侧列表即可阅读用户来信，右侧可查看详情并更新处理状态”

## MODIFIED Requirements
### Requirement: 后台商务留言入口命名
系统 SHALL 将后台原有的 `Business` 留言入口改为更明确的“内部信”或“消息中心”表达，以降低理解成本。

### Requirement: 管理员阅读消息流程
系统 SHALL 让管理员在登录后台后更直接地进入消息阅读流程，而不是要求管理员自行摸索留言入口。

## REMOVED Requirements
### Requirement: 后台仅以业务标签方式隐式承载留言入口
**Reason**: 现有入口表达不够直观，管理员难以快速判断在哪里阅读用户来信。
**Migration**: 保留原有数据与 API，前端入口、文案和阅读流程升级为明确的内部信消息中心。
