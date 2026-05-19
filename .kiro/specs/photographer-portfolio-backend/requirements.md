# Requirements Document

## Introduction

本文档描述摄影师个人官网后端系统及数据库的完整需求，同时涵盖对现有前端的扩展。系统需为已有的 React + Vite + TypeScript 前端提供完整的后端支撑，包括：媒体资源（图片/视频）的存储与管理、管理后台的数据持久化、访问行为分析，以及 AI 应用入口的新增。数据库方案需完全自建，不依赖 Supabase。

---

## Glossary

- **系统（System）**：摄影师个人官网的完整系统，包含前端、后端 API 和数据库。
- **后端（Backend）**：提供 RESTful API 的服务端应用，负责业务逻辑、数据持久化和文件存储调度。
- **管理员（Admin）**：拥有后台管理权限的摄影师本人，通过 `/admin` 路由访问管理后台。
- **访客（Visitor）**：访问公开前端页面的普通用户，无需登录。
- **媒体文件（Media_File）**：上传至系统的图片或视频文件，存储于对象存储服务中。
- **作品集（Gallery）**：按地点分组展示的摄影作品集合，对应前端 `/gallery` 页面。
- **作品条目（Photo）**：Gallery 中的单张摄影作品，包含图片 URL、标题、描述、地点、分类等元数据。
- **视频条目（Video）**：主页全屏背景视频，包含视频 URL、标题、排序权重、启用状态等元数据。
- **合集（Collection）**：按地点归组的一批 Photo，对应前端 `photoCollections` 数据结构。
- **访问事件（Analytics_Event）**：记录访客行为的数据点，包含事件类型、目标资源、时间戳、来源信息。
- **AI 应用入口（AI_Entry）**：About 页面中指向 AI 应用发布页的跳转链接或卡片，不作为独立导航 Tab。
- **对象存储（Object_Storage）**：用于存储图片和视频文件的云端或自建存储服务（如 MinIO、AWS S3 兼容接口）。
- **JWT（JWT）**：JSON Web Token，用于管理员身份认证的无状态令牌。
- **防盗保护（ImageProtection）**：前端已实现的组件，禁止右键、拖拽、键盘快捷键保存图片。

---

## Requirements

### Requirement 1:管理员身份认证

**User Story:** 作为管理员，我希望通过用户名和密码登录管理后台，以便安全地管理网站内容，防止未授权访问。

#### Acceptance Criteria

1. WHEN 管理员提交有效的用户名和密码，THE 后端 SHALL 返回一个有效期为 24 小时的 JWT 令牌。
2. WHEN 管理员提交无效的用户名或密码，THE 后端 SHALL 返回 HTTP 401 状态码及通用错误描述（不得指明是用户名还是密码错误），且不返回任何令牌。
3. WHEN 管理员发起需要鉴权的 API 请求时未携带有效 JWT 或携带已列入黑名单的 JWT，THE 后端 SHALL 返回 HTTP 401 状态码、通用错误描述，并拒绝请求。
4. WHEN 管理员发起需要鉴权的 API 请求时携带已过期的 JWT，THE 后端 SHALL 返回 HTTP 401 状态码、通用错误描述，并拒绝请求。
5. THE 后端 SHALL 以 bcrypt 算法（cost factor ≥ 12）对管理员密码进行哈希存储，不得明文保存密码。
6. WHEN 管理员携带有效 JWT 请求登出，THE 后端 SHALL 将对应 JWT 加入服务端黑名单，使其立即失效；IF 请求未携带有效 JWT，THEN THE 后端 SHALL 返回 HTTP 401 状态码，不执行登出操作。
7. THE 后端 SHALL 对登录接口实施速率限制，同一 IP 每分钟最多尝试 10 次登录；IF 超出限制，THEN THE 后端 SHALL 返回 HTTP 429 状态码。

---

### Requirement 2:视频管理（主页背景视频）

**User Story:** 作为管理员，我希望对主页全屏背景视频进行增删改查和排序管理，以便灵活控制主页展示的视频内容。

#### Acceptance Criteria

