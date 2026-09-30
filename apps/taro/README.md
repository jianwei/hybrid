# Taro 应用

`apps/taro` 是 Hybrid pnpm monorepo 中的 Taro 子项目，使用 Taro 4.2.1、React 18.2.0、TypeScript 6.0.3 和 Webpack 5.91.0。依赖安装和锁文件由仓库根目录统一管理。

## 开发与构建

要求 Node.js 24.11 及以上版本、pnpm 12.3.4。以下命令均在仓库根目录执行：

```sh
pnpm install --frozen-lockfile --strict-peer-dependencies

pnpm dev:h5
pnpm dev:weapp

pnpm typecheck
pnpm lint

pnpm build:h5
pnpm build:weapp
```

根目录提供 H5、微信小程序和 iOS 快捷命令。运行其他平台脚本时使用：

```sh
pnpm --filter taro run dev:<平台>
pnpm --filter taro run build:<平台>
```

可用平台脚本以 `apps/taro/package.json` 为准。

## 目录与配置

```text
apps/taro/
├── config/                  # Taro 公共、开发和生产配置
├── src/
│   ├── app.config.ts       # 页面和应用级配置
│   ├── app.ts              # 应用入口
│   ├── index.html          # H5 HTML 模板
│   └── pages/index/        # 当前首页
├── types/                  # 项目全局类型
├── .env.development        # 开发环境变量
├── .env.production         # 生产环境变量
├── .env.test               # 测试环境变量
├── project.config.json     # 微信开发者工具项目配置
└── tsconfig.json           # TypeScript 配置
```

公共构建配置位于 `config/index.ts`，开发与生产差异分别位于 `config/dev.ts` 和 `config/prod.ts`。源码别名 `@` 指向 `src/`。

H5 和各小程序平台按 `TARO_ENV` 直接输出到仓库根目录 `dist/<平台>/`，例如 `dist/h5/`、`dist/weapp/`，不增加 `taro` 层级。开发 watch 使用同样的目录；不同平台构建互不覆盖。

H5 使用 History 路由，页面地址不包含 `#`。部署时需要把不存在的文件路径回退到 `index.html`，否则直接访问或刷新子页面会返回 404；静态资源路径不应被回退。

## Taroify

H5 与微信小程序已接入 `@taroify/core` 1.0.6，并通过 Babel 自动按需引入组件及其 Sass 样式：

```tsx
import { Button } from '@taroify/core'

<Button color="primary">提交</Button>
```

Taroify 官方支持范围为小程序与 H5，未声明支持 React Native。当前按需引入配置只对 H5 和微信小程序启用；参与 RN 或鸿蒙编译的共享源码不要引入 Taroify 组件。

## iOS React Native

`pnpm run dev:ios` 启动 Taro Metro、打开模拟器，并构建安装最新 Debug App；保持运行即可在源码修改后 Fast Refresh。只启动 Metro 可使用 `pnpm --filter taro run dev:rn:ios`。`pnpm build:ios` 生成根目录下的 `dist/ios/bundle/main.jsbundle` 与图片资源，供 iOS 宿主使用。`pnpm build:ios:app` 继续生成原生模拟器 App。`rn.appName` 必须与原生宿主的 `HybridApp` 模块名一致。通用 `build:rn` 的 Android 产物写入 `dist/rn/android/`。

`index.js` 与 `metro.config.js` 接入 Taro RN 编译器；Metro 的 `watchFolders` 覆盖 workspace 根目录以解析 pnpm 符号链接。iOS 开发和构建脚本直接调用 RN CLI 的 `start` / `bundle`，仍通过 Taro Metro transformer 编译；开发入口不使用 Taro 的交互式 TerminalReporter，便于编排脚本管理服务生命周期。

原生启动、依赖安装和 Release 运行方式见 [iOS 宿主说明](../ios/README.md)。

## 微信小程序 AppID

`project.config.json` 当前使用 Taro 模板占位值 `touristappid`，三个 `.env.*` 文件也只有 `TARO_APP_ID` 的注释示例。进行正式微信小程序调试或发布前，应在对应环境文件中配置有效的 `TARO_APP_ID`，然后重新构建并使用微信开发者工具打开 `dist/weapp/`。构建会在产物中生成 `miniprogramRoot: './'` 的项目配置；源码项目配置也已指向该产物目录。

## 依赖兼容范围

- Taro 4.2.1 的 `@tarojs/webpack5-runner`、`@tarojs/taro-loader` 和 `@tarojs/webpack5-prebundle` 将 Webpack peer 依赖精确约束为 5.91.0，因此不能直接升级到 Webpack 5.111.1。
- TypeScript 使用 6.0.3。TypeScript 7.0.2 虽可通过当前源码的类型检查，但与 Taro 的 ESLint 解析链不兼容。
- React 与 React DOM 固定 18.2.0，匹配 RN 0.73.11 的精确 React peer，同时满足 Taro 的 React 18 要求。
- RN 使用 Taro 4.2.1 官方壳对应的 RN 0.73、Expo 50 依赖组合。Stylelint 固定 16.4.0、standard 配置固定 36.0.1，避免 Taro RN 样式插件引用的内部函数在新版中被移除。
- `pnpm-workspace.yaml` 只为 Taro 内置旧 Ant Design RN / CameraRoll 的三条旧 peer 声明设置精确兼容例外，安装仍可使用严格 peer 检查。
- H5 生产目标包含 Android 4.1、iOS 8 等旧浏览器；构建配置会对依赖进行转译，真实设备兼容性仍需单独验证。

工作区管理、添加依赖和 Git hooks 约定见[仓库根目录说明](../../README.md)。
