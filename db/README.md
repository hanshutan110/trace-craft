# TraceCraft db 文档包

本文件夹用于放置数据库相关维护与设计清单，便于后续查错和交付追溯。

- [admin-schema.sql](admin-schema.sql)
  最小可行后台（人员/内容/模板）建表与初始化 SQL（PostgreSQL）。

- [feature-precreate-schema.sql](feature-precreate-schema.sql)
  MVP 完整 PostgreSQL schema：核心用户/路线/会话、快捷登录身份、后台管理、模板库、收藏、搜索、社区、通知、分享、用户资产、反馈。

- [admin-api-design.md](admin-api-design.md)
  人员管理、内容管理、模板管理 API 清单（含社区管理扩展）。

- [maintenance_checklist.md](maintenance_checklist.md)
  数据库维护单：上线前检查、常见修复 SQL、回滚建议。

备注：
- 以上 SQL 按最小可行设计，不直接改动现有 `routes/run_sessions` 主链路表。
- `feature-precreate-schema.sql` 已执行到 VM PostgreSQL（`192.168.252.128` / `tracecraft-postgres` / `tracecraft`）；后续结构调整仍需确认目标环境、完整 SQL、影响范围与回滚方式。
- 当前仓库 `.codex/AGENTS.md` 已约束改动范围，后续若落库执行请先按 `maintenance_checklist.md` 做预检。
