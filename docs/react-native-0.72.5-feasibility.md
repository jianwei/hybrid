# 对齐已有 App 的 React Native 0.72.5 可行性调研

> 历史调研记录：以下是实施前的基线与判断。当前适配内容和实际验证结果见 [RN 0.72.5 迁移验证](react-native-0.72.5-migration.md)。

调研日期：2026-09-30。用户确认目标是对齐已有 App；该宿主的 Expo、原生模块清单、架构和构建配置尚未提供。

## 结论

技术上可以尝试适配，但当前仓库不能仅把 React Native 0.73.11 改成 0.72.5。现有 Taro 4.2.1 RN 包明确要求 RN ^0.73.1 和 Expo SDK 50，目标版本不满足声明约束；Android 宿主也存在源码接口差异。保留当前 Taro 的适配属于自维护兼容方案，尚未通过构建和运行验证。

已有宿主固定 0.72.5 时，应先以其原生运行时为基线确定 JS 依赖、原生能力与加载合同，再做最小页面接入验证。当前独立壳运行成功不等于已有 App 可以加载对应页面。

## 当前仓库证据

| 项目 | 当前状态 | 本地证据 |
| --- | --- | --- |
| RN / React | 0.73.11 / 18.2.0 | `apps/taro/package.json` |
| Taro | 4.2.1，含 RN、H5、微信及鸿蒙相关包 | `apps/taro/package.json` |
| Expo | 声明 ~50.0.2；iOS 锁定 50.0.21 / ExpoModulesCore 1.11.14 | `apps/taro/package.json`、`apps/ios/Podfile.lock` |
| RN CLI | 12.3.7；Android 自动链接脚本有仓库内副本 | `apps/taro/package.json`、`apps/android/scripts/native_modules.gradle` |
| Metro / Babel | metro-config 0.73.5、babel-preset 0.73.21；Taro rn-supporter 直接依赖 Metro ^0.80.0 和 transformer ^0.73.2 | `apps/taro/package.json`、已安装 `@tarojs/rn-supporter/package.json` |
| Android | Gradle 8.3、JDK 17、SDK 34、NDK 25.1、Kotlin 1.8 | `apps/android/build.gradle`、wrapper、`docs/requirements.md` |
| iOS | 最低 13.4、Expo AppDelegate wrapper | `apps/ios/Podfile`、`apps/ios/HybridApp/AppDelegate.h` |
| 架构 | 两端使用 Hermes，关闭新架构 | Podfile、`apps/android/gradle.properties` |
| 严格依赖检查 | 项目安装规则要求 `--strict-peer-dependencies`；现有 peer 例外不包含 RN 降级 | `.codex/agent-rules/ios.md`、`pnpm-workspace.yaml` |

当前 `components-rn`、`taro-rn`、`router-rn` 三个包的已安装元数据都声明 RN ^0.73.1；不能因为 `runtime-rn` 或 `rn-supporter` 的 RN peer 范围较宽就认为整套支持 0.72.5。

## 已确认的兼容障碍

### Taro 与 Expo