1. THE 后端 SHALL 提供 RESTful API，支持对 Video 条目的创建、读取、更新和删除操作。
2. WHEN 管理员上传视频文件，THE 后端 SHALL 将文件存储至 Object_Storage，并将返回的访问 URL 持久化到数据库；IF Object_Storage 上传失败，THEN THE 后端 SHALL 返回 HTTP 502 状态码及错误描述，不创建数据库记录。
3. WHEN 管理员设置视频的排序权重（整数，范围 1–9999），THE 后端 SHALL 按权重升序返回视频列表，权重相同时按创建时间升序排列；IF 权重值超出范围，THEN THE 后端 SHALL 返回 HTTP 400 状态码。
4. WHEN 管理员将某视频状态设为"禁用"，THE 后端 SHALL 在公开 API 的视频列表中排除该视频。
5. WHEN 前端主页请求当前激活视频列表，THE 后端 SHALL 仅返回状态为"启用"的视频，且按排序权重升序排列。
6. IF 管理员尝试删除不存在的视频 ID，THEN THE 后端 SHALL 返回 HTTP 404 状态码及错误描述。
7. WHEN 管理员删除视频条目，THE 后端 SHALL 先从数据库删除记录，再从 Object_Storage 中删除对应的媒体文件；IF Object_Storage 删除失败，THEN THE 后端 SHALL 记录错误日志，但仍返回删除成功响应（数据库记录已删除）。
8. THE 后端 SHALL 对上传的视频文件进行格式校验，至少接受 MP4、M4V、MOV、WebM 等主流视频格式，文件大小上限为 500MB；IF 文件不符合要求，THEN THE 后端 SHALL 返回 HTTP 400 状态码，响应体中注明是格式不符还是超出大小限制。
9. IF Object_Storage 上传过程中发生网络中断，THEN THE 后端 SHALL 返回 HTTP 502 状态码，不创建数据库记录，且不留孤立文件。
10. WHEN 前端主页请求当前激活视频列表用于首页轮播，THE 后端 SHALL 最多返回 3 条状态为"启用"的视频，并按排序权重升序排列；IF 启用视频少于 3 条，THEN THE 后端 SHALL 返回全部可用启用视频。
11. WHEN 管理员在后台选择上传视频文件，THE 前端 SHALL 在文件选择器提示和上传交互中体现当前支持的主流视频格式，而不是仅表现为单一格式可上传。
12. WHEN 管理员上传 MOV、M4V 等主流但浏览器兼容性不稳定的视频格式用于首页播放，THE 系统 SHALL 在进入首页播放链路前将其转换、规范化或替换为浏览器稳定可播放的分发格式；IF 无法完成兼容化处理，THEN THE 后台 SHALL 明确提示该视频可上传但不能保证首页直接播放，不得在首页静默失败。

---

### Requirement 3:作品集管理（Gallery 图片）

**User Story:** 作为管理员，我希望对 Gallery 中的摄影作品进行增删改查和批量操作，以便高效维护作品集内容。

#### Acceptance Criteria

1. THE 后端 SHALL 提供 RESTful API，支持对 Photo 条目的创建、读取、更新和删除操作。
2. WHEN 管理员上传图片文件，THE 后端 SHALL 将文件存储至 Object_Storage，并将返回的访问 URL 持久化到数据库；IF Object_Storage 上传失败，THEN THE 后端 SHALL 返回 HTTP 502 状态码及错误描述，不创建数据库记录。
3. THE 后端 SHALL 对上传的图片文件进行格式校验，仅接受 JPEG、PNG、WebP 格式，文件大小上限为 20MB；IF 文件不符合要求，THEN THE 后端 SHALL 返回 HTTP 400 状态码，响应体中注明是格式不符还是超出大小限制。
4. WHEN 管理员批量删除多张 Photo（单次最多 100 张），THE 后端 SHALL 在单次事务中完成所有数据库删除操作，并同步从 Object_Storage 中删除对应媒体文件；IF 任意一条数据库删除失败，THEN THE 后端 SHALL 回滚整个事务并返回 HTTP 500 状态码；IF Object_Storage 删除失败，THEN THE 后端 SHALL 记录错误日志，数据库事务仍提交。
5. WHEN 管理员批量更新多张 Photo 的地点或分类字段（单次最多 100 张），THE 后端 SHALL 在单次事务中完成所有更新操作；IF 任意一条更新失败，THEN THE 后端 SHALL 回滚整个事务并返回 HTTP 500 状态码。
6. WHEN 前端 Gallery 页面请求作品列表，THE 后端 SHALL 支持按地点（location）和分类（category）参数过滤，并返回符合条件的 Photo 列表；WHEN 未提供过滤参数，THE 后端 SHALL 返回全部 Photo 列表。
7. THE 后端 SHALL 为 Photo 列表接口提供分页支持，默认每页返回 20 条，最大每页 100 条；IF 分页参数无效（非正整数或超出范围），THEN THE 后端 SHALL 返回 HTTP 400 状态码。
8. WHEN 管理员为 Photo 显式设置排序权重（整数，范围 1–9999），THE 后端 SHALL 在同一 Collection 内按权重升序返回 Photo 列表；WHEN 管理员未设置排序权重，THE 后端 SHALL 按 Photo 创建时间升序返回列表。
9. THE 后端 SHALL 支持 Photo 的双语元数据（中文和英文的标题各不超过 100 字符、描述各不超过 1000 字符），并在 API 响应中同时返回两种语言的内容。

