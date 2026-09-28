# Android 客户端规则

Android 宿主位于 `apps/android`，加载 `apps/taro` 的 React Native 内容；使用 RN 0.73.11、Expo 50 和 Hermes，关闭新架构，不使用 Flipper。应用 ID `com.tuniu.hybrid`，最低支持 API 21，目标/编译 API 34。

## 构建与运行

在仓库根目录执行：

- `pnpm run dev:android`：启动 Metro、选择或启动模拟器（`ANDROID_AVD` 指定 AVD 名或序列号）、按当前设备 ABI 增量构建 Debug APK、安装并启动；Debug 运行时从 Metro 加载 JS。
- `pnpm build:android`：仅编译 JS bundle，输出 `dist/rn/android/index.android.bundle` 与资源。
- `pnpm build:android:apk`：先更新 bundle，再生成内嵌 bundle 的 Release APK `dist/rn/android/app/release/HybridApp.apk`。

Gradle 8.3 由 wrapper 下载（distributionUrl 使用腾讯镜像，官方源国内不可达）；Gradle 缓存与构建中间文件在 `.cache/android/`，交付物复制到 `dist/rn/android/` 对应子目录，均不提交。软件与 SDK 组件版本见 [软件要求](../../docs/requirements.md)，详细行为见 [Android 宿主说明](../../apps/android/README.md)。

## monorepo 适配约定

- JS 与原生库版本只声明在 `apps/taro/package.json`；Android 工程不在 `apps/android` 声明 JS 依赖。
- `apps/android/node_modules` 是指向 `../taro/node_modules` 的软链，由 `settings.gradle` 自动创建，不提交。
- RN autolinking 使用仓库内 `apps/android/scripts/native_modules.gradle`（cli-platform-android 12.3.7 原样复制，仅以 `apps/taro` 为 JS 根执行 `react-native config`）；升级 RN/CLI 版本时同步更新该副本。
- Expo autolinking 的 `searchPaths` 指向 `apps/taro/node_modules`。
- 新增原生依赖（含 expo 模块）后重新执行 `pnpm run dev:android` 或构建命令即可，无需额外的 link 步骤。

## 验证范围

修改 Android 原生代码、Gradle 配置或 RN/Expo 依赖后，必须在模拟器或真机上实际编译并运行 Debug；Release 需实际生成 APK 并安装验证。JS bundle 成功不代表原生编译通过。
