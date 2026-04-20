# GitHub 维护说明

当前目标仓库：

```bash
git@github.com:waynethwww/Project_PLatform.git
```

## 初始化远端

```bash
git init
git remote add origin git@github.com:waynethwww/Project_PLatform.git
```

## 推荐提交流程

```bash
git checkout -b feat/dingtalk-project-platform
git add .
git commit -m "feat: scaffold dingtalk project platform"
git push -u origin feat/dingtalk-project-platform
```

## 推荐提交粒度

1. `feat: add postgres schema and dashboard domain model`
2. `feat: add dingtalk auth and organization sync api`
3. `feat: add realtime dashboard with time range filters`
4. `docs: add deployment and github maintenance guide`

## 维护建议

- 主干只保留可运行版本
- 大屏、填报、供应商、审批四类需求尽量分支开发
- 每次改动至少同步更新 `README` 与 `deployment.md`

