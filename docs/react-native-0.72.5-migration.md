# React Native 0.72.5 迁移验证

为对齐已有 App，当前工程保留 Taro 4.2.1、React 18.2.0，将 RN 固定为 0.72.5，Expo 调整为 SDK 49。此组合是仓库维护的兼容适配，超出 Taro 4.2.1 的官方 RN/Expo peer 范围；已有 App 的原生模块合同仍需单独对照。

## 配套调整

- CLI 11.3.7；Metro config 0.72.12。Taro rn-supporter 与 metro-config 的 Metro 定向统一到 0.76.8，与 CLI 11.3.7 / RN 0.72.5 模板一致，避免开发服务与生产 bundle 使用不同的 Metro 补丁版本；transformer 使用 0.76.8 的 `metro-react-native-babel-transformer` 别名，Babel preset 使用 0.76.8。
- Expo 49.0.23 及配套模块；SDK 49 不递归扫描 pnpm 中的 Expo 原生依赖，显式声明原已安装的 core、application、asset、constants、font、image-loader，autolinking 裸包名定向提升。
- Android 保持 SDK 34 / NDK 25.1 / Hermes / 关闭新架构；改用 Gradle 8.0.1、CLI 11 自动链接副本及 RN 0.72 的 `getReactNativeHost()` 接口，移除 0.73 的 rootproject 插件，明确 Kotlin 插件版本。
- iOS C++ 标准对齐 RN 0.72 模板的 C++17；为旧 Folly 声明本工程 iOS 13.4 已支持的 `FOLLY_HAVE_CLOCK_GETTIME=1`，避免新 Xcode 下 `clockid_t` 重复定义。
- 从 0.73 切换时先清理忽略的 `apps/ios/build/generated/ios/` codegen 目录再运行 Pods，防止旧版残留的 JSI 源文件被 0.72 的 Pod glob 误编入。
- Metro 排除 iOS Pods / build 生成目录及鸿蒙 oh_modules，防止旧 Haste 索引把鸿蒙的同名 React 包当作 RN 的 React。
- RN 的 Boost 1.76.0 下载源由已失效的 JFrog 改为官方 archives.boost.io，SHA-256 保持原值。补丁仅适用于 RN 0.72.5；升级 RN 时重新核对。[官方归档校验信息](https://archives.boost.io/release/1.76.0/source/boost_1_76_0.tar.bz2.json)

## 验证记录

2026-09-30，在 Node 24.20.0、pnpm 12.3.4、Xcode 26.2、iOS 26.3 模拟器和 Android 15 / API 35 模拟器验证。日志、截图保存在 `.cache/rn-0725/`（不提交）。

| 检查 | 实际结果 | 日志 / 证据 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile --strict-peer-dependencies` | 通过，锁文件与最终依赖一致 | `frozen-install.log` |
| `pnpm typecheck`、`pnpm lint` | 通过 | `typecheck.log`、`lint.log` |
| `pnpm --filter taro run build:rn:ios --reset-cache` | 通过，Metro 0.76.8 | `bundle-ios-final.log` |
| `pnpm --filter taro run build:rn:android --reset-cache` | 通过，Metro 0.76.8 | `bundle-android-final.log` |
| `pnpm ios:pods` | 通过，75 个 Pods，RN / Hermes 0.72.5 | `pods.log`、`apps/ios/Podfile.lock` |
| iOS Debug 原生编译、安装、通过 Metro 启动 | 通过，首页显示 Hello world | `ios-debug.log`、`ios-debug.png` |
| iOS Release 通用模拟器 App | 通过，arm64 + x86_64；停止 Metro 后安装并离线启动首页 | `ios-release.log`、`ios-release.png` |
| Android Debug arm64 原生编译与启动 | 通过，首页显示 Hello world，App / Page 生命周期日志正常 | `android-debug.log`、`android-debug.png` |
| Android Release 四 ABI 原生编译与启动 | 通过，arm64-v8a / armeabi-v7a / x86 / x86_64；停止 Metro 并移除 adb 端口转发后安装、离线启动首页 | `android-release.log`、`android-release.png` |
| `pnpm build:h5`、`pnpm build:weapp`、`pnpm build:harmony` | 均通过；H5 有 3 条构建警告 | `h5.log`、`weapp.log`、`harmony.log` |

Release 原生编译使用 `apps/ios/scripts/build-app.sh` 与 `apps/android/scripts/build-apk.sh`，开始前已经通过上表的冷缓存 bundle。Debug 使用 `xcodebuild -configuration Debug` 与 `./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a`，通过各平台安装命令实测。切换依赖、运行 Pods 或原生构建时应先停止 Metro；冷缓存 bundle 验证顺序执行，避免同时清理共享转换缓存。

产物路径：

- iOS Debug：`dist/ios/app/Debug-iphonesimulator/HybridApp.app`
- iOS Release：`dist/ios/app/Release-iphonesimulator/HybridApp.app`
- Android Debug：`dist/rn/android/app/debug/HybridApp-debug.apk`
- Android Release：`dist/rn/android/app/release/HybridApp.apk`

Android 保留目标 API 34，但 RN 0.72 自带 AGP 7.4.2 的官方测试上限为 API 33，构建仍报告该警告。此次未关闭警告，也未将模拟器构建等同于商店发布或真机签名验证。

已有 App 未提供 Expo、Hermes 和原生模块清单，因此独立壳验证不代表已经完成既有 App 集成。摄像头、定位等具体原生能力需在对应业务场景中验证。
