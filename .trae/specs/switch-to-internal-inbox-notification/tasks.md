# Tasks
- [x] Task 1: 明确前台提交后的内部信交互，让访客知道留言已进入后台处理流程。
  - [x] SubTask 1.1: 梳理 `About` 页提交成功、失败和提交中的反馈文案
  - [x] SubTask 1.2: 移除对“邮件通知成功/失败”的默认依赖
  - [x] SubTask 1.3: 明确提交成功后前台应展示的站内反馈

- [x] Task 2: 设计后台内部信收件箱交互，确保管理员能直接接收和处理商务留言。
  - [x] SubTask 2.1: 设计收件箱列表字段与排序规则
  - [x] SubTask 2.2: 设计留言详情页的阅读与状态变更流程
  - [x] SubTask 2.3: 设计未读、已读与处理状态之间的关系

- [x] Task 3: 设计后台提醒机制，让管理员及时发现新商务留言。
  - [x] SubTask 3.1: 明确后台导航或角标的未读提示方式
  - [x] SubTask 3.2: 明确打开详情后未读标记如何消除
  - [x] SubTask 3.3: 明确无未读消息时的展示规则

- [x] Task 4: 明确数据与验收要求，保证内部信模式能稳定替代邮件通知。
  - [x] SubTask 4.1: 明确留言入库、未读状态和处理状态的必要字段
  - [x] SubTask 4.2: 明确邮件相关旧流程如何降级为可停用状态
  - [x] SubTask 4.3: 定义访客提交流程与后台处理流程的验收步骤

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 1] and [Task 2] and [Task 3]
