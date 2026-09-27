# Taro React 项目

使用官方 Taro 4.2.1、React 18.3.1、TypeScript 6.0.3 和 Webpack 5.91.0。

## 开发与构建

使用 Node.js 24.11 及以上版本、pnpm 12.3.4。本机内网源返回 502 时，可使用下面的安装命令临时指定 npm 官方源。

```sh
pnpm install --frozen-lockfile --registry=https://registry.npmjs.org
pnpm dev:h5
pnpm dev:weapp
pnpm exec tsc --noEmit
pnpm exec eslint src config --ext .ts,.tsx
pnpm build:h5
pnpm build:weapp
```

各平台默认共用 `dist/`，切换平台构建会覆盖该目录。

## 依赖兼容范围

- Taro 4.2.1 的官方 `@tarojs/webpack5-runner` 将 Webpack peer 依赖精确约束为 `5.91.0`，因此使用该兼容版本，并非最新 Webpack 5。React 插件要求 React 18。
- 显式安装 Less 4 满足 Webpack runner 的 peer 依赖；页面样式继续使用 Sass。
- Babel 7、ESLint 8、React Hooks ESLint 插件 4、React Refresh 0.14 按 Taro 依赖约束选择兼容版本；Stylelint 已升级至 17。其他直接工具依赖在运行环境允许范围内更新。
- TypeScript 已升级至 6.0.3。TypeScript 7.0.2 的类型检查可通过，但当前 Taro ESLint 解析链会崩溃；最新解析器也尚未声明支持 TypeScript 7，因此保留已通过类型检查、ESLint 和双端构建的 6.0.3。
- H5 恢复模板的分环境 browserslist、生产环境依赖转译范围以及 Babel `useBuiltIns: 'usage'`。生产目标沿用 Android 4.1、iOS 8 等旧浏览器设置；真实旧设备兼容性仍需单独验证。