---

### Requirement 4:合集（Collection）管理

**User Story:** 作为管理员，我希望管理按地点分组的摄影合集，以便为 Gallery 页面提供结构化的数据来源。

#### Acceptance Criteria

1. THE 后端 SHALL 提供 RESTful API，支持对 Collection 的创建、读取、更新和删除操作。
2. THE 后端 SHALL 支持 Collection 的双语元数据（中文和英文的地点名称各不超过 100 字符、描述各不超过 500 字符）。
3. WHEN 管理员删除一个 Collection，THE 后端 SHALL 在单次数据库事务中同步删除该 Collection 下的所有 Photo 条目，并从 Object_Storage 中删除对应媒体文件；IF 数据库事务失败，THEN THE 后端 SHALL 回滚并返回 HTTP 500 状态码（已成功删除的 Object_Storage 文件不予恢复）。
4. WHEN 前端请求 Collection 列表，THE 后端 SHALL 在响应中包含每个 Collection 的 Photo 数量统计。
5. IF 管理员尝试创建与已有 Collection 英文地点名称重复的条目，THEN THE 后端 SHALL 返回 HTTP 409 状态码及冲突描述。
6. IF 管理员尝试删除不存在的 Collection ID，THEN THE 后端 SHALL 返回 HTTP 404 状态码及错误描述。

---

### Requirement 5:About 页面内容管理

**User Story:** 作为管理员，我希望通过管理后台编辑 About 页面的双语文本内容，以便随时更新个人介绍和联系信息，无需修改代码。

#### Acceptance Criteria

1. WHEN 管理员请求读取 About 页面内容，THE 后端 SHALL 返回当前存储的中英文双语内容（个人介绍、地点列表、联系方式）。
2. WHEN 管理员提交有效的 About 页面内容更新，THE 后端 SHALL 将更新后的内容持久化到数据库，并返回 HTTP 200 状态码；IF 数据库写入失败，THEN THE 后端 SHALL 返回 HTTP 500 状态码，原有内容保持不变。
3. WHEN 前端 About 页面加载，THE 后端 SHALL 在最多 200ms 内返回当前语言对应的页面内容（200ms 以内含均视为符合）；IF 请求的语言参数无效，THEN THE 后端 SHALL 回退返回英文内容。
4. IF 管理员提交的内容中个人介绍字段（中文或英文）为空，THEN THE 后端 SHALL 返回 HTTP 400 状态码，响应体中注明具体是哪个字段为空。
5. THE 后端 SHALL 对个人介绍字段长度进行校验，中英文各不超过 2000 字符；IF 超出限制，THEN THE 后端 SHALL 返回 HTTP 400 状态码及字段级别的错误描述。

---

### Requirement 5A:管理后台 About 内容编辑入口

**User Story:** 作为管理员，我希望在管理后台中拥有清晰可见的 About 内容编辑入口和编辑界面，以便直接修改个人介绍、地点信息与联系方式，而无需修改代码或依赖隐含入口。

