# Tasks
- [x] Task 1: 复现并定位三个回归问题的触发链路。
  - [x] SubTask 1.1: 检查主页 `Gallery` 的网格跨列与自动排布规则，明确为什么首张横图后会残留竖图空位
  - [x] SubTask 1.2: 检查后台 `Admin` 中 batch upload 的合集选择逻辑，明确缺失的联动/筛选发生在哪个状态流转节点
  - [x] SubTask 1.3: 检查 batch upload 提交前的单张图片编辑状态、请求组包和后端接收逻辑，明确 EN/CN 标题为何未生效

- [x] Task 2: 修复主页 Gallery 的混排补位规则。
  - [x] SubTask 2.1: 调整横图跨列后的网格排布策略，避免后续行出现可避免空位
  - [x] SubTask 2.2: 确保合集默认态与展开态使用一致的补位规则
  - [x] SubTask 2.3: 保持现有至少 4 列桌面端目标与现有视觉语言不回退

- [x] Task 3: 修复后台 batch upload 的合集联动与自动筛选。
  - [x] SubTask 3.1: 让选择合集后的上传上下文自动联动到对应合集
  - [x] SubTask 3.2: 处理切换合集时的状态重置与重新筛选，避免沿用旧合集状态
  - [x] SubTask 3.3: 确保不破坏现有批量上传、公共字段填写与已存在照片列表交互

- [x] Task 4: 修复 batch upload 中单张图片编辑字段不生效的问题。
  - [x] SubTask 4.1: 保证单张图片编辑后的 `title_en`、`title_zh` 等字段正确写入提交 payload
  - [x] SubTask 4.2: 保证后端按编辑值保存，而不是被默认文件名或回退逻辑覆盖
  - [x] SubTask 4.3: 上传成功后在后台列表与前台 Gallery 中能看到已编辑结果

- [x] Task 5: 回归验证三个问题及相关流程。
  - [x] SubTask 5.1: 验证首张横图、横竖混排、展开合集下不再出现异常空位
  - [x] SubTask 5.2: 验证 batch upload 选择合集后联动/筛选即时生效
  - [x] SubTask 5.3: 验证单张图片 EN/CN 标题编辑后上传结果正确，并通过构建或必要检查

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 2] and [Task 3] and [Task 4]
