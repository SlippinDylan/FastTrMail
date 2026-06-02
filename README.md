# FastTrMail

[English](README.en.md)

FastTrMail 是一个专门面向 Fastmail 网页版的 Chrome Manifest V3 邮件翻译扩展。它会在 Fastmail 邮件详情区的操作栏里插入一个 `翻译` 按钮，并把译文追加到原文下方。

## 适用范围

- FastTrMail 只对 `https://app.fastmail.com/*` 生效
- 它不会为 Gmail、Outlook Web 或其他网页邮箱提供翻译功能

## 功能

- 在 Fastmail 邮件详情操作区插入 `翻译` 按钮。
- 翻译结果显示在原文下方，不覆盖原文。
- 支持以下翻译服务：
  - `Google Web（免 Key，实验性）`
  - `Microsoft Edge（免 Key）`
  - `Google Cloud API`
  - `Microsoft Translator API`
- 点击浏览器右上角扩展图标后，直接弹出菜单，可进入设置页。
- 设置页为中文卡片式布局，支持配置目标语言和各 Provider 的凭据。
- GitHub Actions 自动打包，产出可直接 `Load unpacked` 的目录和 zip。

## 项目结构

- `extension/`: 扩展源码
- `extension/shared/catalog.js`: Provider / language / 默认设置共享目录
- `extension/shared/entities.js`: HTML entity 解码工具
- `extension/background/bootstrap.js`: 后台启动入口与错误可观测边界
- `extension/background/request-registry.js`: 后台请求注册与取消
- `extension/content/shared.js`: 全局常量、共享状态、基础工具
- `extension/content/policies.js`: 文本可翻译性与正文识别策略
- `extension/content/retry-policy.js`: 渲染重试预算与退避策略
- `extension/content/runtime.js`: 文档级生命周期、generation、取消与状态工厂
- `extension/content/thread.js`: Fastmail DOM 适配与线程/消息身份识别
- `extension/content/segments.js`: 正文分段策略
- `extension/content/render.js`: 标题/正文/状态渲染
- `extension/content/translation.js`: 标题与正文翻译状态机
- `extension/content/controller.js`: 事件、观察器、刷新调度
- `docs/privacy-policy.html`: 上架用隐私政策页面
- `scripts/package.sh`: 本地打包脚本
- `.github/workflows/ci.yml`: PR 与分支校验工作流
- `.github/workflows/package.yml`: `main` 分支打包与发布工作流

## 本地安装

1. 打开 `chrome://extensions`
2. 打开右上角 `开发者模式`
3. 点击 `加载已解压的扩展程序`
4. 开发时可直接选择 `extension/` 目录；如果先执行了打包，也可以选择 `dist/fasttrmail/` 目录

## 设置说明

1. 点击浏览器右上角扩展图标
2. 在弹出的菜单里点击 `打开设置`
3. 选择默认 Provider 和目标语言
4. 如果你选择的是正式 API Provider，再在对应卡片里填写 API 凭据

## 申请凭据

如果你使用 `Google Web（免 Key）` 或 `Microsoft Edge（免 Key）`，这一步可以跳过。

### Google

- 官方开通说明: https://docs.cloud.google.com/translate/docs/setup
- 官方 API Key 管理: https://cloud.google.com/api-keys/docs/create-manage-api-keys
- Google API 控制台: https://console.cloud.google.com/apis/library/translate.googleapis.com

### Microsoft

- 官方申请与快速开始: https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/quickstart/rest-api
- Azure Portal: https://portal.azure.com/

## 本地打包

```bash
bash scripts/package.sh
```

## 运行测试

```bash
npm test
```

产物输出到：

- `dist/fasttrmail/`
- `dist/fasttrmail.zip`
- `dist/fasttrmail-<version>.zip`

## CI

- 版本号以 `extension/manifest.json` 为唯一来源
- `.github/workflows/ci.yml` 会在 `pull_request` 和 `main` 分支变更时运行测试与打包校验
- `.github/workflows/package.yml` 只负责 `main` 分支的正式打包产物与 `latest` GitHub Release 更新
- 只需要修改 `extension/manifest.json` 里的 `version`，工作流会自动用这个版本号命名产物
- GitHub Actions Summary 会显示当前版本号和产物路径
- `latest` Release 只保留一个版本化 zip：`fasttrmail-<version>.zip`
- GitHub Release 机制本身依赖 tag；当前方案只使用固定的 `latest` tag，不再维护 `v1.2.0` 这类版本 tag

## License

本项目基于 MIT License 发布，详见 [LICENSE](LICENSE)。

## 说明

- 这个扩展会把邮件正文发送到你选择的翻译服务，因此不是离线翻译。
- 内容脚本使用 DOM 监听，适配 Fastmail 单页应用的切换行为。
- 如需上架 Chrome Web Store，可直接将 `docs/privacy-policy.html` 发布为 GitHub Pages 隐私政策页面。
