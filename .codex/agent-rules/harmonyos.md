# 鸿蒙客户端规则

HarmonyOS 宿主位于 `apps/harmonyos`（Stage 模型，最低兼容 API 14，包名 `com.tuniu.hybrid`），采用 Taro 官方 C-API 方案（`@tarojs/plugin-platform-harmony-cpp`）：`apps/taro` 页面经 Vite 编译为 ArkTS/C-API 运行时代码并注入宿主 `entry` HAP。该链路与 RN 宿主（iOS/Android）完全独立，不涉及 react-native 与 expo 依赖。

## 构建与运行

不安装 DevEco Studio，使用华为 Command Line Tools（`HARMONY_CLT` 指向解压目录，默认探测 `~/Downloads/command-line-tools`）。在仓库根目录执行：

- `pnpm build:harmony`：编译 Taro 页面（Vite），注入 `apps/harmonyos/entry/src/main/ets/` 并复制运行时 HAR 到 `apps/harmonyos/static/`；此步骤不需要鸿蒙环境。
- `pnpm build:harmony:app`：先执行上面的编译，再经 ohpm + hvigor 生成未签名 HAP，输出 `dist/harmony/app/HybridApp-debug.hap`。
- `pnpm dev:harmony`：完整调试链路——编译、组装 HAP、启动/复用 `HybridOS_Phone` 模拟器（`HARMONY_EMULATOR` 可指定其他）、hdc 安装并 `aa start -b com.tuniu.hybrid -a app -m default` 拉起应用。
- `pnpm --filter taro run dev:harmony`：watch 模式持续编译注入（鸿蒙端为静态打包，页面变更后仍需重新组装安装才能生效）。

`apps/harmonyos` 下的 `entry/src/main/ets/`、`entry/src/main/resources/rawfile/`、`static/`、`oh_modules/`、`build/` 均为生成内容，不提交。模拟器安装未签名 HAP 即可调试；真机与发布才需要华为开发者账号和签名材料（hap-sign-tool.jar 在 `$HARMONY_CLT/sdk/default/openharmony/toolchains/lib/`）。

## 约定

- 模拟器按进程 locale 判定地区，脚本与手工命令都必须带 `LANG=zh_CN.UTF-8`，否则启动被拒（仅限中国大陆能力）。
- `hvigor/hvigor-config.json5` 与根 `oh-package.json5` 的 `modelVersion` 必须相等且与 hvigor 版本匹配（当前 `26.0.0`）；`build-profile.json5` 的 `compatibleSdkVersion` 为 `5.0.2(14)`（HAR 要求最低 API 14）。
- hdc 位于 `$HARMONY_CLT/sdk/default/openharmony/toolchains/hdc`；截图命令 `hdc shell snapshot_display` 的文件后缀必须是 `.jpeg`。
- Taro 侧鸿蒙配置集中在 `apps/taro/config/index.ts` 的 `harmony` 块（`compiler: 'vite'`、`projectPath`、`hapName`）；鸿蒙端只用 Vite，与 h5/小程序的 webpack5 互不干扰。
- 运行时依赖只有 `@taro-oh/library` HAR，声明在 `entry/oh-package.json5` 的 `file:../static/`；升级 Taro 版本时核对 HAR 文件名与 Taro 版本一致。
- 勿手改 `entry/src/main/ets/` 内文件（含 Taro 生成的 `app.ets` 与入口 Ability，Ability 名 `app`、模块名 `default`）。
- 组件与 API 支持度以 [Taro 鸿蒙文档](https://docs.taro.zone/docs/harmony/c-api) 为准；未支持 API 运行时抛 `__taroNotSupport` 事件。

## 验证范围

`pnpm dev:harmony` 已在鸿蒙模拟器（HarmonyOS 7.0.0，API 26）实测通过，首页正常渲染。真机签名安装未验证。
