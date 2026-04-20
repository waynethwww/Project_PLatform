# 部署指南

本文档对应当前仓库代码骨架，目标是把系统部署为：

- `前端大屏与填报端`：React H5
- `后端服务`：NestJS API
- `数据库`：PostgreSQL
- `接入方式`：钉钉企业内部应用 + H5 微应用

## 1. 钉钉侧准备

1. 在钉钉开放平台创建 `企业内部应用`
2. 开启以下能力
   - 免登
   - 通讯录读取
   - 机器人消息
   - 审批流
3. 配置应用首页地址
   - 开发环境：`https://your-web-domain`
   - 生产环境：`https://your-web-domain`
4. 记录以下参数
   - `AppKey`
   - `AppSecret`
   - `CorpId`
   - `AgentId`

官方参考：

- [钉钉教程中心](https://open.dingtalk.com/tutorial/)
- [开发一个H5微应用](https://open.dingtalk.com/document/tutorial/develop-h5-micro-applications)
- [开发一个钉钉机器人](https://open.dingtalk.com/document/tutorial/create-a-robot)
- [搭建审批工作流](https://open.dingtalk.com/document/tutorial/create-an-approval-task)

## 2. 本地开发部署

### 2.1 准备环境变量

复制并填写：

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 2.2 启动 PostgreSQL

```bash
docker compose up -d postgres
```

数据库初始化脚本会自动执行：

- [001_schema.sql](/Users/abc/Documents/Project_Platform/infra/sql/001_schema.sql)

### 2.3 安装依赖并启动

```bash
npm install
npm run dev:api
npm run dev:web
```

访问：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000/api`

## 3. 生产部署建议

建议部署形态：

1. `PostgreSQL`
   - GCP Cloud SQL for PostgreSQL
2. `API`
   - Cloud Run 或 GKE
3. `Web`
   - Cloud Run、Cloud Storage + CDN，或 Nginx
4. `Redis`
   - 二期接入，用于仪表盘缓存和消息去重

### 3.1 数据库上线

执行：

```bash
psql "$DATABASE_URL" -f infra/sql/001_schema.sql
```

### 3.2 构建镜像

```bash
docker build -f apps/api/Dockerfile -t project-platform-api .
docker build -f apps/web/Dockerfile -t project-platform-web .
```

### 3.3 API 环境变量

生产至少需要：

```bash
PORT=3000
DATABASE_URL=postgres://...
DINGTALK_APP_KEY=...
DINGTALK_APP_SECRET=...
DINGTALK_AGENT_ID=...
DINGTALK_CORP_ID=...
WEB_BASE_URL=https://your-web-domain
```

### 3.4 Web 环境变量

```bash
VITE_API_BASE_URL=https://your-api-domain/api
VITE_DINGTALK_CORP_ID=dingxxxxxxxx
```

## 4. 钉钉免登联调

前端逻辑文件：

- [dingtalk.ts](/Users/abc/Documents/Project_Platform/apps/web/src/lib/dingtalk.ts)

后端逻辑文件：

- [dingtalk.service.ts](/Users/abc/Documents/Project_Platform/apps/api/src/dingtalk/dingtalk.service.ts)

当前代码流转：

1. 前端通过钉钉 JSAPI 获取 `authCode`
2. 前端请求 `POST /api/dingtalk/login`
3. 后端用应用凭证获取 `access_token`
4. 后端用 `authCode` 换用户身份
5. 后端再取用户详情并返回前端

如果企业租户仍在使用旧版接口权限模型，需按钉钉应用权限范围补齐授权。

## 5. 组织架构同步

当前提供接口：

- `POST /api/dingtalk/sync/organization`

建议上线后改造为：

1. 定时任务每天同步一次部门与用户
2. 新员工或调岗场景按小时增量同步
3. 同步结果写入 `departments`、`users`、`user_departments`

## 6. 大屏时间筛选能力

前端页面：

- [DashboardPage.tsx](/Users/abc/Documents/Project_Platform/apps/web/src/pages/DashboardPage.tsx)

后端接口：

- `GET /api/dashboard/overview`
- `GET /api/dashboard/project-progress`
- `GET /api/dashboard/risk-trend`
- `GET /api/dashboard/cost-roi-trend`
- `GET /api/dashboard/supplier-trend`
- `GET /api/dashboard/algo-trend`

支持参数：

- `startDate`
- `endDate`
- `mode=latest|period`
- `curveType`

## 7. 推荐二期增强

1. 引入 Redis 做 dashboard 缓存
2. 将 `dashboard_period_agg` 改成定时物化表
3. 增加审批流与机器人回调处理
4. 把 PM 填报端做成多步骤工作流表单
5. 增加操作审计、字段级权限、导出中心

