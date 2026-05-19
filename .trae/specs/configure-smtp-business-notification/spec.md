# SMTP 开启与商务留言固定邮箱通知 Spec

## Why
当前项目已经有商务留言和邮件通知方向的实现基础，但缺少一份明确的规格来约束 SMTP 开启方式和固定收件人通知行为。需要把“如何开启 SMTP”与“提交后向指定 QQ 邮箱发送通知”明确下来，便于后续实现和验收。

## What Changes
- 新增阿里云企业邮箱 SMTP 开启与配置说明要求
- 新增商务留言提交后向固定收件邮箱发送通知邮件的要求
- 约束系统发件邮箱为 `business@t-react.com`
- 约束默认通知收件邮箱为 `403120057@qq.com`
- 明确邮件发送失败时系统仍需保留留言数据并反馈失败状态

## Impact
- Affected specs: 商务合作留言通知、后台留言处理、SMTP 配置
- Affected code: `backend/.env`、后端配置模块、商务留言路由/服务、后台或前台留言提交流程

## SMTP 开启方法
1. 登录阿里云企业邮箱管理后台，确认账号 `business@t-react.com` 可正常登录网页端。
2. 进入账号的安全或客户端设置，开启第三方客户端或 SMTP 发信权限。
3. 如果后台启用了“三方客户端安全密码”，为 `business@t-react.com` 生成一个新的安全密码。
4. 将系统配置设置为：
   - `SMTP_HOST=smtp.qiye.aliyun.com`
   - `SMTP_PORT=465`
   - `SMTP_USE_SSL=true`
   - `SMTP_USE_STARTTLS=false`
   - `SMTP_USERNAME=business@t-react.com`
   - `MAIL_FROM_EMAIL=business@t-react.com`
   - `BUSINESS_NOTIFICATION_EMAIL=403120057@qq.com`
5. 将 `SMTP_PASSWORD` 设置为邮箱登录密码或安全密码：
   - 如果阿里云企业邮箱未开启三方客户端安全密码，可先尝试登录密码
   - 如果已开启三方客户端安全密码，必须使用安全密码，不能使用网页登录密码
6. 保存配置后提交一条测试留言，验证系统是否会从 `business@t-react.com` 向 `403120057@qq.com` 发送通知邮件。

## ADDED Requirements
### Requirement: 提供 SMTP 开启与配置说明
系统 SHALL 提供一套可执行的阿里云企业邮箱 SMTP 开启说明，使管理员能够正确启用 `business@t-react.com` 的 SMTP 发信能力。

#### Scenario: 管理员查看 SMTP 开启方法
- **WHEN** 管理员准备配置 `business@t-react.com` 的 SMTP 发信能力
- **THEN** 系统文档或规格中 SHALL 明确说明需要开启第三方客户端或 SMTP 权限
- **AND** SHALL 明确说明所需服务器地址、端口、加密方式和账号
- **AND** SHALL 明确说明如果企业邮箱启用了三方客户端安全密码，则必须使用安全密码而不是网页登录密码

### Requirement: 商务留言发送固定通知邮件
系统 SHALL 在用户提交商务留言后，使用 `business@t-react.com` 向固定收件邮箱 `403120057@qq.com` 发送一封通知邮件。

#### Scenario: 用户成功提交留言
- **WHEN** 用户在网站留言表单中填写信息并成功提交
- **THEN** 系统 SHALL 将留言持久化到数据库
- **AND** SHALL 尝试使用 `business@t-react.com` 作为发件身份发送通知邮件
- **AND** SHALL 将通知邮件发送到 `403120057@qq.com`
- **AND** 通知邮件内容 SHALL 包含姓名、邮箱、公司、来源页面和留言内容

#### Scenario: SMTP 配置正确且发送成功
- **WHEN** SMTP 已正确开启且账号凭据有效
- **THEN** 系统 SHALL 将站长通知状态记录为成功
- **AND** SHALL 记录成功发送时间

#### Scenario: SMTP 未开启或凭据错误
- **WHEN** SMTP 未开启、三方客户端权限关闭、密码错误或安全密码无效
- **THEN** 系统 SHALL 不回滚已保存的留言数据
- **AND** SHALL 将通知状态记录为失败
- **AND** SHALL 保存可供后台查看的失败原因

## MODIFIED Requirements
### Requirement: 商务留言通知收件人
系统 SHALL 将商务留言通知的默认收件人固定为 `403120057@qq.com`，替代依赖可变业务通知邮箱的默认行为。

## REMOVED Requirements
### Requirement: 留言通知必须依赖动态业务通知邮箱
**Reason**: 当前需求已明确指定固定收件邮箱为 `403120057@qq.com`，无需继续以动态收件人作为默认方案。
**Migration**: 现有配置项如仍保留，可作为可选覆盖项，但默认通知目标必须切换到 `403120057@qq.com`。
