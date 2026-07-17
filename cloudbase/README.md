# 云环境配置资料

本目录只保存可重复使用、且不包含环境 ID、密钥、OpenID、账号或本机配置的种子数据与规则模板。

## 当前体验环境状态

- `users`、`detection_records`、`app_config`、`model_configs` 已创建。
- 四个集合均设置为“所有用户不可读写”。
- `app_config/global` 和 `model_configs/future-model-v1` 已导入。
- `detection_records` 已创建 `_openid` 升序、`createdAt` 降序组合索引。
- 云函数已应用 `auth != null` 的认证用户调用规则。
- 云存储使用免费环境的“仅创建者可读写”预设权限。

## 数据库

如需重建环境，创建四个集合后：

1. 将集合权限全部设置为“所有用户不可读写”。
2. 向 `app_config` 导入 `seeds/app-config.json`。
3. 向 `model_configs` 导入 `seeds/model-config.json`。
4. 为 `detection_records` 创建非唯一组合索引：

| 字段 | 排序 |
| --- | --- |
| `_openid` | 升序 |
| `createdAt` | 降序 |

`rules/database-admin-only.json` 用于记录对应的管理端规则语义。控制台提供预设权限时，优先选择等价预设。

## 云存储与云函数

- `rules/functions-authenticated-only.json` 对应当前已应用的云函数规则。
- `rules/storage-owner-only.json` 是付费环境可用的显式存储规则模板；当前免费体验环境没有应用该文件，而是使用等价目标的“仅创建者可读写”预设权限。
- 资源规则不能替代业务校验。所有业务函数仍必须从微信上下文取得 OpenID，并验证输入、查询条件、所有权和云文件路径。
- 部署云函数时选择“上传并部署：云端安装依赖”，不要提交本地 `node_modules`。

完整步骤、当前快照和正式发布前检查见 [`docs/CLOUD_DEPLOYMENT.md`](../docs/CLOUD_DEPLOYMENT.md)。
