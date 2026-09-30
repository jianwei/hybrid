# iOS 宿主 App

`HybridApp` 是加载 `apps/taro` React Native 内容的原生 iOS 宿主，最低支持 iOS 13.4。原生入口使用 Expo SDK 49 的 `EXAppDelegateWrapper` 接入方式，使用 RN 0.72.5、Expo 49 和 Hermes，关闭新架构及 Flipper。

RN 0.72.5 适配约束、首次切换清理步骤与验证范围见 [迁移验证](../../docs/react-native-0.72.5-migration.md)。

## 首次安装

需要完整 Xcode、iOS Simulator、Node.js 24.11+、pnpm 12.3.4，以及 Ruby 2.7+（建议使用独立安装的 Ruby 3.2）和 Bundler。macOS 自带 Ruby 2.6 不满足本项目 Gemfile。

```sh
# 仓库根目录
pnpm install --frozen-lockfile --strict-peer-dependencies

cd apps/ios
bundle install
bundle exec pod install
cd ../..

pnpm ios:open
```

后续更新原生依赖后，在根目录运行 `pnpm ios:pods`。始终打开 `HybridApp.xcworkspace`，Pods 安装会将依赖工程加入 workspace。JS 和原生库版本统一声明在 `apps/taro/package.json`，Podfile 从该目录执行 RN autolinking，并显式指定 Expo 模块的搜索路径。

若 Xcode 找不到 Node，在 `apps/ios/.xcode.env.local` 中设置本机 Node 绝对路径，例如 `export NODE_BINARY=/实际路径/node`；该文件不提交。

## Debug 开发

```sh
pnpm run dev:ios
```

这一条命令会启动 Taro / Metro，等待服务就绪，打开 iOS 模拟器，增量构建最新 Debug 宿主，然后安装并启动 App。优先使用已经启动的模拟器，否则选择 iPhone 17 或其他可用 iPhone。需要指定设备时，可使用名称或 UDID：

```sh
IOS_SIMULATOR='iPhone 17 Pro' pnpm run dev:ios
```

保持终端运行，修改 `apps/taro/src` 页面和样式后，Metro 自动编译并通过 Fast Refresh 更新 App；部分模块变更会触发整页重载。修改原生代码后重新执行此命令；新增原生依赖时先执行 `pnpm ios:pods`。按 Ctrl-C 停止本次启动的 Metro 和构建进程，模拟器保留打开。8081 被已有服务占用时命令会提示先停止该服务，避免连接到其他项目。

Debug App 输出在 `dist/ios/app/Debug-iphonesimulator/HybridApp.app`，Xcode 中间文件位于 `.cache/ios/DerivedData/`，构建日志位于 `.cache/ios/dev-build.log`。首次 Debug 构建需编译原生依赖，后续使用增量缓存。宿主从本机 Metro 的 `index` 入口加载，端口为 8081；Debug 开发 App 需要 Metro 持续运行。真机开发仍需设置开发服务器地址并保证网络可达。

只启动 Metro、手动通过 Xcode 调试时，可运行 `pnpm --filter taro run dev:rn:ios`，再用 `pnpm ios:open` 打开工程。

## Release 与离线运行

```sh
pnpm build:ios
pnpm build:ios:app # 包含上面的 bundle 构建，生成 Release 模拟器 App
pnpm ios:open
```

`build:ios` 编译 `apps/taro` 页面，输出仓库根目录 `dist/ios/bundle/main.jsbundle` 和静态资源。`build:ios:app` 先更新 bundle，再调用 Xcode 生成 `dist/ios/app/Release-iphonesimulator/HybridApp.app`；这个 App 用于模拟器，不需要开发者签名。Xcode 的缓存与中间文件保存在根目录 `.cache/ios/DerivedData/`，脚本只在原生构建成功后同步 App 到 `dist`。

`apps/ios/build/generated/ios/` 是 RN/CocoaPods 按工具约定生成且由 Pods 引用的代码，不属于交付产物；不要单独删除该目录，否则需重新运行 `pnpm ios:pods`。

在 Xcode 中编辑 scheme，将 Run 的 Build Configuration 设为 Release 后运行，或配置真机签名后选择 Archive 归档。Release 从 App 内置 `main.jsbundle` 加载，不需要 Metro。手动导出的 `.app`、`.xcarchive` 或 `.ipa` 也应保存在 `dist/ios/` 的对应子目录。

构建阶段 `嵌入 Taro RN bundle` 从 `dist/ios/bundle/` 复制 bundle 和所有资源到 App。缺少 bundle 时会直接失败，并提示先执行 `pnpm build:ios`。修改页面后需重新生成 bundle，再构建 Release；生成文件不提交。`build:ios` 不生成 `.app` / `.ipa`；生成模拟器 App 使用 `build:ios:app`。

## 真机 IPA

