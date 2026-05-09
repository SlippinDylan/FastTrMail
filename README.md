# FastTrMail

一个基于 Chrome Manifest V3 的网页邮箱翻译扩展。它会在邮件详情区的操作栏里插入一个 `翻译` 按钮，并把译文追加到原文下方。

## 功能

- 在网页邮箱邮件详情操作区插入 `翻译` 按钮。
- 翻译结果显示在原文下方，不覆盖原文。
- 默认支持 `Google Web（免 Key，实验性）`，也支持 `Google Cloud API` 和 `Microsoft Translator API`。
- 点击浏览器右上角扩展图标后，直接弹出菜单，可进入设置页。
- 设置页为中文卡片式布局，支持配置目标语言和各 Provider 的凭据。
- GitHub Actions 自动打包，产出可直接 `Load unpacked` 的目录和 zip。

## 项目结构

- `extension/`: 扩展源码
- `extension/content/shared.js`: 全局常量、共享状态、基础工具
- `extension/content/runtime.js`: 文档级生命周期、generation、取消与状态工厂
- `extension/content/thread.js`: Fastmail DOM 适配与线程/消息身份识别
- `extension/content/segments.js`: 正文分段策略
- `extension/content/render.js`: 标题/正文/状态渲染
- `extension/content/translation.js`: 标题与正文翻译状态机
- `extension/content/controller.js`: 事件、观察器、刷新调度
- `scripts/package.sh`: 本地打包脚本
- `.github/workflows/package.yml`: CI 打包与发布

## 本地安装

1. 打开 `chrome://extensions`
2. 打开右上角 `开发者模式`
3. 点击 `加载已解压的扩展程序`
4. 开发时可直接选择 `extension/` 目录；发布包则解压 `dist/fasttrmail-<version>.zip` 后，选择里面的 `fasttrmail/` 目录

## 设置说明

1. 点击浏览器右上角扩展图标
2. 在弹出的菜单里点击 `打开设置`
3. 选择默认 Provider 和目标语言
4. 如果你选择的是正式 API Provider，再在对应卡片里填写 API 凭据

## 申请凭据

如果你使用默认的 `Google Web（免 Key）`，这一步可以跳过。

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

产物输出到：

- `dist/fasttrmail/`
- `dist/fasttrmail.zip`
- `dist/fasttrmail-<version>.zip`

## CI

- 版本号以 `extension/manifest.json` 为唯一来源
- push 到 `main`：自动生成版本化 artifact
- GitHub Actions Summary 会显示当前版本号和产物路径
- 如需发布 Release，仍可额外 push tag，例如 `v1.0.0`

## 说明

- 这个扩展会把邮件正文发送到你选择的翻译服务，因此不是离线翻译。
- 内容脚本使用 DOM 监听，适配网页邮箱这类单页应用的切换行为。