#### Acceptance Criteria

1. WHEN 管理员进入 `/admin` 并登录成功，THE 前端 SHALL 在后台主导航或内容管理区域中展示明确可见的 `About` 编辑入口，不得依赖隐含跳转、图标猜测或开发者约定。
2. WHEN 管理员打开 `About` 编辑入口，THE 前端 SHALL 展示结构化编辑界面，至少包含：个人介绍（中/英）、地点列表或地点说明（中/英）、联系方式字段，以及保存按钮。
3. WHEN 管理员修改 About 内容后点击保存，THE 前端 SHALL 调用 About 更新 API，并在保存成功后展示明确的成功反馈；IF 保存失败，THEN THE 前端 SHALL 展示错误提示，且不得误导用户认为已保存成功。
4. THE About 编辑界面 SHALL 保持与现有后台一致的视觉风格，不引入与当前站点设计语言明显冲突的新布局或新组件体系。
5. WHEN 管理员重新进入后台或刷新页面，THE 前端 SHALL 从后端重新加载当前 About 内容，并在编辑界面中正确回显，而不是仅依赖本地内存态。
6. IF 后端返回的 About 内容为空或缺少某些字段，THEN THE 前端 SHALL 以可编辑的空表单或默认占位内容呈现，不显示报错崩溃或空白区域。

### Requirement 5B:商务合作留言与通知闭环

**User Story:** 作为摄影师站点所有者，我希望访客在 About 页填写商务合作表单后，消息能够被可靠地提交、入库、通知到我本人，并能在后台查看处理状态，同时给访客发送确认邮件，以便我不会漏掉合作需求。

#### Acceptance Criteria

1. WHEN 访客在 About 页 `Business Collaboration` 表单中填写姓名、邮箱、公司和需求内容并提交，THE 前端 SHALL 调用独立的合作留言提交接口，而不是仅在本地弹出成功提示。
2. WHEN 合作留言提交成功，THE 后端 SHALL 将留言持久化到数据库，至少保存：姓名、邮箱、公司、需求内容、来源页面、提交时间、处理状态。
3. WHEN 后端成功接收合作留言，THE 系统 SHALL 向站点拥有者配置的通知邮箱发送一封新留言通知邮件。
4. WHEN 后端成功接收合作留言，THE 系统 SHALL 向访客填写的邮箱发送一封确认邮件副本，告知留言已收到，并包含基本回执信息。
5. IF 向站点拥有者的通知邮件发送失败，THEN THE 后端 SHALL 保留留言入库结果，并返回明确错误状态或降级提示，不得让前端误以为“已完整通知成功”。
6. IF 向访客确认邮件发送失败，THEN THE 后端 SHALL 保留留言入库结果，并记录失败状态，允许管理员在后台查看该异常。
7. WHEN 管理员进入 `/admin` 并登录成功，THE 后端与前端 SHALL 提供一个明确可见的合作留言管理入口，使管理员可以查看留言列表、基础详情和处理状态。
8. WHEN 管理员查看合作留言列表，THE 系统 SHALL 至少支持按时间倒序查看最近留言，并展示未处理/已处理状态。
9. WHEN 管理员打开某条合作留言详情，THE 前端 SHALL 展示访客姓名、邮箱、公司、留言正文、提交时间、邮件通知状态和当前处理状态。
10. WHEN 管理员将留言标记为已处理或待跟进，THE 系统 SHALL 将处理状态持久化，而不是仅存在前端内存中。
11. IF 留言接口或邮件服务未配置完成，THEN About 页 SHALL 给出明确的失败反馈，不得继续保留当前“本地草稿成功”的误导性提示。
12. THE 商务合作留言流程 SHALL 默认采用“邮箱通知 + 后台收件箱”双通道方案，并以邮箱通知为主提醒方式。

---

### Requirement 6:AI 应用入口管理

**User Story:** 作为管理员，我希望在 About 页面中配置 AI 应用的跳转入口（链接和描述），以便向访客展示 AI 作品，无需将其作为独立导航 Tab。

#### Acceptance Criteria