`build:ios:ipa` 依次编译 RN bundle、使用 `iphoneos` SDK 执行 Release Archive，再通过 Xcode 导出签名 IPA。成功后，单个安装包位于 `dist/ios/ipa/HybridApp.ipa`（以 Xcode 实际导出文件名为准），归档保存在 `dist/ios/archive/HybridApp.xcarchive/`。`.app` 本身是应用包目录，模拟器 `.app` 无法通过压缩或修改后缀变为真机安装包。

首次构建前准备签名（软件要求见 [软件要求](../../docs/requirements.md)）：

1. 在 Xcode → Settings → Accounts 添加具有相应权限的 Apple Developer 账号，并准备本机有效的开发证书及私钥。
2. 打开 `HybridApp.xcworkspace`，在 `HybridApp` target → Signing & Capabilities 选择团队，启用 Automatically manage signing。Bundle Identifier 须是该团队可用的 App ID，默认 `com.tuniu.hybrid` 未必属于你的团队。需要持久修改时，在 Build Settings 的自定义项 `HYBRID_BUNDLE_IDENTIFIER` 设置；保留 `PRODUCT_BUNDLE_IDENTIFIER` 对它的引用，以便脚本可按次覆盖且不影响 Pods 的标识。
3. 注册测试 iPhone 的 UDID，准备覆盖该设备、App ID 和证书的描述文件。先通过 Xcode 完成一次真机签名配置，让所需材料安装到本机；此脚本使用本机材料，不传 `-allowProvisioningUpdates`，不会请求创建或更新开发者后台的证书或描述文件。

```sh
# 仓库根目录；将示例 Team ID 和 Bundle ID 换成自己的实际值
IOS_TEAM_ID=ABCDEFGHIJ IOS_BUNDLE_ID=com.example.hybrid pnpm build:ios:ipa

# 给已注册的测试设备分发：额外需要 Apple Distribution 证书及 Ad Hoc 描述文件
IOS_TEAM_ID=ABCDEFGHIJ IOS_BUNDLE_ID=com.example.hybrid IOS_EXPORT_METHOD=release-testing pnpm build:ios:ipa
```

| 环境变量 | 用途 |
| --- | --- |
| `IOS_TEAM_ID` | 必填，Apple Developer 团队的 10 位 Team ID；每次显式指定，不写死到项目中。 |
| `IOS_BUNDLE_ID` | 可选，仅覆盖本次构建的 Bundle Identifier；省略时使用 Xcode 工程中的值。 |
| `IOS_EXPORT_METHOD` | 默认 `debugging`，使用开发签名供注册设备测试；可选 `release-testing`，使用分发签名供 Ad Hoc 测试。使用 Xcode 26 的导出方式名称。 |

脚本使用自动签名，Xcode 按 Team ID、Bundle ID 和导出方式选择本机匹配的描述文件；不接受手动 profile 映射。Team ID 无效或本机没有有效签名身份时，在编译前明确失败；描述文件或团队不匹配时，由 Xcode 报告具体签名错误。开发/Ad Hoc 安装包只适用于描述文件中已登记的设备，并受签名有效期约束；此入口不上传 App Store 或 TestFlight。安装可通过 Xcode 的 Devices and Simulators 或 Apple Configurator 完成，开发测试设备按系统提示启用 Developer Mode。

归档和导出先写入 `.cache/ios/`，两步成功后才更新 `dist/ios/archive/` 和 `dist/ios/ipa/`。失败时已有 IPA 仍是上次成功构建的版本；RN bundle 则可能已经更新。签名证书、私钥和描述文件应在本机/Xcode 管理，不提交到仓库。

## 工程与配置

- `HybridApp/AppDelegate.mm`：RN 初始化、模块名、Debug/Release 加载入口。
- `HybridApp.xcodeproj`、`HybridApp.xcworkspace`：应用 target、共享 scheme、Pods 入口。
- `Podfile`、`Gemfile`：原生依赖和 CocoaPods 版本。
- `scripts/copy-bundle.sh`：Release 内置 RN 产物。
- `scripts/build-app.sh`：构建模拟器 App，并同步到根 `dist/ios/app/`。
- `scripts/dev-app.mjs`：启动 Metro、构建最新 Debug App，并安装运行到 iOS 模拟器。
- `scripts/build-ipa.sh`：真机签名归档和导出，输出到根 `dist/ios/archive/` 和 `dist/ios/ipa/`。
- `../taro/config/index.ts`：`rn.appName: HybridApp` 和 bundle 输出位置。
- `../taro/react-native.config.js`：RN CLI 定位原生宿主。

Bundle Identifier 初始为 `com.tuniu.hybrid`；真机运行和归档前，按实际 App 配置 Signing Team 与标识。宿主未配置业务权限；后续调用相机、定位、相册等能力时，需要在 Info.plist 增加对应用途说明，并在真机验证。

## 验证范围

RN bundle 构建、TypeScript、ESLint、H5/微信构建及 Xcode 工程结构检查可在仓库中执行。完成 Pods 安装后，还需要在目标 Xcode / iOS 版本上实际编译和运行 Debug、Release；JavaScript 打包成功不代表原生编译或设备运行已通过。
