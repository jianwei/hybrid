# 平台规则索引

先明确任务涉及的运行环境和 Taro 编译目标；跨端任务读取所有相关规则，并标注平台专属能力、限制与验证范围。

涉及 `apps/taro` 的任务，先读 [Taro 通用规则](agent-rules/taro-common.md)，再读对应目标平台规则。下表列出 Taro 框架的目标平台；是否已接入当前工程，以 `apps/taro/package.json`、平台配置和实际构建结果为准。

Taro 页面运行在 iOS、Android 或鸿蒙客户端内时，还需读取对应客户端规则。

## 开发、构建和运行

项目开发、构建和运行需要在本机或目标平台准备的软件，统一记录在 [软件要求](../docs/requirements.md)。新增、升级或删除这类软件时，同步更新该文档；`node_modules` 中的依赖以 `package.json` 和锁文件为准，无需写入软件要求。

所有项目的构建交付物统一放在仓库根目录 `dist/<App 或交付目标>/`，`dist` 的一级子目录直接区分交付目标，不增加 `taro` 等源码工程层级。当前 H5 使用 `dist/h5/`、微信小程序使用 `dist/weapp/`，其他 Taro 平台使用 `dist/<平台>/`；通用 RN Android 产物使用 `dist/rn/android/`，iOS 交付物目录遵循 [iOS 规则](agent-rules/ios.md)。构建或清理一个交付目标时不得覆盖其他目录。可复用构建缓存与中间文件放在根目录 `.cache/`，工具强制生成的临时文件仍按工具约定忽略；构建产物和缓存均不提交。新增或修改构建入口时，同步更新输出配置、消费路径、忽略规则和文档，并通过实际构建核验产物位置。

## 客户端运行环境

| 平台 | 规则文件 |
| --- | --- |
| iOS | [iOS 规则](agent-rules/ios.md) |
| Android | [Android 规则](agent-rules/android.md) |
| 鸿蒙 | [鸿蒙规则](agent-rules/harmonyos.md) |

## Taro 编译目标

| 平台 | 规则文件 |
| --- | --- |
| H5 | [H5 规则](agent-rules/h5.md) |
| React Native | [React Native 规则](agent-rules/react-native.md) |
| 微信小程序 | [微信小程序规则](agent-rules/weapp.md) |
| 京东小程序 | [京东小程序规则](agent-rules/jd.md) |
| 百度智能小程序 | [百度智能小程序规则](agent-rules/swan.md) |
| 支付宝小程序 | [支付宝小程序规则](agent-rules/alipay.md) |
| 抖音小程序 | [抖音小程序规则](agent-rules/douyin.md) |
| QQ 小程序 | [QQ 小程序规则](agent-rules/qq.md) |
| 钉钉小程序 | [钉钉小程序规则](agent-rules/dingtalk.md) |
| 企业微信小程序 | [企业微信小程序规则](agent-rules/wecom.md) |
| 支付宝 IOT 小程序 | [支付宝 IOT 小程序规则](agent-rules/alipay-iot.md) |
| 飞书小程序 | [飞书小程序规则](agent-rules/feishu.md) |
| 快手小程序 | [快手小程序规则](agent-rules/kuaishou.md) |
| ASCF 元服务 | [ASCF 元服务规则](agent-rules/ascf.md) |