1. THE 后端 SHALL 提供 API，支持对 AI_Entry 的创建、读取、更新和删除操作，每个 AI_Entry 包含标题（双语，各不超过 100 字符）、描述（双语，各不超过 500 字符）、跳转 URL（不超过 2048 字符）和启用状态（布尔值）。
2. WHEN 前端 About 页面加载，THE 后端 SHALL 仅返回状态为"启用"的 AI_Entry 列表，按 sort_order 升序排列；IF 查询失败，THEN THE 后端 SHALL 返回 HTTP 500 状态码。
3. THE 后端 SHALL 对 AI_Entry 的跳转 URL 进行格式校验，仅接受以 `https://` 开头且不超过 2048 字符的 URL；IF 格式不符，THEN THE 后端 SHALL 返回 HTTP 400 状态码及具体原因。
4. IF 管理员尝试更新或删除不存在的 AI_Entry ID，THEN THE 后端 SHALL 返回 HTTP 404 状态码及错误描述。

---

### Requirement 7:访问行为分析

**User Story:** 作为管理员，我希望查看网站的访问统计数据（页面访问量、按钮点击追踪、热门作品统计），以便了解访客行为并优化内容策略。

#### Acceptance Criteria

1. THE 后端 SHALL 提供事件上报 API，接收前端发送的 Analytics_Event，包含事件类型（page_view / button_click / photo_view）、目标资源标识、时间戳和访客来源（Referer、User-Agent）；IF 事件类型不在枚举范围内，THEN THE 后端 SHALL 返回 HTTP 400 状态码，不持久化该事件。
2. WHEN 前端上报有效的 Analytics_Event，THE 后端 SHALL 在 100ms 内返回 HTTP 202 状态码，异步持久化事件数据，不阻塞前端渲染。
3. THE 后端 SHALL 提供统计汇总 API，返回指定时间范围内各页面的 PV（页面访问量）数据，时间范围参数支持最近 7 天、30 天、90 天；IF 时间范围参数缺失或无效，THEN THE 后端 SHALL 返回 HTTP 400 状态码。
4. THE 后端 SHALL 提供热门作品统计 API，返回按 photo_view 事件数量降序排列的 Photo 列表，limit 参数默认 10，最大 100；IF limit 超出范围，THEN THE 后端 SHALL 返回 HTTP 400 状态码。
5. THE 后端 SHALL 提供按钮点击统计 API，返回各按钮（按 target_id 区分）的点击次数汇总，支持与 Criterion 3 相同的时间范围参数。
6. IF 管理员请求统计汇总 API，THEN THE 后端 SHALL 对响应进行 5 分钟缓存，以降低数据库查询压力。
7. THE 后端 SHALL 对事件上报 API 实施速率限制，同一 IP 每分钟最多上报 60 次事件；IF 超出限制，THEN THE 后端 SHALL 返回 HTTP 429 状态码。
8. IF 异步持久化 Analytics_Event 失败，THEN THE 后端 SHALL 静默丢弃该事件并记录错误日志，不影响已返回的 HTTP 202 响应。

---

### Requirement 8:媒体文件存储

**User Story:** 作为系统，我希望图片和视频文件存储在可靠的对象存储服务中，以便实现高可用的媒体访问，并与数据库元数据解耦。

#### Acceptance Criteria

1. THE 后端 SHALL 通过 S3 兼容接口（支持 MinIO 或 AWS S3）对 Object_Storage 进行读写操作，不直接将媒体文件存储于数据库。
2. WHEN 媒体文件上传成功，THE 后端 SHALL 生成并返回该文件的公开访问 URL（有效期不少于 1 年或永久有效），同时返回 HTTP 200 状态码；IF 上传失败，THEN THE 后端 SHALL 返回 HTTP 502 状态码，不创建数据库记录。
3. WHEN 上传的图片文件通过安全校验，THE 后端 SHALL 自动生成缩略图（宽度 400px，保持原始宽高比），并将缩略图 URL 与原图 URL 一同存储；IF 缩略图生成失败，THEN THE 后端 SHALL 记录错误日志，仍返回原图 URL，缩略图 URL 字段为 null。
4. THE 后端 SHALL 对所有上传文件通过文件类型白名单和 Magic Bytes 校验进行安全验证；IF 文件被判定为不安全（Magic Bytes 与声明的 MIME 类型不匹配），THEN THE 后端 SHALL 拒绝存储并返回 HTTP 422 状态码。
5. WHEN 媒体文件被删除，THE 后端 SHALL 同时从 Object_Storage 中删除原图和缩略图；IF 删除失败，THEN THE 后端 SHALL 记录错误日志，不留孤立文件（通过定期清理任务补偿）。

