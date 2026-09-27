# 平台规则索引

先明确任务涉及的运行环境和 Taro 编译目标；跨端任务读取所有相关规则，并标注平台专属能力、限制与验证范围。

涉及 `apps/taro` 的任务，先读 [Taro 通用规则](agent-rules/taro-common.md)，再读对应目标平台规则。下表列出 Taro 框架的目标平台；是否已接入当前工程，以 `apps/taro/package.json`、平台配置和实际构建结果为准。

Taro 页面运行在 iOS、Android 或鸿蒙客户端内时，还需读取对应客户端规则。

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
