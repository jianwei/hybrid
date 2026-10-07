# HarmonyOS React Native 宿主

`apps/harmonyos-rn` 是独立的 Stage / RNOH 宿主，包名 `com.tuniu.hybrid.rn`，加载 `apps/taro/src` 的共享页面，注册名 `HybridApp`。已有 `apps/harmonyos` 继续提供 Taro `harmony_cpp` 链路，两者可同时安装。

## 环境与安装

按 [软件要求](../../docs/requirements.md) 准备 Node、pnpm 和华为 Command Line Tools，无需 DevEco Studio。脚本依次查找 `HARMONY_CLT`、`~/command-line-tools`、`~/Downloads/command-line-tools`。已安装 SDK 必须包含 native 工具链和 CMake；最低兼容 API 14，目前采用 CLI / SDK 26。

```sh
pnpm install --frozen-lockfile --strict-peer-dependencies
```

JavaScript 依赖统一声明在 `apps/taro/package.json`。RNOH 精确使用 `@react-native-oh/react-native-harmony@0.72.140`（官方 `0.72-stable`，基于 RN 0.72.5），对应的 `react_native_openharmony_release.har` 随 npm 包下载，内含 Hermes 和 C-API 核心动态库。HAR 只有 `arm64-v8a`；开发脚本拒绝其他 ABI。`ohpm install --all` 和手势 Codegen 由构建自动执行，`oh-package-lock.json5` 固定原生依赖。

宿主 Debug / Release 都链接同一发行版核心库，其 C++ ABI 按 `NDEBUG` / `-O2` 编译。CMake 在构建目录生成 NAPI bridge 副本，仅将环境查询中的开发标志改为宿主 Debug 宏，启用 Metro、ArkTS 开发菜单和 Fast Refresh；原 HAR 保持不变，替换片段必须唯一匹配锁定版本。不能直接启用 `REACT_NATIVE_DEBUG`，它还会改变核心类 ABI。若需深入调试 RNOH 核心 C++，需另行切换到带源码/调试符号的匹配 HAR，不能混用不同版本的头文件和库。

## 开发

仓库根目录执行：

```sh
pnpm dev:harmony:rn
pnpm dev:harmony:rn:noWindow
HARMONY_DEVICE=127.0.0.1:5555 pnpm dev:harmony:rn
HARMONY_EMULATOR=HybridOS_Phone pnpm dev:harmony:rn
```

一键命令检查 8081 端口，复用唯一在线设备，或启动指定模拟器，启动 Metro、编译 Debug HAP、通过 `hdc rport` 转发 8081、安装并拉起 `EntryAbility`。发现多个设备时需指定 `HARMONY_DEVICE`。`--noWindow` 只影响新启动模拟器，已运行模拟器保持原有模式。模拟器启动带中文 locale。

保持终端运行，修改共享页面或 Sass 后通过 Metro 更新；改原生代码需重跑开发命令。按 Ctrl-C 清理本命令创建的 Metro、构建子进程及端口转发，模拟器保留。已占用的端口不会复用，避免连接其他项目。

```sh
# 单独运行 Metro：宿主仍须已安装，并建立相应 hdc rport。
cd apps/taro
NODE_ENV=development TARO_ENV=rn pnpm exec react-native start --config metro.harmony.config.js
```

原生构建日志位于 `.cache/harmony-rn/debug-build.log`，JavaScript 编译错误显示在 Metro 终端和 RNOH 错误对话框。CLI 的构建失败会返回非零退出码，不以旧 HAP 作为本次成功产物。

```sh
# 以下 hdc 路径按本机 HARMONY_CLT 调整。
~/command-line-tools/sdk/default/openharmony/toolchains/hdc -t 127.0.0.1:5555 shell hilog
~/command-line-tools/sdk/default/openharmony/toolchains/hdc -t 127.0.0.1:5555 shell snapshot_display -f /data/local/tmp/hybrid-rn.jpeg
~/command-line-tools/sdk/default/openharmony/toolchains/hdc -t 127.0.0.1:5555 file recv /data/local/tmp/hybrid-rn.jpeg .cache/harmony-rn/hybrid-rn.jpeg
```

## 构建与离线运行

```sh
pnpm build:harmony:rn               # 仅生成 bundle 与资源，不需要鸿蒙 SDK
pnpm build:harmony:rn --reset-cache # 冷缓存验证 Metro resolver / transformer
pnpm build:harmony:rn:app           # 更新 bundle 并构建内嵌资源的 Release HAP
```

