# iOS 宿主 App

`HybridApp` 是加载 `apps/taro` React Native 内容的原生 iOS 宿主，最低支持 iOS 13.4。原生入口沿用 [Taro 官方 RN 0.73 壳](https://github.com/NervJS/taro-native-shell/tree/0.73.0) 的 `EXAppDelegateWrapper` 接入方式，使用 RN 0.73.11、Expo 50 和 Hermes，关闭新架构及 Flipper。

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
pnpm dev:ios
pnpm ios:open
```

在 Xcode 选择 `HybridApp` scheme、一个 iOS Simulator，使用 Debug 运行。宿主从 Metro 的 `index` 入口加载，端口默认为 8081；Metro 通过 Taro 编译器处理页面和样式。模拟器使用本机 Metro；真机开发需设置开发服务器地址并保证网络可达。

## Release 与离线运行

```sh
pnpm build:ios
pnpm ios:open
```

`build:ios` 编译 `apps/taro` 页面，输出 `apps/ios/bundle/main.jsbundle` 和静态资源。Xcode 中编辑 scheme，将 Run 的 Build Configuration 设为 Release 后运行，或选择 Archive 归档。Release 从 App 内置 `main.jsbundle` 加载，不需要 Metro。

构建阶段 `嵌入 Taro RN bundle` 会复制 bundle 和所有资源到 App。缺少 bundle 时会直接失败，并提示先执行 `pnpm build:ios`。修改页面后需重新生成 bundle，再构建 Release；生成文件不提交。`build:ios` 不生成 `.app` / `.ipa`，原生编译由 Xcode 完成。

## 工程与配置

- `HybridApp/AppDelegate.mm`：RN 初始化、模块名、Debug/Release 加载入口。
- `HybridApp.xcodeproj`、`HybridApp.xcworkspace`：应用 target、共享 scheme、Pods 入口。
- `Podfile`、`Gemfile`：原生依赖和 CocoaPods 版本。
- `scripts/copy-bundle.sh`：Release 内置 RN 产物。
- `../taro/config/index.ts`：`rn.appName: HybridApp` 和 bundle 输出位置。
- `../taro/react-native.config.js`：RN CLI 定位原生宿主。

Bundle Identifier 初始为 `com.tuniu.hybrid`；真机运行和归档前，按实际 App 配置 Signing Team 与标识。宿主未配置业务权限；后续调用相机、定位、相册等能力时，需要在 Info.plist 增加对应用途说明，并在真机验证。

## 验证范围

RN bundle 构建、TypeScript、ESLint、H5/微信构建及 Xcode 工程结构检查可在仓库中执行。完成 Pods 安装后，还需要在目标 Xcode / iOS 版本上实际编译和运行 Debug、Release；JavaScript 打包成功不代表原生编译或设备运行已通过。
