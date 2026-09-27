# Taro 通用规则

适用于 `apps/taro` 的共享页面和组件；平台特有行为另读对应目标平台规则。

## 开发

- 页面沿用项目的 Taro、React、TypeScript（TSX）结构；新增页面放在 `src/pages/`，并在 `src/app.config.ts` 注册。跨端页面优先使用 `@tarojs/components` 和 `@tarojs/taro`。
- 页面主容器及内容区域使用 Flex 布局；跨端页面显式设置需要的 `flex-direction`，并核对各目标平台的实际布局。
- 页面和组件样式使用 Sass；局部样式使用 CSS Modules（`*.module.scss`）隔离，全局样式仅用于确需全局生效的规则。使用 CSS Modules 前，确认目标平台支持并启用对应配置，验证构建产物中的类名映射。

## 验证

- 在仓库根目录运行 `pnpm typecheck` 和 `pnpm lint`；按 `apps/taro/package.json` 中目标平台的脚本分别构建，并在目标环境验证。脚本存在不等于平台已可用。
- `apps/taro/dist/` 由各平台构建共用；检查产物前确认最后一次构建的目标平台。共享代码变更需验证所有受影响的平台。
