# HarmonyOS 宿主 App

`HybridApp` 是承载 `apps/taro` 编译内容的鸿蒙原生宿主（Stage 模型，最低兼容 API 14），包名 `com.tuniu.hybrid`。采用 Taro 官方 C-API 方案（`@tarojs/plugin-platform-harmony-cpp`，与京东 App 纯血鸿蒙同路线）：Taro 页面经 Vite 编译为 ArkTS/C-API 运行时代码，注入本工程的 `entry` HAP，与 RN 链路（iOS/Android 宿主）互不相关。

## 首次安装

**不需要安装 DevEco Studio**。整条链路用华为 Command Line Tools（mac-arm64 26.0.0+，含 HarmonyOS SDK、ohpm、hvigor、hdc、Emulator）完成，版本要求见 [软件要求](../../docs/requirements.md)。

```sh
# 解压 Command Line Tools 后，把解压目录告诉脚本（默认探测 ~/Downloads/command-line-tools）
export HARMONY_CLT=/path/to/command-line-tools

# 仓库根目录
pnpm install --frozen-lockfile --strict-peer-dependencies

# 编译 Taro 页面并注入本工程（同时拉取运行时 HAR）
pnpm build:harmony

# 一条命令完成：编译 → 组装 HAP → 启动模拟器 → 安装并运行
pnpm dev:harmony
```

注意：

- 模拟器按进程 locale 判定地区，非中文 locale 会拒绝启动（仅限中国大陆能力）。脚本已内置 `LANG=zh_CN.UTF-8`；手工调用 `Emulator` 命令时也要带上。
- 模拟器安装**未签名 HAP** 即可调试，无需华为开发者账号；真机调试与发布才需要 AppGallery Connect 调试证书与 Profile。
- `entry/src/main/ets/`、`entry/src/main/resources/rawfile/` 和 `static/` 是 Taro 编译注入的生成内容，不提交；每次 `pnpm build:harmony` 全量重建。

## 构建与运行

```sh
pnpm build:harmony      # 仅编译 Taro 页面，注入 apps/harmonyos/entry
pnpm build:harmony:app  # 包含上面的编译，再经 ohpm + hvigor 生成 HAP
pnpm dev:harmony        # 编译 + 组装 + 启动/复用模拟器 + hdc 安装并拉起应用
```

`build:harmony:app` 输出 `dist/harmony/app/HybridApp-debug.hap`（未签名，仅供模拟器）。`dev:harmony` 复用已在线的 hdc 设备，否则后台启动 `HybridOS_Phone` 模拟器（可用 `HARMONY_EMULATOR=名字` 指定其他模拟器）；鸿蒙端为静态打包，修改 `apps/taro/src` 后需重新执行命令。

手工操作模拟器与设备（均需先 `export LANG=zh_CN.UTF-8` 并把 `$HARMONY_CLT/bin` 加入 PATH）：

```sh
Emulator -list                                        # 列出已创建的模拟器
Emulator -start HybridOS_Phone -noWindow              # 后台启动（无窗口）
hdc list targets                                      # 确认设备上线（hdc 在 sdk/default/openharmony/toolchains/）
hdc install -r dist/harmony/app/HybridApp-debug.hap   # 安装/覆盖安装
hdc shell aa start -b com.tuniu.hybrid -a app -m default   # 拉起应用
hdc shell snapshot_display -f /data/local/tmp/screen.jpeg  # 截图（后缀必须 .jpeg）
```

创建新模拟器（首次已建好 `HybridOS_Phone`，可跳过）：`Emulator -license accept` 接受协议后，下载手机镜像再 `Emulator -create <名字> -deviceType phone -osVersion "HarmonyOS 7.0.0(26.0.0)"`。

## 工程与配置

- `../taro/config/index.ts`：`harmony.compiler: 'vite'`、`harmony.projectPath` 指向本工程、`hapName: 'entry'`。
- `AppScope/app.json5`：包名、版本、图标与名称。
- `build-profile.json5`：产品配置，`compatibleSdkVersion` 为 `5.0.2(14)`（运行时 HAR 要求最低 API 14）。
- `hvigor/hvigor-config.json5` 与根 `oh-package.json5`：两处 `modelVersion` 必须相等且与 hvigor 版本匹配（当前 `26.0.0`）。
- `entry/oh-package.json5`：声明 `@taro-oh/library` 运行时 HAR（`file:../static/`，由 Taro 构建复制）。
- `scripts/build-app.sh`：ohpm install + hvigor assembleHap，产物复制到根 `dist/harmony/app/`。
- `scripts/dev-app.mjs`：编排完整调试链路（编译 → 组装 → 启动模拟器 → hdc 安装 → aa start）。
- `entry/src/main/ets/app.ets` 等：Taro 生成的入口与页面（含入口 Ability 与 Taro 运行时初始化），勿手改。生成的主 Ability 名为 `app`、模块名为 `default`。

## 验证范围

`pnpm dev:harmony` 已在鸿蒙模拟器（HarmonyOS 7.0.0，API 26）上实测通过：首页渲染「首页 / Hello world!」。组件与 API 支持度以 Taro 鸿蒙文档为准，未支持的 API 运行时抛 `__taroNotSupport` 事件。真机安装需要签名材料（.p12 私钥 + AppGallery 调试证书 + Profile，配合 `sdk/default/openharmony/toolchains/lib/hap-sign-tool.jar`），未在本仓库验证。