---

### Requirement 9:数据库设计

**User Story:** 作为系统，我希望使用自建关系型数据库存储所有结构化数据，以便实现完整的数据控制权，不依赖第三方 BaaS 服务。

#### Acceptance Criteria

1. THE 系统 SHALL 使用 PostgreSQL（版本 ≥ 14）作为主数据库，所有结构化数据均存储于 PostgreSQL。
2. THE 系统 SHALL 通过数据库迁移脚本（migration files）管理 Schema 变更，每次变更均有对应的 up 和 down 迁移脚本。
3. THE 数据库 SHALL 包含以下核心数据表：`admins`（管理员账户）、`videos`（视频条目）、`collections`（合集）、`photos`（作品条目，含外键 `photos.collection_id → collections.id`）、`about_content`（About 页面内容）、`ai_entries`（AI 应用入口）、`analytics_events`（访问事件）。
4. THE 数据库 SHALL 为 `analytics_events` 表按自然月进行 Range Partitioning（每个自然月为一个分区），以保证查询性能；IF 使用 Hash Partitioning 替代，THEN 该实现不符合本需求。
5. THE 数据库 SHALL 为高频查询字段建立索引：`photos.collection_id`、`photos.location`、`photos.category`、`analytics_events.event_type`、`analytics_events.created_at`、`videos.sort_order`。
6. THE 系统 SHALL 对数据库连接使用连接池（最小连接数 2，最大连接数 20）；WHEN 连接池耗尽时新请求等待超过 30 秒，THE 系统 SHALL 向调用方返回错误，不无限阻塞，且不影响现有连接。

---

### Requirement 10:前端接入后端 API

**User Story:** 作为前端，我希望所有页面的数据均从后端 API 动态加载，以便替换现有的硬编码静态数据，实现内容的动态管理。

#### Acceptance Criteria

1. WHEN 前端主页（Home）加载，THE 系统 SHALL 从后端 API 获取当前激活的视频列表，替换现有硬编码的视频 URL；IF API 请求失败，THEN THE 前端 SHALL 回退显示预设的占位视频或静态背景。
2. WHEN 前端 Gallery 页面加载，THE 系统 SHALL 从后端 API 获取 Collection 和 Photo 列表，替换现有硬编码的 `photoCollections` 数据；IF API 请求失败，THEN THE 前端 SHALL 显示错误提示，不显示空白页面。
3. WHEN 前端 About 页面加载，THE 系统 SHALL 从后端 API 获取当前语言的页面内容和 AI_Entry 列表，替换现有硬编码的文本；IF API 请求失败，THEN THE 前端 SHALL 回退显示本地 i18n 静态文本。
4. WHEN 前端 Admin 页面执行增删改查操作，THE 系统 SHALL 通过后端 API 完成数据持久化，替换现有的内存状态管理；IF API 请求失败，THEN THE 前端 SHALL 显示操作失败提示，不更新本地状态。
5. THE 前端 SHALL 在 API 请求期间展示加载状态（skeleton 或 spinner），在 API 请求失败时展示错误提示，不显示空白页面。
6. THE 前端 SHALL 对 Gallery 图片列表实施懒加载（Intersection Observer），仅在图片进入视口时发起图片资源请求。
7. WHEN 访客在前端触发页面访问或按钮点击事件，THE 前端 SHALL 异步向后端事件上报 API 发送 Analytics_Event，不阻塞用户交互；IF 上报请求失败，THE 前端 SHALL 静默忽略，不向用户展示错误。

