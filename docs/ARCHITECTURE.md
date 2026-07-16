# GlowLetter 当前架构

> 本文描述仓库当前已经运行的实现，不代表 PRD 中所有目标能力均已完成。

## 1. 技术栈与运行状态

- 前端：微信小程序原生 JavaScript、WXML、WXSS。
- 运行入口：`miniprogram/app.js`。
- 云能力：启动时调用 `wx.cloud.init({ traceUser: true })`；未配置云环境时继续使用本地演示模式。
- 数据层：`utils/store.js` 基于 `wx.getStorageSync` 和 `wx.setStorageSync` 保存草稿与演示记录。
- 依赖：无 npm 依赖，无额外构建步骤。

当前没有 `cloudfunctions/`、`services/` 或 `adapters/` 目录。它们属于下一阶段目标结构，不能把 PRD 中的规划目录误认为已经实现。

## 2. 页面与视图映射

`app.json` 当前注册 8 个页面，但产品中有 10 个视图。历史和我的作为常驻视图合并在主页面中。

| 产品视图 | 实际位置 | 导航方式 |
| --- | --- | --- |
| 启动页 | `/pages/launch/launch` | 独立页面 |
| 首页 | `/pages/home/home`，`activeTab=home` | 主壳层本地切换 |
| 历史记录 | `/pages/home/home`，`activeTab=history` | 主壳层本地切换 |
| 我的 | `/pages/home/home`，`activeTab=profile` | 主壳层本地切换 |
| 样品信息 | `/pages/sample-form/sample-form` | 独立页面 |
| 图片选择 | `/pages/image-select/image-select` | 独立页面 |
| 分析中 | `/pages/analyzing/analyzing` | 独立页面 |
| 结果 | `/pages/result/result` | 独立页面 |
| 历史详情 | `/pages/history-detail/history-detail` | 独立页面 |
| 项目说明 | `/pages/about/about` | 独立页面 |

直接打开历史或我的时，可分别使用 `/pages/home/home?tab=history` 和 `/pages/home/home?tab=profile`。

## 3. 主入口单页壳层

`pages/home/home` 同时挂载首页、历史、我的三个 `scroll-view`：

1. 底部导航触发 `select` 事件。
2. 主页面只更新 `activeTab`，不调用微信路由 API。
3. 非活动视图使用 `hidden` 隐藏，不被销毁，因此各自滚动位置得以保留。
4. 当前活动视图通过 `.tab-page-active` 参与底栏触底测量。
5. 历史视图单独保留下拉刷新和增量加载行为。

检测、结果、详情等流程仍使用独立页面，避免把所有业务状态塞进一个页面。

## 4. 公共组件与工具

| 模块 | 职责 |
| --- | --- |
| `components/custom-navbar` | 自定义顶部导航、状态栏和微信胶囊安全区适配 |
| `components/custom-tabbar` | 首页、历史、我的本地视图选择 |
| `components/route-transition` | 独立业务页面跳转时的离场遮罩 |
| `utils/navigation.js` | 统一包装 `navigateTo`、`redirectTo`、`reLaunch` 和返回逻辑 |
| `utils/layout.js` | 计算状态栏、菜单胶囊和安全区布局数据 |
| `utils/adaptive-tabbar.js` | 判断当前视图是否触底并切换底栏视觉状态 |
| `utils/store.js` | 本地草稿、演示结果和历史记录读写 |

## 5. 数据与状态

本地存储键：

- `glowletter-draft`：样品表单、图片临时路径和图片元数据。
- `glowletter-records`：已保存的演示检测记录。

演示结果由 `DEFAULT_RESULT` 生成，并强制写入 `isDemo: true`。当前历史记录只存在于当前设备的本地存储中，不会跨设备同步，也没有用户隔离能力。

## 6. 云开发接入边界

下一阶段接入云开发时应保持页面接口稳定：

1. 新增 `services/` 统一封装身份、云存储、检测记录和配置调用。
2. 新增可替换的图片来源与分析适配器，页面不直接依赖具体算法。
3. 私有数据只能由云函数根据当前调用用户身份读写，页面不得传入或信任 `_openid`。
4. 图片写入云存储，数据库只保存文件 ID 和必要元数据，不保存 base64。
5. 本地演示与云端演示都必须返回 `isDemo: true`。
6. 云端能力失败时应显示明确错误，不得悄悄把真实模式结果替换成演示结论。

计划中的云函数和数据模型以 [PRD](../docx/PRD.md) 为需求依据，实施进度以 [开发计划](DEVELOPMENT_PLAN.md) 为准。
