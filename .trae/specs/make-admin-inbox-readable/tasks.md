# Tasks
- [x] Task 1: 明确后台消息入口，让管理员知道去哪里阅读用户来信。
  - [x] SubTask 1.1: 调整后台 `Business` 入口的命名和说明文案
  - [x] SubTask 1.2: 在后台登录后展示更明确的消息中心引导
  - [x] SubTask 1.3: 存在未读留言时突出显示入口和未读数量

- [x] Task 2: 完善消息列表与详情阅读交互，让管理员能顺畅阅读用户留言。
  - [x] SubTask 2.1: 优化列表中的核心字段和未读视觉提示
  - [x] SubTask 2.2: 优化详情区域的阅读顺序和帮助说明
  - [x] SubTask 2.3: 保持点击详情自动已读和状态流转能力

- [x] Task 3: 补齐空状态与首次使用提示，让内部信模式更容易理解。
  - [x] SubTask 3.1: 为无留言场景设计空状态提示
  - [x] SubTask 3.2: 为消息中心增加“如何阅读和处理留言”的帮助说明
  - [x] SubTask 3.3: 确认前后台术语统一为“内部信/消息中心”

- [x] Task 4: 完成验证与验收，确认管理员能在后台清楚地阅读用户来信。
  - [x] SubTask 4.1: 验证登录后台后可以快速定位到消息中心
  - [x] SubTask 4.2: 验证消息列表、详情、已读和状态更新流程
  - [x] SubTask 4.3: 验证空状态和帮助提示符合预期

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1] and [Task 2] and [Task 3]