Taro 4.2.1 components-rn 的官方源码明确声明 RN ^0.73.1、Expo ~50.0.0，以及对应 expo-av、expo-camera 等版本。0.72.5 不属于 ^0.73.1 范围。[Taro 4.2.1 包声明](https://github.com/NervJS/taro/blob/v4.2.1/packages/taro-components-rn/package.json)

Expo SDK 50 对应 RN 0.73；SDK 49 属于 RN 0.72 代际。因此需要研究 Expo 49 及整套模块的配套版本，不能只降 `expo` 主包。SDK 49 的代际对应关系不等于本项目在精确 0.72.5 上已通过验证。[SDK 50 发布说明](https://expo.dev/changelog/2024-01-18-sdk-50)、[SDK 49 官方页面](https://expo.dev/sdk/49)

通过 peer 例外放行只能解决安装检查，不能证明 Taro 的实现、Metro transformer 或 Expo 原生 API 可兼容旧版。

### CLI、Metro 与 Babel

RN 0.72.5 官方声明 CLI 11.3.7、Metro runtime 0.76.8；官方模板使用 metro-config ^0.72.11 和 metro-react-native-babel-preset 0.76.8。当前项目的 CLI 12 与 RN 0.73 工具包需一起核对，Android 自动链接副本也需同步。Taro 自身的 Metro 0.80 依赖意味着只改项目顶层工具包仍可能形成多套工具链。[RN 0.72.5 包声明](https://github.com/facebook/react-native/blob/v0.72.5/packages/react-native/package.json)、[对应模板](https://github.com/facebook/react-native/blob/v0.72.5/packages/react-native/template/package.json)

React 18.2.0 可以保持，它是 RN 0.72.5 声明的 React 版本。Node >=16 是 RN 的最低要求，并不要求把项目 Node 24 降到 16；旧工具在当前 Node 24、pnpm 工作区和软链布局下的表现仍需验证。

### Android 源码与构建

当前 MainApplication.kt 覆盖 `reactHost` 并调用 `getDefaultReactHost`；目标 0.72.5 的 ReactApplication 仅声明 `getReactNativeHost()`。该覆盖不匹配目标接口，需按 0.72 宿主 API 调整。[目标接口源码](https://github.com/facebook/react-native/blob/v0.72.5/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/ReactApplication.java)

当前根工程应用 `com.facebook.react.rootproject`；目标 tag 的 Gradle plugin 源码只注册 `com.facebook.react`。切换时必须核对最终解析到的 0.72.x 插件并调整入口；tag 源码与依赖范围最终解析结果不能混为一谈。[目标插件源码](https://github.com/facebook/react-native/blob/v0.72.5/packages/react-native-gradle-plugin/build.gradle.kts)

0.72.5 模板是 SDK 33、NDK 23.1、Gradle 8.0.1，与当前工具链不同。这些是官方模板基线，并不意味着全部必须机械降级；最终选择应服从已有 App 的配置和实际编译结果。[Android 模板](https://github.com/facebook/react-native/blob/v0.72.5/packages/react-native/template/android/build.gradle)、[Gradle wrapper](https://github.com/facebook/react-native/blob/v0.72.5/packages/react-native/template/android/gradle/wrapper/gradle-wrapper.properties)

### iOS 与原生模块

必须重新解析 Pods，使 RN、Hermes、ExpoModulesCore 与原生库一致，核对 Podfile 钩子及 EXAppDelegateWrapper。不可沿用当前 0.73.11 的 Podfile.lock/Pods 当作目标依赖。

其他已安装原生库的大多数 RN peer 范围较宽，没有由元数据直接证明它们全部阻止 0.72.5；同样不能据此证明编译和运行兼容。需要逐个核对宿主已有的模块和版本。

## 对齐已有 App 的实施选择

| 选择 | 可行性判断 | 代价 |
| --- | --- | --- |
| 只改 RN 为 0.72.5 | 不满足当前依赖约束，且有原生源码差异 | 不宜采用 |
| 保持 Taro 4.2.1，适配 RN 0.72.5 / 配套 Expo | 可探索，当前无已验证组合 | 自维护 Taro RN 依赖和实现兼容，风险较高 |
| 选择经核实支持 0.72 的整套 Taro 版本 | 需要另行查明具体版本组合 | 可能影响共享 H5、微信及鸿蒙能力；不可混装跨代 Taro 包 |
| 以已有宿主为基线，收敛页面使用的原生能力 | 更符合本次宿主对齐目标，需先验证最小页面 | 仍需解决 Taro 工具链兼容；可减少无关模块接入 |

如果已有 App 未集成 Expo，应确认能否增加 Expo Modules，或将页面用到的相关能力适配为已有原生模块。不能假定 App 当前具备相机、定位、文件、地图、WebView、手势、安全区等本仓依赖的全部能力。

宿主与 bundle 的 RN API、原生模块合同必须一致；如交付 Hermes 字节码，还需使用匹配的 Hermes 编译器。直接把按 0.73 依赖生成的产物放入 0.72 宿主，不能视为兼容方案。这是基于本项目依赖差异的工程判断，尚未执行宿主加载实验。

## 建议的验证顺序

1. 获取已有 App 的 package.json/锁文件、iOS Podfile.lock、Android Gradle 配置，以及 Hermes、新架构、模块清单、RN 页面注册与加载方式。
2. 在隔离环境中确定一套 RN 0.72.5 依赖树，核查严格 peer 检查和重复 RN/React/Metro；保留主工程当前依赖。
3. 先用最小 Taro 页面验证 Metro 冷启动及 iOS/Android bundle，再在已有宿主加载；依次验证导航、手势和实际使用的原生能力。
4. 两端分别验证 Debug 运行、Release 内嵌 bundle 和离线启动。bundle 成功不能替代原生构建与已有 App 接入验收。
5. 若调整共享 Taro 包或配置，再回归 H5、微信及鸿蒙相关构建和使用场景。

RN 0.72 和当前 0.73 均在官方未维护版本归档中。本次选择 0.72.5 的依据是兼容已有宿主；后续宿主升级应单独规划。[官方版本列表](https://reactnative.dev/versions)

## 调研边界

已完成仓库声明、已安装包元数据、iOS 锁文件、原生宿主源码与官方资料核对。未安装目标依赖、未修改代码或锁文件、未执行降级构建；仅新增本调研文档。最终能否在已有 App 接入，仍取决于其未提供的原生依赖和加载配置。
