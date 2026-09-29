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
| Apple Developer 团队与签名材料 | 真机 IPA 构建时需要 Team ID、有效代码签名证书及覆盖目标设备的描述文件 | 签名并导出可安装在已注册真机上的 IPA。 |
| JDK | 17 | 运行 Gradle，编译 Android 原生代码。 |
| Android Studio 或 Android SDK 命令行工具（含 Android SDK、Android Emulator） | SDK Platform `android-34`、Build-Tools `34.0.0`、NDK `25.1.8937393`、CMake `3.22.1`、Platform-Tools（adb）；Gradle 8.3 由工程 wrapper 自动下载 | 编译、调试和运行 `apps/android` 宿主；另需 arm64 系统镜像与至少一个 Android 虚拟设备（AVD）。 |
| 华为 Command Line Tools（含 HarmonyOS SDK、ohpm、hvigor、hdc、Emulator） | mac-arm64 `26.0.0.851`；SDK 为 HarmonyOS 26.0.0 Release（API 26），宿主最低兼容 API 14 | 编译和运行 `apps/harmonyos` 宿主，替代 DevEco Studio；通过 `HARMONY_CLT` 环境变量指向解压目录。 |
| 华为开发者账号 | 仅真机调试与发布签名需要 | 申请调试证书与 Profile；模拟器安装未签名 HAP 即可调试，无需账号。 |
| Web 浏览器 | 未锁定具体版本 | 运行和调试 H5 页面。 |
| 微信开发者工具 | 未锁定具体版本 | 调试或发布微信小程序；正式调试前需配置有效 AppID。 |

按需安装对应目标平台的软件：H5 使用浏览器，微信小程序使用微信开发者工具，iOS 模拟器宿主需要 macOS、Ruby 工具链和 Xcode，Android 模拟器宿主需要 JDK 17 和 Android SDK（含 NDK、CMake、模拟器与系统镜像），HarmonyOS 宿主需要华为 Command Line Tools（含 SDK、ohpm、hvigor、hdc、Emulator，无需 DevEco Studio）与中文 locale（模拟器按 locale 判定地区）；真机 IPA 还需要 Apple Developer 团队与签名材料，鸿蒙真机还需要华为开发者账号与签名材料。本机 Android SDK 通过 Homebrew 命令行工具安装于 `/opt/homebrew/share/android-commandlinetools`（`ANDROID_HOME`），已创建 `Pixel_7_API_35`（Android 15，API 35，Google APIs arm64）虚拟设备，使用 `emulator -avd Pixel_7_API_35` 启动；本机鸿蒙 Command Line Tools 位于 `~/command-line-tools`（从 Downloads 移出以防误删），已创建 `HybridOS_Phone`（HarmonyOS 7.0.0，API 26）模拟器，`pnpm dev:harmony` 会自动启动它。其他 Taro 平台虽有依赖或构建脚本，实际开发工具与可用性尚未在本仓库确认。

新增、升级或移除本机或目标平台所需软件时，同步更新本文。具体安装和构建步骤见 [仓库说明](../README.md)、[Taro 应用说明](../apps/taro/README.md)、[iOS 宿主说明](../apps/ios/README.md)、[Android 宿主说明](../apps/android/README.md) 与 [HarmonyOS 宿主说明](../apps/harmonyos/README.md)。
