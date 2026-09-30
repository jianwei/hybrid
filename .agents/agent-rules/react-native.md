# React Native 规则

平台文档：[React Native](https://reactnative.dev/?from=taro)。

- 当前工程提供 `build:rn` 和 `dev:rn` 脚本；使用前核对 React Native 环境、依赖与实际构建结果。
- RN 0.72.5，Hermes，关闭新架构；iOS 宿主在 `apps/ios`，Android 宿主在 `apps/android`，两端共用 `apps/taro` 的 JS 与原生库版本。
- 平台 bundle：`build:rn:ios` 输出 `dist/ios/bundle/main.jsbundle`，`build:rn:android` 输出 `dist/rn/android/index.android.bundle`；Metro 开发服务分别为 `dev:rn:ios` / `dev:rn:android`，日常经 `pnpm run dev:ios` / `pnpm run dev:android` 编排启动。
- `apps/taro/metro.config.js` 监视整个仓库根（pnpm 真实路径解析），必须用 `blockList` 排除仓库根的 `.cache/` 与 `dist/`、`apps/ios/Pods/` / `apps/ios/build/` 及 `apps/harmonyos/oh_modules/`；排除规则锚定仓库内的这些目录，不得误伤 `node_modules` 内的 `dist`。
- Taro RN 注入的 babel/stylelint 插件（jsx-to-rn-stylesheet、global-define、stylelint-config-taro-rn 等）由工具按裸包名解析，统一经根 `pnpm-workspace.yaml` 的 `publicHoistPattern` 提升，不再作为 `apps/taro` 的直接依赖声明。
- 验证 Metro 或 bundle 改动时使用 `--reset-cache` 冷启动一次；热缓存会掩盖插件解析类问题。
