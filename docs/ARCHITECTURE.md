# GlowLetter 当前架构

> 本文描述 `0.2.0` 体验版已经运行的实现，不代表 PRD 中所有目标能力均已完成。

## 1. 技术栈与部署状态

- 前端：微信小程序原生 JavaScript、WXML、WXSS。
- 运行入口：`miniprogram/app.js`。
- 云能力：微信云开发普通云函数、云数据库和云存储，不使用云托管或自建服务器。
- 身份：启动时调用 `wx.cloud.init({ traceUser: true })`，再由 `login` 云函数使用微信上下文初始化访客。
- 数据层：`services/` 封装云调用，`adapters/` 隔离图片来源与分析实现。
- 依赖：小程序端无 npm 依赖；云函数的 `wx-server-sdk` 由云端部署时安装。

`0.2.0` 已上传并配置为团队体验版。当前体验环境已经部署 7 个云函数、4 个集合、种子配置和组合索引；尚未提交正式审核。

## 2. 页面与视图映射

`app.json` 注册 8 个页面，产品中共有 10 个视图。历史和“我的”作为常驻视图合并在主页面中。

| 产品视图 | 实际位置 | 导航方式 |
| --- | --- | --- |
| 启动页 | `/pages/launch/launch` | 独立页面、体验版入口 |
| 首页 | `/pages/home/home`，`activeTab=home` | 主壳层本地切换 |
| 历史记录 | `/pages/home/home`，`activeTab=history` | 主壳层本地切换 |
| 我的 | `/pages/home/home`，`activeTab=profile` | 主壳层本地切换 |
| 样品信息 | `/pages/sample-form/sample-form` | 独立页面 |
| 图片选择 | `/pages/image-select/image-select` | 独立页面 |
| 分析中 | `/pages/analyzing/analyzing` | 独立页面 |
| 结果 | `/pages/result/result` | 独立页面 |
| 历史详情 | `/pages/history-detail/history-detail` | 独立页面 |
| 项目说明 | `/pages/about/about` | 独立页面 |

直接打开历史或“我的”时，分别使用 `/pages/home/home?tab=history` 和 `/pages/home/home?tab=profile`。

## 3. 主入口单页壳层

`pages/home/home` 同时挂载首页、历史和“我的”三个 `scroll-view`：

1. 底部导航触发 `select` 事件。
2. 主页面只更新 `activeTab`，不调用微信路由 API。
3. 非活动视图使用 `hidden` 隐藏但不销毁，因此保留各自滚动位置。
4. 当前活动视图参与底栏触底测量。
5. 历史视图独立支持下拉刷新和增量加载。

检测、结果、详情等流程继续使用独立页面，避免让主页面承担全部业务状态。

## 4. 客户端分层

| 模块 | 职责 |
| --- | --- |
| `components/custom-navbar` | 自定义顶部导航、状态栏和微信胶囊安全区适配 |
| `components/custom-tabbar` | 首页、历史、我的本地视图选择 |
| `components/route-transition` | 独立业务页面跳转时的离场遮罩 |
| `utils/navigation.js` | 统一封装导航和返回逻辑 |
| `utils/store.js` | 本地草稿、待展示结果和显式离线记录 |
| `services/auth-service.js` | 云端访客身份初始化与主动离线模式 |
| `services/detection-service.js` | 分析记录创建、分页、详情和删除入口 |
| `services/storage-service.js` | 图片上传、临时访问地址和孤儿文件清理 |
| `services/config-service.js` | 获取公开演示配置与安全默认值 |
| `adapters/analysis-adapter.js` | 在云端演示分析与显式离线演示之间切换 |
| `adapters/image-source-adapter.js` | 统一图片选择、读取和数值型元数据 |

页面不直接访问云数据库，也不长期缓存私有图片的临时 URL。

## 5. 数据与状态

本地存储键：

- `glowletter-draft`：样品表单、图片临时路径和图片元数据。
- `glowletter-pending-analysis`：分析页与结果页之间的临时演示结果。
- `glowletter-records`：仅保存用户主动选择离线模式后创建的演示记录。

云端模式的历史记录保存在 `detection_records`，由云函数使用当前 OpenID 隔离。云端和离线记录不混合、不迁移；清理本地缓存不会删除云端数据。所有演示结果始终包含 `isDemo: true`。

## 6. 云函数与调用链

| 云函数 | 职责 |
| --- | --- |
| `login` | 幂等创建或更新访客身份 |
| `analyzeDemo` | 校验输入并返回固定、可复现的演示结果 |
| `createDetection` | 服务端生成演示结果并保存记录 |
| `listDetections` | 按当前用户分页查询历史 |
| `getDetection` | 返回当前用户拥有的单条记录 |
| `deleteDetection` | 校验所有权后删除图片和记录 |
| `getAppConfig` | 返回公开演示配置或同版本安全默认值 |

主流程：

```text
启动身份初始化
  → 填写样品信息
  → 选择内置图或真实图片
  → 云端演示分析
  → 上传真实图片并保存记录
  → 历史分页
  → 详情按需获取私有图片临时地址
  → 删除图片与记录
```

云端初始化失败时显示重试和“以演示身份进入”入口，只有用户主动选择后才使用本地演示流程。

## 7. 安全边界

- `users`、`detection_records`、`app_config`、`model_configs` 均为“所有用户不可读写”，客户端只能通过云函数操作。
- 云函数调用规则要求 `auth != null`；函数内部仍以 `cloud.getWXContext().OPENID` 作为唯一可信身份。
- 免费体验环境的存储使用“仅创建者可读写”预设权限；自定义存储规则模板保留给后续付费环境。
- 云函数忽略前端传入的身份、角色、状态和检测结果，并校验字段长度、分页范围、演示模式和文件 ID 路径。
- 删除关联图片失败时保留数据库记录以便重试；图片不存在视为幂等成功。
- 环境 ID、密钥、OpenID 和账号信息不进入仓库。

数据结构见[云端数据模型](DATA_MODEL.md)，部署现状见[云开发部署手册](CLOUD_DEPLOYMENT.md)，后续工作见[开发计划](DEVELOPMENT_PLAN.md)。
