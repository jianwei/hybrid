# 项目规则入口

每次任务开始时读取[平台规则索引](.agents/PLATFORM_RULES.md)，再按任务涉及的平台读取对应规则文件；项目开发、构建和运行规则也统一从该索引进入。

以下规则覆盖整个项目，按任务触发条件显式读取，不限于 H5：

| 触发条件 | 必须读取的规则 |
| --- | --- |
| 新增、修改或评审界面、组件样式、主题或布局 | [UI 定制规则](.agents/agent-rules/ui-customization.md) |
| 新增、修改或评审文档，或变更用户可见的 API、配置、命令与行为 | [文档维护规则](.agents/agent-rules/documentation.md) |
| 新建、维护、评审或排查 Rspress 文档站 | [Rspress 规则](.agents/agent-rules/rspress.md) |