| 内容 | 路径 |
| --- | --- |
| JS 与图片资源 | `dist/harmony-rn/bundle/` |
| Debug HAP | `dist/harmony-rn/app/debug/HybridApp-debug.hap` |
| Release HAP | `dist/harmony-rn/app/release/HybridApp-release.hap` |
| 日志及 bundle 暂存 | `.cache/harmony-rn/` |
| CLI 强制的原生中间目录 | 宿主 `.hvigor/`、`entry/build/`、`entry/.cxx/`（忽略提交） |

Debug 仅连接 Metro；Release 仅加载 HAP 的 `rawfile/bundle.harmony.js`，不尝试连接 Metro。发布时 bundle 在缓存暂存目录生成，成功后替换对应交付目录，避免删除的图片残留。宿主 `rawfile/` 全部归本流程管理，不手写文件。构建 Release 后可停止 Metro、安装 HAP、强制结束应用再启动，验证离线加载。

鸿蒙生产 bundle 使用专用 asset plugin，将资源元数据中的隐藏 `.pnpm` 目录转换为 `pnpm`；JS 引用与图片复制使用相同路径，避免 hvigor 过滤隐藏目录后丢失图片。开发 Metro 使用原路径，继续正常从源文件提供图片。

目前 HAP 不签名，适合模拟器。真机及正式发布需要有效华为证书、Profile 与签名配置；没有签名材料时不产生已签名交付物，不将模拟器验收替代真机验收。

## 共享页面与能力边界

`apps/taro/metro.harmony.config.js` 保留 Taro 的入口、alias、`.rn` 与 Sass transformer，再委派给 RNOH resolver。鸿蒙专用包和内部相对导入显式映射，以兼容 pnpm 软链。非鸿蒙构建继续使用原 `metro.config.js`。鸿蒙包已从 iOS / Android autolinking 排除。

- 已连接原生手势、安全区；当前 Taro 默认 JS stack 导航沿用 `react-native-screens` 对非 iOS/Android 的 JS fallback。尚未接入 native-stack，不启用 `rn.useNativeStack`。
- `harmony/components.js` 使用真实 Taro 组件并延迟取用，Provider 保留 Ant Design 的主题、Portal 与 locale。Camera、Video、Map、WebView、Picker、Swiper、Slider、Icon 等未接入组件渲染时明确抛错。
- `harmony/taro.js` 保留 Taro hooks、页面/App 生命周期、路由及不依赖 Expo 的基础 API。文件、相机、定位、传感器、存储等未接入能力调用时明确抛错；不能依据原有 TypeScript 类型或其他端成功就认定鸿蒙可用。
- 这些入口针对 Taro 4.2.1 固定的 `dist` 结构；升级 Taro 后需逐项核验内部路径、聚合导出和原生依赖，运行冷 bundle 与设备验收。
- 新增三方库必须同时处理 JS resolver、HAR 依赖、Codegen、C++/ArkTS 注册及 iOS/Android 排除项，并更新此边界；仅安装 npm 包不代表鸿蒙能力已连接。

## 当前验收范围

2026-10-07 在 macOS 的 Command Line Tools 26、`HybridOS_Phone` API 26 / arm64 模拟器验证：Debug 一键构建安装、共享 Taro 首页、App / Page 加载日志、首页文本 Fast Refresh、Release 关闭 Metro 后冷启动；退出开发命令后 8081 和本次 hdc 反向映射均释放。冷 bundle、严格 frozen 安装、typecheck、lint、iOS / Android bundle、H5 / 微信小程序构建通过。过程日志和 Debug / Fast Refresh / Release 截图保留在 `.cache/harmony-rn/`。

资源已检查打包路径和 HAP 内容，尚未逐项验证所有图片、组件、导航交互与 API；上述组件白名单表示采用真实实现，不代表全属性设备认证。未执行真机、签名发布或 RNOH 核心 C++ 调试。CLI 26 编译上游 RNOH 会输出 ArkTS 废弃 API / 类型提示、C++ 警告，运行日志也有可选 TurboModule 缺失及显示参数探测警告；首页和热更新实测通过，不将其表述为零警告验收。

官方依据：[RNOH 0.72 文档](https://gitcode.com/OpenHarmony-RN/ohos_react_native/blob/0.72-main/docs/zh-cn/README.md)、[Taro 鸿蒙 RN](https://docs.taro.zone/docs/react-native-harmony)、[手势连接说明](https://github.com/react-native-oh-library/usage-docs/blob/master/zh-cn/react-native-gesture-handler.md)、[安全区连接说明](https://github.com/react-native-oh-library/usage-docs/blob/master/zh-cn/react-native-safe-area-context.md)。
