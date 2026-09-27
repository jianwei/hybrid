# Hybrid

Hybrid 是使用 pnpm workspace 管理的 monorepo。共享页面位于 `apps/taro`，iOS 原生宿主位于 `apps/ios`。

```text
hybrid/
├── apps/
│   ├── taro/               # Taro React 应用与 RN 依赖
│   └── ios/                # 加载 RN 内容的 iOS 宿主 App
├── dist/                   # 一级子目录直接对应 App 或交付目标
├── .cache/                 # 原生等构建工具的缓存与中间文件
├── package.json            # 根命令与 Node、pnpm 版本约束
├── pnpm-workspace.yaml     # workspace 范围与安装策略
└── pnpm-lock.yaml          # 全仓唯一锁文件
```

## 安装与开发

使用 Node.js 24.11 及以上版本、pnpm 12.3.4。以下命令均在仓库根目录执行：

```sh
pnpm install --frozen-lockfile --strict-peer-dependencies

pnpm dev:h5
pnpm dev:weapp

pnpm typecheck
pnpm lint

pnpm build:h5
pnpm build:weapp
```

本机内网源返回 502 时，可在安装命令追加 `--registry=https://registry.npmjs.org` 临时使用 npm 官方源。

根快捷命令当前指向 `taro` workspace。运行子项目未在根目录暴露的脚本时使用：

```sh
pnpm --filter taro run <脚本名>
```

Taro 的平台脚本、配置入口、构建产物和依赖兼容范围见 [Taro 应用说明](apps/taro/README.md)。

## iOS 宿主

首次按 [iOS 宿主说明](apps/ios/README.md) 安装 CocoaPods 依赖，然后执行：

```sh
pnpm dev:ios       # 启动 Taro Metro，供 Xcode Debug 加载
pnpm build:ios     # 编译内置的 iOS RN bundle 与资源
pnpm build:ios:app # 编译 bundle，再生成 Release 模拟器 App
pnpm ios:open      # 打开 HybridApp.xcworkspace
```

`build:ios` 只编译 JavaScript 和资源。`build:ios:app` 生成无签名的 Release 模拟器 App；真机运行和归档仍在 Xcode 中配置签名后执行。

## 构建产物

所有交付物统一放在仓库根目录 `dist/<App 或交付目标>/`，一级子目录直接使用 `h5`、`weapp`、`ios` 等交付目标，不增加源码工程层级，各目标互不覆盖：

| 命令 | 输出位置 |
| --- | --- |
| `pnpm build:h5` | `dist/h5/` |
| `pnpm build:weapp` | `dist/weapp/` |
| `pnpm build:ios` | `dist/ios/bundle/` |
| `pnpm build:ios:app` | `dist/ios/bundle/`、`dist/ios/app/Release-iphonesimulator/HybridApp.app` |

其他 Taro 平台使用 `dist/<平台>/`，通用 RN Android 产物使用 `dist/rn/android/`。iOS 原生脚本把 Xcode DerivedData 存在 `.cache/ios/DerivedData/`，成功后仅将 App 复制到交付目录。`dist/` 和 `.cache/` 均不提交。

## 工作区约定

- 全仓只维护根 `pnpm-lock.yaml` 和 `pnpm-workspace.yaml`；子项目不创建自己的锁文件或 workspace 配置。
- 为指定子项目添加运行依赖或开发依赖：

  ```sh
  pnpm --filter <workspace名称> add <依赖名>
  pnpm --filter <workspace名称> add -D <依赖名>
  ```

- 新应用放在 `apps/<应用名>/`，提供具有唯一 `name` 的 `package.json` 后，会由 `apps/*` 自动加入 workspace。
- 子项目保留自己的开发和构建脚本；只有全仓常用入口才在根 `package.json` 添加快捷命令。
- 安装脚本许可和最低发布时间例外统一维护在根 `pnpm-workspace.yaml`。
- `apps/taro/.husky` 与 commitlint 配置保留为未激活的模板；安装不会注册 Git hooks。以后需要启用时，再统一配置仓库级钩子。
