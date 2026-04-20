# DingTalk Project Platform

面向钉钉生态的项目经营与战情大屏系统，覆盖：

- 项目主数据管理
- PM 周填报
- 供应商管理与效能
- 算法优化批次追踪
- 风险预警与 Blocker
- 管理层实时大屏

## 目录结构

```text
apps/
  api/    NestJS 后端
  web/    React + Vite + ECharts 大屏前端
docs/     部署与运维文档
infra/sql PostgreSQL 建表 SQL
```

## 快速开始

1. 安装 Node.js 20+
2. 在 `apps/api/.env.example` 和 `apps/web/.env.example` 基础上创建环境变量
3. 初始化数据库并执行 `infra/sql/001_schema.sql`
4. 如需本地演示效果，可一并加载 `infra/sql/002_seed_demo.sql`
5. 启动服务

```bash
/usr/bin/env bash -lc "docker compose up -d postgres"
/opt/homebrew/bin/npm install
/opt/homebrew/bin/npm run dev:api
/opt/homebrew/bin/npm run dev:web
```

## GitHub 仓库

```bash
git remote add origin git@github.com:waynethwww/Project_PLatform.git
```

详细部署见 [docs/deployment.md](/Users/abc/Documents/Project_Platform/docs/deployment.md)。
