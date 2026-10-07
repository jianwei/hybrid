# Hybrid

Hybrid 是使用 pnpm workspace 管理的 monorepo。共享页面位于 `apps/taro`，iOS 原生宿主位于 `apps/ios`，Android 原生宿主位于 `apps/android`，HarmonyOS C-API 宿主位于 `apps/harmonyos`，鸿蒙 RN 宿主位于 `apps/harmonyos-rn`。

```text
hybrid/
├── apps/
│   ├── taro/               # Taro React 应用与 RN 依赖
│   ├── ios/                # 加载 RN 内容的 iOS 宿主 App
│   ├── android/            # 加载 RN 内容的 Android 宿主 App
│   ├── harmonyos/          # 承载 Taro 编译内容的 HarmonyOS 宿主 App
│   └── harmonyos-rn/       # 加载共享 Taro RN 页面的独立鸿蒙宿主
├── dist/                   # 一级子目录直接对应 App 或交付目标
├── .cache/                 # 原生等构建工具的缓存与中间文件
├── package.json            # 根命令与 Node、pnpm 版本约束
├── pnpm-workspace.yaml     # workspace 范围与安装策略
└── pnpm-lock.yaml          # 全仓唯一锁文件
```

## 安装与开发

使用 Node.js 24.11 及以上版本、pnpm 12.3.4。以下命令均在仓库根目录执行：

```sh
pnpm install --frozen-lockfile --strict-peer-dependencies

pnpm dev:h5
pnpm dev:weapp

pnpm typecheck
pnpm lint

pnpm build:h5
pnpm build:weapp
```

本机内网源返回 502 时，可在安装命令追加 `--registry=https://registry.npmjs.org` 临时使用 npm 官方源。

根快捷命令当前指向 `taro` workspace。运行子项目未在根目录暴露的脚本时使用：

```sh
pnpm --filter taro run <脚本名>
```

Taro 的平台脚本、配置入口、构建产物和依赖兼容范围见 [Taro 应用说明](apps/taro/README.md)。

## iOS 宿主

首次按 [iOS 宿主说明](apps/ios/README.md) 安装 CocoaPods 依赖，然后执行：

```sh
pnpm run dev:ios   # 打开模拟器，构建安装最新 Debug App，开启 Fast Refresh
pnpm build:ios     # 编译内置的 iOS RN bundle 与资源
pnpm build:ios:app # 编译 bundle，再生成 Release 模拟器 App
IOS_TEAM_ID=你的团队ID pnpm build:ios:ipa # 编译 bundle，签名归档并导出真机 IPA
pnpm ios:open      # 打开 HybridApp.xcworkspace
```

