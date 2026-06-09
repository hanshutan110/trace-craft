# TraceCraft db 文档包

本文件夹用于放置数据库相关维护与设计清单，便于后续查错和交付追溯。

- [admin-schema.sql](admin-schema.sql)  
  最小可行后台（人员/内容/模板）建表与初始化 SQL（PostgreSQL）。

- [admin-api-design.md](admin-api-design.md)  
  人员管理、内容管理、模板管理 API 清单（含社区管理扩展）。

- [maintenance_checklist.md](maintenance_checklist.md)  
  数据库维护单：上线前检查、常见修复 SQL、回滚建议。

备注：  
- 以上 SQL 按最小可行设计，不直接改动现有 `routes/run_sessions` 主链路表。  
- 当前仓库 `.codex/agent.md` 已约束改动范围，后续若落库执行请先按 `maintenance_checklist.md` 做预检。
