# GlowLetter 云端数据模型

当前数据结构服务于 `0.2.0` 原型演示版。所有检测结果均由服务端生成且固定包含 `isDemo: true`。

## `users`

每个微信用户一条记录，文档 `_id` 使用云函数取得的 OpenID，以保证重复登录不会创建重复用户。客户端不能直接读取该集合。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` / `_openid` | string | 由 `login` 云函数根据当前调用身份写入 |
| `displayName` | string | 当前固定为“绿荧访客” |
| `avatarUrl` | string | 当前为空，不请求用户头像 |
| `role` | string | 当前固定为 `user`，不接受前端覆盖 |
| `createdAt` / `updatedAt` | date | 服务端时间 |

## `detection_records`

记录创建后不可编辑。身份、结果、状态和服务端时间由 `createDetection` 生成，不接受前端覆盖。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_openid` | string | 当前调用用户，由云函数写入 |
| `sampleName` | string | 必填，1–40 个字符 |
| `note` / `operatorNote` | string | 可选，最大 200 个字符 |
| `plateId` / `batchId` | string | 可选，最大 80 个字符 |
| `imageFileId` | string | 私有云存储文件 ID；内置演示图为空 |
| `imageSource` | string | `cloud` 或 `demo-asset` |
| `imageMeta` | object | 宽、高、格式和字节数，不保存 base64 |
| `result` | object | 服务端固定演示结果，始终 `isDemo: true` |
| `status` | string | 当前固定为 `completed` |
| `createdAt` | date | 服务端时间 |

`imageMeta` 当前只接受 JPG/PNG，尺寸与文件大小由云函数执行上限校验。真实图片的文件 ID 必须位于当前 OpenID 对应的 `detection-images/` 目录。

列表查询使用 `_openid` 升序、`createdAt` 降序非唯一组合索引，默认每页 5 条，最大 20 条。

## `app_config`

当前使用固定文档 `app_config/global`：

| 字段 | 说明 |
| --- | --- |
| `appNameZh` / `appNameEn` | 应用展示名称 |
| `mode` | 强制为 `demo` |
| `demoModelVersion` | 当前演示模型版本 |
| `uploadImageEnabled` | 是否开放图片上传 |
| `historyEnabled` | 是否开放云端历史 |
| `disclaimer` | 演示免责声明 |

集合或配置缺失时，`getAppConfig` 返回同版本安全默认值，并继续强制 `mode: "demo"`。

## `model_configs`

`model_configs/future-model-v1` 只预留真实模型结构：

- `enabled: false`
- `status: "pending"`
- 曲线类型、参数、有效范围、阈值和校准版本保持空值

在实验组确认公式并完成验证前，不得启用该配置或据此生成真实检测结果。

## 权限与生命周期

- 四个集合均为“所有用户不可读写”，小程序端只能调用云函数。
- 云函数调用规则要求 `auth != null`，函数内部使用 `cloud.getWXContext().OPENID` 识别用户。
- 查询、详情和删除都附加当前 OpenID 条件，不信任事件参数中的身份字段。
- 免费体验环境的云存储使用“仅创建者可读写”预设权限。
- 详情页按需换取私有图片临时地址，不长期缓存 URL。
- 删除记录时先删除图片再删除数据库记录；图片删除失败时保留记录，图片不存在视为幂等成功。
- 图片和记录的正式保存期限尚未确认，发布前必须在 [Q-08](OPEN_QUESTIONS.md) 中形成结论。
