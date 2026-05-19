# Tasks
- [x] Task 1: 补充 SMTP 开启说明与配置约束，使管理员能够正确启用 `business@t-react.com` 的 SMTP 能力。
  - [x] SubTask 1.1: 梳理阿里云企业邮箱开启 SMTP、第三方客户端权限和安全密码的步骤
  - [x] SubTask 1.2: 明确系统使用的 SMTP 主机、端口、SSL/TLS 策略和账号字段
  - [x] SubTask 1.3: 将错误凭据、未开启权限等失败场景写入验收标准

- [x] Task 2: 调整商务留言邮件通知逻辑，使提交后固定发送到 `403120057@qq.com`。
  - [x] SubTask 2.1: 确认现有留言提交流程仍然先入库再发信
  - [x] SubTask 2.2: 将通知邮件默认收件人改为 `403120057@qq.com`
  - [x] SubTask 2.3: 保持发件身份为 `business@t-react.com`
  - [x] SubTask 2.4: 确保通知邮件正文包含姓名、邮箱、公司、来源页面和留言内容

- [x] Task 3: 保留失败降级与后台可见性，避免因发信失败导致留言流程不可用。
  - [x] SubTask 3.1: 发送失败时保留留言数据
  - [x] SubTask 3.2: 记录通知失败状态和错误原因
  - [x] SubTask 3.3: 确认后台可以查看留言及通知状态

- [x] Task 4: 完成验证与验收，确认 SMTP 配置说明和固定收件通知行为符合规格。
  - [x] SubTask 4.1: 验证留言提交后数据库有记录
  - [x] SubTask 4.2: 验证邮件发送目标为 `403120057@qq.com`
  - [x] SubTask 4.3: 验证 SMTP 未开启或凭据错误时会记录失败原因
  - [x] SubTask 4.4: 验证成功发信时会记录发送时间

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 2] and [Task 3]
