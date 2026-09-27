# Taro 应用

`apps/taro` 是 Hybrid pnpm monorepo 中的 Taro 子项目，使用 Taro 4.2.1、React 18.3.1、TypeScript 6.0.3 和 Webpack 5.91.0。依赖安装和锁文件由仓库根目录统一管理。

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

根目录只为 H5 和微信小程序提供快捷命令。运行其他平台脚本时使用：

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

H5 和各小程序平台共用 `apps/taro/dist/`。切换目标平台前需要重新构建，后一次构建会覆盖前一次产物。

## 微信小程序 AppID

`project.config.json` 当前使用 Taro 模板占位值 `touristappid`，三个 `.env.*` 文件也只有 `TARO_APP_ID` 的注释示例。进行正式微信小程序调试或发布前，应在对应环境文件中配置有效的 `TARO_APP_ID`，然后重新构建并使用微信开发者工具打开 `apps/taro/`。

## 依赖兼容范围

- Taro 4.2.1 的 `@tarojs/webpack5-runner`、`@tarojs/taro-loader` 和 `@tarojs/webpack5-prebundle` 将 Webpack peer 依赖精确约束为 5.91.0，因此不能直接升级到 Webpack 5.111.1。
- TypeScript 使用 6.0.3。TypeScript 7.0.2 虽可通过当前源码的类型检查，但与 Taro 的 ESLint 解析链不兼容。
- React 保持 18.3.1，符合当前 Taro React 插件的兼容范围。
- H5 生产目标包含 Android 4.1、iOS 8 等旧浏览器；构建配置会对依赖进行转译，真实设备兼容性仍需单独验证。

工作区管理、添加依赖和 Git hooks 约定见[仓库根目录说明](../../README.md)。
