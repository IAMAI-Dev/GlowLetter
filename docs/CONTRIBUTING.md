# 团队协作指南

## 1. 开始开发前

1. 阅读 [README](../README.md)、[PRD](PRD.md) 和与任务相关的代码。
2. 查看 [开发计划](DEVELOPMENT_PLAN.md) 与 [待确认问题](OPEN_QUESTIONS.md)，确认需求没有被阻塞。
3. 从最新主分支创建短生命周期分支，建议命名为 `feat/<topic>`、`fix/<topic>` 或 `docs/<topic>`。
4. 保持一次提交只解决一个可独立验收的问题。

## 2. 提交信息

提交遵循 Conventional Commits，标题使用中文描述实际结果：

```text
feat: 增加云端检测记录分页加载
fix: 修正窄屏设备底栏安全区间距
docs: 更新云开发环境初始化说明
refactor: 统一检测记录数据访问入口
test: 补充演示分析输入校验用例
chore: 调整开发者工具共享配置
```

不要提交无意义的“update”“修改文件”或大而混杂的提交。如果方向确认错误，应回到最近的正确版本重新实现，不额外制造 `revert` 提交。

## 3. 代码边界

- 使用原生小程序 JavaScript、WXML 和 WXSS，不引入 Taro、uni-app、Vue 或 React。
- 首页、历史、我的保持在 `pages/home/home` 常驻壳层中；自定义底栏不得调用页面路由。
- 独立页面跳转统一使用 `utils/navigation.js`，不要直接散落调用路由 API。
- 本地草稿和显式离线记录统一通过 `utils/store.js` 访问；页面只能调用 `services/`，不得直接读写云数据库。
- 新增颜色、间距和通用状态优先复用 `app.wxss`、`styles/common.wxss` 或公共常量。
- 模拟结果必须标记 `isDemo: true`，不得补写未经实验组确认的公式、阈值或处理结论。

## 4. 界面验收

涉及界面修改时至少检查：

- 自定义顶部栏避开系统状态栏和微信胶囊。
- 首页、历史、我的切换没有白屏、加载遮罩或滚动位置丢失。
- 底栏在页面中部为毛玻璃胶囊，触底后与页面背景融合。
- 固定操作区和最后一项内容不被底部安全区遮挡。
- 窄屏设备没有标题溢出、按钮重叠或横向滚动。
- 加载、空数据、失败、重试和重复点击状态得到处理。

正式验收至少覆盖两种 Android 设备和一种 iOS 设备。

## 5. 提交前检查

```powershell
Get-ChildItem miniprogram,cloudfunctions -Recurse -Filter *.js |
  ForEach-Object { node --check $_.FullName }

Get-ChildItem miniprogram,cloudfunctions,cloudbase -Recurse -Filter *.json |
  ForEach-Object {
    node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" $_.FullName
  }

node --test tests/*.test.js
git diff --check
git status --short
```

随后在微信开发者工具中执行普通编译并走查本次影响的页面。涉及主流程时，至少验证：启动 → 首页 → 样品信息 → 图片选择 → 分析 → 结果 → 保存记录 → 历史详情。

## 6. Pull Request 清单

- [ ] PR 只包含本次任务相关文件。
- [ ] 需求来源和实现范围清楚。
- [ ] 已说明演示能力与真实能力的边界。
- [ ] JavaScript、JSON 和 `git diff --check` 通过。
- [ ] 微信开发者工具可编译，控制台无项目代码错误。
- [ ] 页面返回、主入口切换和安全区布局已检查。
- [ ] 行为、架构或计划变化已同步更新文档。
- [ ] 没有提交 `opendesign/`、私有配置、环境 ID、密钥、OpenID、环境变量或日志。

## 7. 文档维护

- 产品需求变化：更新 `docs/PRD.md`。
- 阶段交付、限制或后续输入变化：更新 `docs/PROTOTYPE_STATUS.md`。
- 当前实现或目录变化：更新 `README.md` 和 `docs/ARCHITECTURE.md`。
- 阶段完成或优先级变化：更新 `docs/DEVELOPMENT_PLAN.md`。
- 尚未确认且会影响实现的问题：更新 `docs/OPEN_QUESTIONS.md`。
- 长期开发约束变化：更新 `Agent.md`。
