# Tasks
- [x] Task 1: 梳理当前主页 Gallery 列布局与断点策略，明确现有 2~3 列限制来自哪些类名与渲染结构。
  - [x] SubTask 1.1: 检查 `Gallery` 当前骨架屏、合集列表、展开态分别使用的列布局
  - [x] SubTask 1.2: 识别当前 `columns-*` / 间距 / 卡片比例对横竖图展示密度的影响

- [x] Task 2: 设计并实现主页 Gallery 的高密度多列布局，在桌面端达到至少 4 列。
  - [x] SubTask 2.1: 为桌面端设定至少 4 列的默认展示规则
  - [x] SubTask 2.2: 为平板和移动端提供逐级回退列数与间距
  - [x] SubTask 2.3: 保持现有视觉语言不变，仅调整列密度、间距和卡片节奏

- [x] Task 3: 优化横图、竖图、近方图在高密度布局下的尺寸表现。
  - [x] SubTask 3.1: 调整多列条件下的卡片尺寸策略，避免横图过扁
  - [x] SubTask 3.2: 验证竖图和近方图在 4 列以上布局中仍清晰可读
  - [x] SubTask 3.3: 确保不回退为统一固定比例裁切

- [x] Task 4: 同步更新加载态与合集展开态的布局一致性。
  - [x] SubTask 4.1: 让骨架屏使用与真实内容一致的列密度规则
  - [x] SubTask 4.2: 让 `View All / Show Less` 前后保持同一套多列布局节奏

- [x] Task 5: 验证桌面端至少 4 列、响应式回退和混排稳定性。
  - [x] SubTask 5.1: 验证桌面端一行至少展示 4 列
  - [x] SubTask 5.2: 验证平板和移动端不会过挤或留白异常
  - [x] SubTask 5.3: 验证横竖混排、骨架屏、展开态都符合新布局目标

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1] and [Task 2]
- [Task 4] depends on [Task 2]
- [Task 5] depends on [Task 2] and [Task 3] and [Task 4]
