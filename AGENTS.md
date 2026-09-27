# 项目规则入口

每次任务开始时读取[平台规则索引](.codex/PLATFORM_RULES.md)，再按任务涉及的平台读取对应规则文件。

项目开发、构建和运行需要在本机或目标平台准备的软件，统一记录在 [软件要求](docs/requirements.md)。新增、升级或删除这类软件时，同步更新该文档；`node_modules` 中的依赖以 `package.json` 和锁文件为准，无需写入软件要求。

所有项目的构建交付物统一放在仓库根目录 `dist/<App 或交付目标>/`，`dist` 的一级子目录直接区分交付目标，不增加 `taro` 等源码工程层级。当前 H5 使用 `dist/h5/`、微信小程序使用 `dist/weapp/`，其他 Taro 平台使用 `dist/<平台>/`；通用 RN Android 产物使用 `dist/rn/android/`，iOS RN bundle 和静态资源使用 `dist/ios/bundle/`，原生模拟器 App 使用 `dist/ios/app/Release-iphonesimulator/`，开发模式 Debug App 使用 `dist/ios/app/Debug-iphonesimulator/`，真机归档使用 `dist/ios/archive/`，签名安装包使用 `dist/ios/ipa/`。构建或清理一个交付目标时不得覆盖其他目录。可复用构建缓存与中间文件放在根目录 `.cache/`，工具强制生成的临时文件仍按工具约定忽略；构建产物和缓存均不提交。新增或修改构建入口时，同步更新输出配置、消费路径、忽略规则和文档，并通过实际构建核验产物位置；签名材料缺失时须明确记录未完成真机构建，不得以模拟器产物代替。
