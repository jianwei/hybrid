# 项目软件要求

本文只记录需要在本机或目标平台准备的软件。通过 pnpm 安装到 `node_modules` 的包及其版本由各 `package.json` 和根目录 `pnpm-lock.yaml` 管理，不在此重复列出。

| 软件 | 版本或要求 | 用途 |
| --- | --- | --- |
| macOS | 未锁定具体版本；需支持所选 Xcode | 构建和运行 iOS 宿主。 |
| Git | 未锁定版本 | 管理本仓库。 |
| Node.js | `>=24.11.0` | 全仓 JavaScript 开发与构建；Xcode 构建脚本也需找到 Node。 |
| pnpm | `12.3.4` | 安装和管理 workspace 依赖。 |
| Ruby | `>=2.7.0`；建议独立安装 Ruby 3.2 | 运行 iOS 的 Bundler 和 CocoaPods。 |
| Bundler | 未锁定版本 | 安装 `apps/ios/Gemfile` 声明的 Ruby 依赖。 |
| CocoaPods | `1.16.2`，由 `apps/ios/Gemfile` 指定 | 安装 iOS 原生依赖。 |
| Xcode（含 iOS SDK、iOS Simulator） | 未锁定具体版本 | 编译、调试和归档 `apps/ios/HybridApp.xcworkspace`；原生 App 最低支持 iOS 13.4。 |
| Web 浏览器 | 未锁定具体版本 | 运行和调试 H5 页面。 |
| 微信开发者工具 | 未锁定具体版本 | 调试或发布微信小程序；正式调试前需配置有效 AppID。 |

按需安装对应目标平台的软件：H5 使用浏览器，微信小程序使用微信开发者工具，iOS 宿主需要 macOS、Ruby 工具链和 Xcode。其他 Taro 平台虽有依赖或构建脚本，实际开发工具与可用性尚未在本仓库确认。

新增、升级或移除本机或目标平台所需软件时，同步更新本文。具体安装和构建步骤见 [仓库说明](../README.md)、[Taro 应用说明](../apps/taro/README.md) 与 [iOS 宿主说明](../apps/ios/README.md)。
