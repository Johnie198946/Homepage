# Tasks
- [x] Task 1: 梳理当前 Gallery 预览清晰度与水印展示链路，确认缩略图、预览图和原图的使用位置。
  - [x] SubTask 1.1: 检查前台列表与大图查看分别走哪条媒体加载路径
  - [x] SubTask 1.2: 确认当前可见水印来自哪里，以及与下载/截图保护的耦合点
  - [x] SubTask 1.3: 定义列表预览、大图查看、保护动作三类场景的目标策略

- [x] Task 2: 提升主页 Gallery 的正常浏览清晰度。
  - [x] SubTask 2.1: 调整前台媒体选择逻辑，提升列表预览清晰度
  - [x] SubTask 2.2: 调整大图查看链路，优先提供更高清的查看版本
  - [x] SubTask 2.3: 在保证性能可接受的前提下，避免明显模糊的预览效果

- [x] Task 3: 去除正常浏览时的显式水印，并保留保护能力。
  - [x] SubTask 3.1: 调整 `ImageProtection` 的常驻可见水印策略
  - [x] SubTask 3.2: 保留右键、拖拽、保存、复制等基础保护
  - [x] SubTask 3.3: 保留或优化截图相关保护逻辑，但不影响日常浏览观感

- [x] Task 4: 视需要优化后端图片分发与缩略图策略。
  - [x] SubTask 4.1: 复核 `thumb`、预签名地址和原图媒体分发的使用边界
  - [x] SubTask 4.2: 如果当前缩略图分辨率过低，补充更适合前台预览的中间尺寸策略
  - [x] SubTask 4.3: 确保不破坏现有对象存储与媒体代理链路

- [x] Task 5: 验证与验收，确认高清无水印预览与保护策略同时成立。
  - [x] SubTask 5.1: 验证 Gallery 列表预览清晰度明显提升
  - [x] SubTask 5.2: 验证正常浏览时不再出现显式水印
  - [x] SubTask 5.3: 验证下载/截图/保存相关保护仍然存在

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 2] and [Task 3] and [Task 4]