`build:ios` 只编译 JavaScript 和资源。`build:ios:app` 生成无签名的 Release 模拟器 App。`build:ios:ipa` 生成可供已注册真机安装的单个 `.ipa`，需要先在 Xcode 准备团队、证书和描述文件；签名配置见 [真机 IPA](apps/ios/README.md#真机-ipa)。

`dev:ios` 保持运行期间，修改 `apps/taro/src` 页面和样式会自动编译并刷新模拟器内的 App。原生代码改动后重新执行命令；新增原生依赖后先执行 `pnpm ios:pods`。可用 `IOS_SIMULATOR='iPhone 17 Pro' pnpm run dev:ios` 指定模拟器，Ctrl-C 停止本次开发服务。详细行为见 [Debug 开发](apps/ios/README.md#debug-开发)。

## Android 宿主

首次按 [Android 宿主说明](apps/android/README.md) 准备 JDK 17、Android SDK（含 NDK、CMake）与一个 Android 虚拟设备（AVD），然后执行：

```sh
pnpm run dev:android   # 启动模拟器，构建安装最新 Debug App，开启 Fast Refresh
pnpm build:android     # 编译 RN Android bundle 与资源
pnpm build:android:apk # 编译 bundle，再生成内嵌 bundle 的 Release APK
```

`build:android` 只编译 JavaScript 和资源。`build:android:apk` 生成沿用调试签名的 Release APK；正式分发前需替换签名，见 [Release 与离线运行](apps/android/README.md#release-与离线运行)。

`dev:android` 保持运行期间，修改 `apps/taro/src` 页面和样式会自动编译并刷新模拟器内的 App。原生代码改动后重新执行命令。可用 `ANDROID_AVD='Pixel_7_API_35' pnpm run dev:android` 指定虚拟设备或 adb 序列号，Ctrl-C 停止本次开发服务。详细行为见 [Debug 开发](apps/android/README.md#debug-开发)。

## HarmonyOS 宿主

采用 Taro C-API 方案（`harmony_cpp`）把 `apps/taro` 页面编译为鸿蒙原生应用，与 RN 链路无关。无需安装 DevEco Studio：首次按 [HarmonyOS 宿主说明](apps/harmonyos/README.md) 准备华为 Command Line Tools（含 SDK、ohpm、hvigor、hdc、Emulator）并用 `HARMONY_CLT` 指向解压目录，然后执行：

```sh
pnpm build:harmony     # 编译 Taro 页面（Vite），注入 apps/harmonyos/entry；无需鸿蒙环境
pnpm build:harmony:app # 包含上面的编译，再经 ohpm + hvigor 生成 HAP
pnpm dev:harmony       # 编译 + 组装 HAP + 启动/复用模拟器（带窗口）+ 安装并拉起应用
pnpm dev:harmony:noWindow # 同上，无窗口模式启动模拟器（自动化测试用）
```

模拟器安装未签名 HAP 即可调试，不需要华为开发者账号；真机与发布才需要签名材料。鸿蒙端为静态打包，修改 `apps/taro/src` 后重新执行 `pnpm dev:harmony`。

## HarmonyOS RN 宿主

独立的 `apps/harmonyos-rn` 使用 RN 0.72.5 对应的 RNOH、Hermes 和 C-API，复用 `apps/taro` 页面及 RN 开发模式。首次准备 Command Line Tools 和 arm64 鸿蒙模拟器后执行：

```sh
pnpm dev:harmony:rn          # Metro + 模拟器 + 最新 Debug HAP + 安装启动
pnpm dev:harmony:rn:noWindow # 同上，以无窗口模式启动模拟器
pnpm build:harmony:rn        # 仅生成 harmony bundle 和资源
pnpm build:harmony:rn:app    # 生成内嵌 bundle 的离线 Release HAP
```

产物在 `dist/harmony-rn/`，日志在 `.cache/harmony-rn/`。Debug 连接 8081 Metro，Ctrl-C 清理本次服务，Release 从 HAP 加载。支持的原生能力、签名边界与具体环境变量见 [鸿蒙 RN 宿主说明](apps/harmonyos-rn/README.md)。现有 `harmony_cpp` 命令继续使用原宿主。

## 构建产物

所有交付物统一放在仓库根目录 `dist/<App 或交付目标>/`，一级子目录直接使用 `h5`、`weapp`、`ios` 等交付目标，不增加源码工程层级，各目标互不覆盖：

| 命令 | 输出位置 |
| --- | --- |
| `pnpm build:h5` | `dist/h5/` |
| `pnpm build:weapp` | `dist/weapp/` |
| `pnpm build:ios` | `dist/ios/bundle/` |
| `pnpm run dev:ios` | `dist/ios/app/Debug-iphonesimulator/HybridApp.app`（运行时从 Metro 加载 JS） |
| `pnpm build:ios:app` | `dist/ios/bundle/`、`dist/ios/app/Release-iphonesimulator/HybridApp.app` |
| `IOS_TEAM_ID=你的团队ID pnpm build:ios:ipa` | `dist/ios/bundle/`、`dist/ios/archive/HybridApp.xcarchive/`、`dist/ios/ipa/*.ipa` |
| `pnpm build:android` | `dist/rn/android/index.android.bundle` 与资源 |
| `pnpm run dev:android` | `dist/rn/android/app/debug/HybridApp-debug.apk`（运行时从 Metro 加载 JS） |
| `pnpm build:android:apk` | `dist/rn/android/`、`dist/rn/android/app/release/HybridApp.apk` |
| `pnpm build:harmony` | 注入 `apps/harmonyos/entry/src/main/ets/`（不经 `dist/`） |
| `pnpm build:harmony:app` | `dist/harmony/app/HybridApp-debug.hap`（未签名，供模拟器） |
| `pnpm dev:harmony` | 同上 HAP，并安装到鸿蒙模拟器运行 |
| `pnpm build:harmony:rn` | `dist/harmony-rn/bundle/` |
| `pnpm dev:harmony:rn` | `dist/harmony-rn/app/debug/HybridApp-debug.hap` |
| `pnpm build:harmony:rn:app` | `dist/harmony-rn/app/release/HybridApp-release.hap` |

其他 Taro 平台使用 `dist/<平台>/`。iOS 原生脚本把 Xcode 缓存保存在 `.cache/ios/`，Android 原生脚本把 Gradle 缓存与中间文件保存在 `.cache/android/`，鸿蒙脚本把构建日志保存在 `.cache/harmony/`，成功后将原生产物复制到对应交付目录。`dist/` 和 `.cache/` 均不提交。

## 工作区约定

- 全仓只维护根 `pnpm-lock.yaml` 和 `pnpm-workspace.yaml`；子项目不创建自己的锁文件或 workspace 配置。
- 为指定子项目添加运行依赖或开发依赖：

  ```sh
  pnpm --filter <workspace名称> add <依赖名>
  pnpm --filter <workspace名称> add -D <依赖名>
  ```

- 新应用放在 `apps/<应用名>/`，提供具有唯一 `name` 的 `package.json` 后，会由 `apps/*` 自动加入 workspace。
- 子项目保留自己的开发和构建脚本；只有全仓常用入口才在根 `package.json` 添加快捷命令。
- 安装脚本许可和最低发布时间例外统一维护在根 `pnpm-workspace.yaml`。
- `apps/taro/.husky` 与 commitlint 配置保留为未激活的模板；安装不会注册 Git hooks。以后需要启用时，再统一配置仓库级钩子。
