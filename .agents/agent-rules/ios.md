# iOS 客户端规则

此文件用于补充 iOS 客户端专属规则。

以下命令均从仓库根目录执行；原生工程始终通过 `apps/ios/HybridApp.xcworkspace` 打开，以加载 CocoaPods 依赖工程。

## 首次准备与依赖变化

首次拉取项目后完成 JavaScript、Ruby 和 CocoaPods 依赖安装：

```sh
pnpm install --frozen-lockfile --strict-peer-dependencies
cd apps/ios
bundle install
bundle exec pod install
cd ../..
```

- 后续新增、升级或删除 React Native、Expo、Pod 等原生依赖后，先运行 `pnpm ios:pods`，再重新构建 App。
- `apps/ios/Pods/Manifest.lock` 缺失时，`pnpm run dev:ios` 会停止并提示准备 Pods。
- Xcode 找不到 Node 时，在不提交的 `apps/ios/.xcode.env.local` 中配置 `NODE_BINARY` 的绝对路径。

## Debug 开发与调试

执行 `pnpm run dev:ios` 完成日常模拟器开发。该命令会检查 8081 端口和 Pods，启动 Taro/Metro，选择并启动模拟器，增量构建最新 Debug App，然后安装和启动应用。保持命令所在终端运行，修改 `apps/taro/src/` 后由 Metro 编译并通过 Fast Refresh 更新；部分模块变化会触发整页重载。

- 默认优先使用已启动的模拟器，其次选择 iPhone 17 或其他可用 iPhone。指定设备时执行 `IOS_SIMULATOR='设备名称或 UDID' pnpm run dev:ios`。
- 修改 Objective-C、Swift、Xcode 工程或其他原生代码后，重新执行 `pnpm run dev:ios`；原生依赖发生变化时先运行 `pnpm ios:pods`。
- Debug App 位于 `dist/ios/app/Debug-iphonesimulator/HybridApp.app`，Xcode 中间文件位于 `.cache/ios/DerivedData/`，构建日志位于 `.cache/ios/dev-build.log`。
- Debug 宿主从本机 8081 端口的 Metro `index` 入口加载，Metro 停止后不能继续加载或刷新 JavaScript。按 Ctrl-C 停止本次命令创建的 Metro 和构建进程；模拟器保持打开。

需要断点、原生控制台或 Xcode 调试器时，先运行 `pnpm --filter taro run dev:rn:ios` 单独启动 Metro，再执行 `pnpm ios:open`，在 Xcode 中选择 `HybridApp` scheme、Debug 配置和目标模拟器后 Run。真机 Debug 还需完成签名，并确保设备能够访问开发机的 Metro 地址。

排查 Debug 问题时按运行链路检查：

```sh
lsof -nP -iTCP:8081 -sTCP:LISTEN
tail -f .cache/ios/dev-build.log
xcrun simctl spawn booted log stream --level debug --predicate 'process == "HybridApp"'
```

- 8081 已被占用时，停止占用该端口的已有 Metro 或服务后再运行一键命令，避免连接到其他项目。
- 原生编译失败先查看 `.cache/ios/dev-build.log`；JavaScript 打包和 Fast Refresh 错误查看 Metro 终端；崩溃、原生异常和断点查看 Xcode 控制台或模拟器日志。
- 模拟器不可用时，在 Xcode Settings → Components 安装所需的 iOS Simulator runtime，并用 `xcrun simctl list devices available` 核对设备名称或 UDID。

## 构建交付物

- iOS RN bundle 和静态资源统一输出到仓库根目录 `dist/ios/bundle/`。
- 原生模拟器 Release App 输出到 `dist/ios/app/Release-iphonesimulator/`，开发模式 Debug App 输出到 `dist/ios/app/Debug-iphonesimulator/`。
- 真机归档输出到 `dist/ios/archive/`，签名安装包输出到 `dist/ios/ipa/`。
- 签名材料缺失时须明确记录未完成真机构建，不得以模拟器产物代替真机归档或 IPA。

## 构建命令

| 命令 | 行为 |
| --- | --- |
| `pnpm build:ios` | 仅编译 Taro RN bundle 和静态资源，不构建原生 App |
| `pnpm build:ios:app` | 先更新 RN bundle，再构建无需签名的 Release 模拟器 App |
| `pnpm build:ios:ipa` | 更新 RN bundle，使用 `iphoneos` 执行 Release Archive 并导出签名 IPA |

Debug 通过 Metro 加载 JavaScript，适合 Fast Refresh、JS 调试和原生断点；Release 将 `dist/ios/bundle/` 中的 `main.jsbundle` 与资源嵌入 App，可离线运行，不依赖 Metro。修改页面后验证 Release 时，必须重新运行 `pnpm build:ios` 或包含该步骤的 App/IPA 构建命令。

## 真机 IPA

构建 IPA 前，先在 Xcode 配置 Apple Developer 团队、有效证书及私钥、与 App ID 和目标设备匹配的描述文件。脚本使用本机已有材料进行自动签名，不会创建或更新开发者后台的签名资源。

```sh
# 注册设备的开发测试包
IOS_TEAM_ID=ABCDEFGHIJ IOS_BUNDLE_ID=com.example.hybrid pnpm build:ios:ipa

# Ad Hoc 测试分发包
IOS_TEAM_ID=ABCDEFGHIJ IOS_BUNDLE_ID=com.example.hybrid IOS_EXPORT_METHOD=release-testing pnpm build:ios:ipa
```

- `IOS_TEAM_ID` 必填，必须是 10 位 Apple Developer Team ID。
- `IOS_BUNDLE_ID` 可选，仅覆盖本次构建；省略时使用 Xcode 工程中的 Bundle Identifier。
- `IOS_EXPORT_METHOD` 默认为 `debugging`，可设为 `release-testing`；后者需要 Distribution 证书及 Ad Hoc 描述文件。
- 本机没有有效签名身份时，必须将 IPA 构建记为未完成；可用 `security find-identity -v -p codesigning` 检查。模拟器 `.app` 不能作为真机包，也不能通过压缩或改后缀转换成 IPA。
- 归档和导出先写入 `.cache/ios/`，全部成功后才更新 `dist/ios/archive/` 和 `dist/ios/ipa/`。失败后已有 IPA 可能仍是上次成功版本，不能据此判断本次构建成功。
