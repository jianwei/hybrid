# Android 宿主 App

`HybridApp` 是加载 `apps/taro` React Native 内容的原生 Android 宿主，最低支持 Android 5.0（API 21），目标 API 34，应用 ID `com.tuniu.hybrid`。原生结构沿用 [Taro 官方 RN 0.73 壳](https://github.com/NervJS/taro-native-shell/tree/0.73.0)的 Android 接入方式，使用 RN 0.73.11、Expo 50 和 Hermes，关闭新架构，不使用 Flipper。

## 首次安装

需要 JDK 17、Android SDK（Platform 34、Build-Tools 34、NDK 25.1.8937393、CMake 3.22.1、Platform-Tools、模拟器与 arm64 系统镜像）和至少一个 Android 虚拟设备（AVD），版本要求见 [软件要求](../../docs/requirements.md)。

```sh
# 仓库根目录
pnpm install --frozen-lockfile --strict-peer-dependencies
```

JS 和原生库版本统一声明在 `apps/taro/package.json`；Gradle 通过仓库内脚本从该目录执行 RN 与 Expo 的 autolinking。SDK 位置按 `ANDROID_HOME` → `ANDROID_SDK_ROOT` → `~/Library/Android/sdk` → Homebrew 命令行工具目录（`/opt/homebrew/share/android-commandlinetools`）顺序解析。Gradle 8.3 由 wrapper 自动下载，distributionUrl 使用腾讯镜像（官方 services.gradle.org 在国内网络不可达）；`node_modules` 指向 `../taro/node_modules` 的软链由 `settings.gradle` 自动创建，无需手动维护。

## Debug 开发

```sh
pnpm run dev:android
```

这一条命令会启动 Taro / Metro，等待服务就绪，选择或启动 Android 模拟器，配置 `adb reverse`，只按当前设备 ABI 增量构建最新 Debug 宿主，然后安装并启动 App。优先使用已经在线的模拟器或设备，否则启动第一个可用 AVD。需要指定设备时，可使用 AVD 名称或 adb 序列号：

```sh
ANDROID_AVD='Pixel_7_API_35' pnpm run dev:android
```

保持终端运行，修改 `apps/taro/src` 页面和样式后，Metro 自动编译并通过 Fast Refresh 更新 App；部分模块变更会触发整页重载。修改原生代码后重新执行此命令。按 Ctrl-C 停止本次启动的 Metro 和构建进程，模拟器保留打开。8081 被已有服务占用时命令会提示先停止该服务，避免连接到其他项目。

Debug APK 输出在 `dist/rn/android/app/debug/HybridApp-debug.apk`，Gradle 缓存位于 `.cache/android/gradle/`，构建中间文件位于 `.cache/android/build/`，构建日志位于 `.cache/android/dev-build.log`。首次 Debug 构建需下载 Gradle 发行版与原生依赖并编译原生模块，后续使用增量缓存。宿主从本机 Metro 的 `index` 入口加载，端口为 8081；Debug 开发 App 需要 Metro 持续运行。真机开发需保证设备与电脑在同一网络，并在开发者选项中配置调试服务器地址。

只启动 Metro、手动通过 Android Studio 调试时，可运行 `pnpm --filter taro run dev:rn:android`。

## Release 与离线运行

```sh
pnpm build:android     # 仅编译 JS bundle 与资源
pnpm build:android:apk # 包含上面的 bundle 构建，再生成 Release APK
```

`build:android` 编译 `apps/taro` 页面，输出仓库根目录 `dist/rn/android/index.android.bundle` 和静态资源。`build:android:apk` 先更新 bundle，再调用 Gradle 生成 `dist/rn/android/app/release/HybridApp.apk`；Release 内嵌 RN bundle，不需要 Metro。Release 沿用模板的调试签名，正式分发前需替换为自己的 keystore 并配置签名。修改页面后需重新生成 bundle，再构建 Release；生成文件不提交。

## 工程与配置

- `settings.gradle`：monorepo 适配——创建 `node_modules` 软链、应用仓库内 `native_modules.gradle`、Expo 模块自动链接（`searchPaths` 指向 `apps/taro/node_modules`）、引入 RN Gradle Plugin。
- `scripts/native_modules.gradle`：`@react-native-community/cli-platform-android` 12.3.7 原样复制，唯一改动是以 `apps/taro` 为 JS 根执行 `react-native config`（对应 iOS Podfile 的 `Dir.chdir(taro_root)`）。
- `app/build.gradle`：`react {}` 指定 `root` / `reactNativeDir` / `codegenDir` / `entryFile` 到 `apps/taro`；签名、ABI 与构建类型。
- `app/src/main/java/com/tuniu/hybrid/MainActivity.kt`：RN 模块名（与 `rn.appName` 一致）。
- `app/src/main/java/com/tuniu/hybrid/MainApplication.kt`：RN 初始化、Expo `ReactNativeHostWrapper`、Hermes 开关。
- `scripts/dev-app.mjs`：启动 Metro、构建最新 Debug App，并安装运行到模拟器。
- `scripts/build-apk.sh`：构建 Release APK，并同步到根 `dist/rn/android/app/release/`。
- `../taro/config/index.ts`：`rn.appName: HybridApp` 和 bundle 输出位置。
- `../taro/react-native.config.js`：RN CLI 定位原生宿主。

启动图标为脚本生成的纯色占位图，正式产品需要替换 `app/src/main/res/mipmap-*/` 下的图标。宿主仅声明模板自带权限（相机、录音、存储、振动等）；后续裁剪或新增业务权限时在 `AndroidManifest.xml` 调整，并在真机验证。

## 验证范围

RN bundle 构建、TypeScript、ESLint、H5/微信构建及 Gradle 工程结构检查可在仓库中执行。完成依赖安装后，还需要在目标 Android SDK / 模拟器或真机上实际编译和运行 Debug、Release；JavaScript 打包成功不代表原生编译或设备运行已通过。
