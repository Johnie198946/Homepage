# 修复 Gallery 布局与批量上传回归 Spec

## Why
主页 Gallery 在横竖混排场景下仍会出现空位，影响作品排版完整性；后台 Gallery 的 batch upload 也存在合集选择联动缺失和单张编辑字段未生效的问题，直接影响管理效率与内容准确性。

## What Changes
- 修复主页 Gallery 在首张为横构图时后续网格回填不完整、右侧残留一张竖图空位的问题
- 修复后台 Gallery 的 batch upload 在选择合集后缺少自动联动/筛选的问题
- 修复后台 Gallery 的 batch upload 中单张图片编辑的 EN/CN 标题上传后未生效的问题
- 补充针对混排布局、批量上传组包与字段优先级的回归验证

## Impact
- Affected specs: `densify-home-gallery-columns`、`preserve-gallery-composition-layout`、`fix-gallery-upload-and-batch-ops`
- Affected code: `src/app/components/Gallery.tsx`、`src/app/components/Admin.tsx`、`src/app/api/portfolio.ts`、`backend/app/api/routes/photos.py` 及相关表单/组包逻辑

## ADDED Requirements
### Requirement: 主页 Gallery 混排布局不得出现可避免的空位
系统 SHALL 在横图、竖图、近方图混排时保持网格连续回填，避免因首张横图跨列而在后续行残留可容纳竖图却未被占用的空位。

#### Scenario: 首张作品为横构图
- **WHEN** 某个合集的第一张作品为横构图且该卡片跨列展示
- **THEN** 后续作品应继续按网格规则补位
- **THEN** 第二行及之后不应在右侧留下本可容纳一张竖图的空白位置

#### Scenario: 横竖图混排的展开态
- **WHEN** 用户点击 `View All` 展开合集
- **THEN** 展开后的追加图片也应沿用相同的补位规则
- **THEN** 不会因前几张跨列卡片导致后续网格持续错位或留白

### Requirement: 后台 batch upload 选择合集后应自动联动筛选
系统 SHALL 在管理员于后台 Gallery 的 batch upload 中选择合集后，自动联动该合集的相关上下文与筛选结果，减少手动重复选择与错误上传。

#### Scenario: 管理员先选择合集再上传
- **WHEN** 管理员在 batch upload 中选择某个合集
- **THEN** 上传面板应自动同步该合集关联的信息与筛选状态
- **THEN** 管理员无需再次手动执行重复筛选才能让上传上下文与目标合集保持一致

#### Scenario: 切换合集
- **WHEN** 管理员将 batch upload 的目标合集切换为另一个合集
- **THEN** 相关联动状态应立即刷新到新合集
- **THEN** 不会继续保留上一个合集的错误筛选结果或旧上下文

### Requirement: batch upload 中单张编辑字段必须优先于默认值
系统 SHALL 在 batch upload 提交时，优先使用管理员对单张图片编辑后的 EN/CN 标题等字段，而不是回退为文件名或其他默认值。

#### Scenario: 管理员修改单张图片的 EN/CN 标题
- **WHEN** 管理员在待上传列表中修改某张图片的 `title_en` 与 `title_zh` 后点击 `Upload`
- **THEN** 请求组包中应带上最新编辑值
- **THEN** 上传成功后的后台列表与前台展示应反映该编辑后的标题

#### Scenario: 未修改单张标题时的回退
- **WHEN** 管理员未填写某张图片的标题
- **THEN** 系统才允许按既有回退规则使用文件名或默认值
- **THEN** 已填写字段不会被回退逻辑覆盖

## MODIFIED Requirements
### Requirement: 后台 Gallery 批量上传流程
系统 SHALL 在支持批量上传、公共字段填写与单张补充编辑的基础上，进一步保证“合集选择联动正确”和“单张编辑字段优先级正确”，避免管理员看到已修改内容但实际上传结果未生效。

#### Scenario: 批量上传前检查待上传项
- **WHEN** 管理员在 batch upload 面板中选择合集并编辑单张图片信息
- **THEN** 界面展示、提交组包与最终保存结果应保持一致
- **THEN** 合集联动、筛选结果与每张图片的最终字段值都应可预期

## REMOVED Requirements
### Requirement: batch upload 可仅依赖手动重复筛选与默认文件名回退
**Reason**: 当前行为会导致管理员已选择合集但上下文未联动、已编辑标题却未落库，属于高频误操作源头。
**Migration**: 改为在选择合集后自动同步相关筛选/上下文，并让单张编辑字段在提交时优先于默认回退值。
