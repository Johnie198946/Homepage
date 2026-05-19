# Tasks
- [x] Task 1: 梳理前台 Gallery 当前固定竖幅裁切逻辑，并明确横图、竖图、近方图的判定与回退策略。
  - [x] SubTask 1.1: 检查 `Gallery` 当前卡片比例、图片填充方式与裁切点
  - [x] SubTask 1.2: 确认前端可直接使用的宽高字段与旧数据回退方案
  - [x] SubTask 1.3: 定义横图、竖图、近方图的展示分类规则

- [x] Task 2: 实现主页 Gallery 尊重原始构图的图片展示。
  - [x] SubTask 2.1: 调整卡片容器比例策略，不再默认统一为竖幅
  - [x] SubTask 2.2: 调整图片填充方式，避免横图被强制裁成竖图
  - [x] SubTask 2.3: 保持现有设计语言不变，仅替换构图与容器逻辑

- [x] Task 3: 实现横竖混合展示的 Gallery 排版。
  - [x] SubTask 3.1: 为桌面端设计适配横竖混排的网格布局
  - [x] SubTask 3.2: 为移动端提供稳定且不拥挤的回落布局
  - [x] SubTask 3.3: 确保合集展开/收起后混排仍然整齐可读

- [x] Task 4: 优化后台 Gallery 预览的一致性，避免管理员被错误方向预览误导。
  - [x] SubTask 4.1: 检查后台列表缩略图是否仍固定为竖幅
  - [x] SubTask 4.2: 让后台预览方向与前台构图认知保持一致或接近
  - [x] SubTask 4.3: 确保不影响后台现有批量编辑与上传流程

- [x] Task 5: 验证与验收，确认横竖混排在真实图片下可用。
  - [x] SubTask 5.1: 验证横图、竖图、近方图都按预期展示
  - [x] SubTask 5.2: 验证同一合集内横竖混排的前台排版效果
  - [x] SubTask 5.3: 验证前后台预览、构建与类型检查通过

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1] and [Task 2]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 2] and [Task 3] and [Task 4]