8. WHEN 管理员在后台编辑 About 内容，THE 前端 SHALL 使用显式的 About 表单入口与独立保存动作接入 `/api/about`，而不是仅通过隐式状态或其他内容管理入口间接修改。
9. WHEN 首页获取到 2 至 3 条启用视频，THE 前端 SHALL 以轮播方式依次播放这些视频，并保持现有首页视觉风格不变；IF 仅获取到 1 条启用视频，THEN THE 前端 SHALL 保持单视频展示；IF 未获取到任何视频，THEN THE 前端 SHALL 显示现有空态或回退背景。
10. WHEN 首页视频资源的容器或编码不被当前浏览器稳定支持，THE 系统 SHALL 采用兼容分发资源或明确降级策略，避免出现后台显示已启用但首页静默不播放的状态。
11. WHEN 访客在 About 页提交商务合作留言，THE 前端 SHALL 保持当前页面视觉语言不变，仅将现有表单改造为真实提交流程，并在提交中、提交成功、提交失败时提供清晰反馈。

---

### Requirement 11:API 设计与安全

**User Story:** 作为系统，我希望后端 API 遵循 RESTful 规范并具备基本安全防护，以便前端可靠调用，同时抵御常见 Web 攻击。

#### Acceptance Criteria

1. THE 后端 SHALL 遵循 RESTful 设计规范：资源使用复数名词路径（如 `/api/photos`），层级关系通过路径嵌套表达（如 `/api/collections/{id}/photos`），使用标准 HTTP 方法（GET / POST / PUT / PATCH / DELETE）。
2. THE 后端 SHALL 为所有 API 响应设置 CORS 头，仅允许配置的前端域名白名单跨域访问；IF 请求来源不在白名单，THEN THE 后端 SHALL 返回 HTTP 403 状态码。
3. THE 后端 SHALL 对所有用户输入进行参数校验；IF 参数校验失败，THEN THE 后端 SHALL 返回 HTTP 400 状态码，响应体中注明哪个字段不符合要求；所有数据库查询使用参数化查询或 ORM，不拼接原始 SQL 字符串。
4. THE 后端 SHALL 在生产环境仅接受 HTTPS 请求；IF 收到 HTTP 明文请求，THEN THE 后端 SHALL 返回 301 重定向至对应 HTTPS 地址。
5. THE 后端 SHALL 提供 OpenAPI（Swagger）文档，每个 API 端点均包含请求参数说明和响应 Schema 定义，文档路径为 `/api/docs`。
6. THE 后端 SHALL 对非事件上报类 API 实施速率限制，同一 IP 每分钟最多请求 120 次；IF 超出限制，THEN THE 后端 SHALL 返回 HTTP 429 状态码。
7. THE 后端 SHALL 记录所有管理员操作的审计日志（操作类型、操作对象 ID、操作时间、操作者 IP），日志保留期不少于 90 天。

---

### Requirement 12:图片防盗保护（前端扩展）

**User Story:** 作为摄影师，我希望前端的图片防盗保护机制与后端存储方案协同工作，以便有效保护作品版权。

#### Acceptance Criteria

1. WHILE Gallery 页面处于活跃状态，THE ImageProtection 组件 SHALL 通过阻止默认浏览器行为（preventDefault）持续禁用右键菜单、图片拖拽和 Ctrl+S / Cmd+S 快捷键。
2. THE 后端 SHALL 为图片访问 URL 支持 Referer 校验，仅允许来自已配置官网域名白名单的请求访问 Object_Storage 中的图片；IF Referer 不匹配或为空（包括通过书签或直接链接访问的情况），THEN THE 后端（或 Object_Storage 策略）SHALL 严格返回 HTTP 403 状态码。
3. THE 后端 SHALL 为图片 URL 提供签名机制（Presigned URL，有效期精确为 3600 秒），前端通过后端 API 获取签名 URL 后再加载图片，不直接暴露 Object_Storage 的原始 URL；WHEN 签名 URL 过期，THE 前端 SHALL 自动重新请求新的签名 URL；IF 重新请求失败，THEN THE 前端 SHALL 在图片位置显示错误提示。
4. THE 后端 SHALL 在图片元数据中记录版权信息（摄影师姓名、拍摄年份），并在 API 响应中返回该信息；THE 前端 SHALL 在图片展示区域内显示摄影师姓名与拍摄年份。
