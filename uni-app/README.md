# hybrid uni-app

基于 DCloud 官方 `uni-preset-vue#vite-ts` 模板初始化，使用 Vue 3、TypeScript、Vite 和 pnpm。

## 环境

- Node.js 20 或更高版本
- pnpm 10 或更高版本
- 微信开发者工具（运行微信小程序）
- HBuilderX（打包 iOS、Android 和鸿蒙 App）

## 安装

```sh
pnpm install --frozen-lockfile
```

`src/manifest.json` 中的通用 App `appid` 和微信小程序 `appid` 默认留空。正式运行或发布前，需要分别配置真实的 DCloud AppID 与微信小程序 AppID。

## 开发与构建

| 平台 | 开发 | 构建 | 产物 |
| --- | --- | --- | --- |
| H5 | `pnpm dev:h5` | `pnpm build:h5` | `dist/build/h5` |
| 微信小程序 | `pnpm dev:mp-weixin` | `pnpm build:mp-weixin` | `dist/build/mp-weixin` |
| iOS / Android App | `pnpm dev:app` | `pnpm build:app` | `dist/build/app`（wgt 资源） |
| 鸿蒙 App | `pnpm dev:app-harmony` | `pnpm build:app-harmony` | `dist/build/app-harmony`（HBuilderX 工程资源） |
| 鸿蒙元服务 | `pnpm dev:mp-harmony` | `pnpm build:mp-harmony` | `dist/build/mp-harmony` |

CLI 的 `app` 目标生成 App 资源，不能直接生成 Android APK 或 iOS IPA。原生安装包需要在 HBuilderX 中运行或发行。

鸿蒙 App 与鸿蒙元服务是两个不同目标。`app-harmony` 生成鸿蒙 App 工程资源，仍需使用 HBuilderX 完成运行或发行；`mp-harmony` 构建的是鸿蒙元服务，不是鸿蒙 App。

## 质量检查

```sh
pnpm type-check
pnpm build:h5
pnpm build:mp-weixin
pnpm build:app
pnpm build:app-harmony
pnpm build:mp-harmony
```
