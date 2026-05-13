# AGENTS.md

This file is the project-level operating guide for Codex and other coding agents working in `/Users/abc/Documents/Project_Platform`.

It combines three useful patterns:

- `AGENTS.md` as the stable carrier for repository rules.
- Context engineering / PRP as the way to turn vague requests into executable implementation briefs.
- Agentic engineering as a closed loop: inspect, plan, implement, verify, and report.

<!-- memory-connector:start -->
## Memory Connector

- 当前 Codex 可以使用 `memory_connector` MCP 工具作为长期记忆入口。
- 使用 memory connector 时，默认 `user_id` 为 `wangtianhao`；除非用户明确要求切换身份，否则保持这个用户上下文。
- 当用户表达需要回忆历史上下文、查找之前讨论、确认既有决策、延续项目背景或复盘长期偏好时，优先使用 memory recall/search。
- 开始重要任务前，先查询与当前项目、仓库路径、相关文件、任务目标、业务实体或历史决策有关的记忆；简单闲聊、纯格式化和用户明确要求不查记忆的场景可以跳过。
- 查询时优先使用具体线索，例如项目名、绝对路径、文件名、功能名、用户提到的人名/组织名/任务名；一次宽泛查询不够时，拆成多个聚焦查询。
- 回答时区分“记忆中查到的内容”和“当前仓库/本轮对话中看到的内容”；不要把猜测包装成记忆证据。
- 如果 memory 工具没有查到结果、结果不足或工具不可用，要明确说明边界，并继续基于当前可见上下文工作。
- 当用户明确说“记住、记录、以后记得”，或明确要求沉淀长期偏好/项目决策时，使用 memory 写入工具保存简洁、可复用的事实。
- 不要写入密钥、token、一次性临时日志、未经确认的猜测、敏感个人信息或用户明确不希望保存的内容。
- 如果 Codex 启动后提示 memory connector 未授权，先确保当前 shell 已 source `/Users/abc/.codex/memory_connector.env`。
<!-- memory-connector:end -->

## Project Snapshot

- Product: DingTalk-facing project operations platform for PM weekly reports, management dashboards, project master data, supplier/expert-network tracking, risk, blocker, and delivery views.
- Repository: `/Users/abc/Documents/Project_Platform`
- Frontend: React 18 + Vite + ECharts, under `apps/web`.
- Backend: NestJS 10, under `apps/api`.
- Storage: PostgreSQL schema in `infra/sql`, plus local runtime JSON stores under `apps/api/data` for current demo/dev workflows.
- Main pages:
  - `apps/web/src/pages/DashboardPage.tsx`
  - `apps/web/src/pages/PMWeeklyFormPage.tsx`
  - `apps/web/src/pages/ExpertNetworkFormPage.tsx`
- Main API modules:
  - `apps/api/src/dashboard`
  - `apps/api/src/pm-reports`
  - `apps/api/src/expert-network`
  - `apps/api/src/dingtalk`

## Operating Mode

Treat vague vibecoding requests as raw intent, then convert them into a concrete implementation loop.

1. Recall context: use memory when available, then read the current repository.
2. Restate the objective in implementation terms.
3. Identify the smallest safe change that satisfies the request.
4. Implement directly unless the requirement is genuinely ambiguous or risky.
5. Verify with the narrowest useful checks first, then broaden when the blast radius grows.
6. Report what changed, what was verified, and what remains risky.

Do not stop at a plan when the user is clearly asking for implementation. Keep going through code changes, verification, and a concise handoff.

## Context Gathering

Before changing code, inspect the local truth.

- Start with `git status --short --branch` so uncommitted user work is visible.
- Use `rg` / `rg --files` before slower search tools.
- Read existing files around the target behavior before editing.
- Prefer local patterns over new abstractions.
- If the task mentions "latest", GitHub, external libraries, docs, pricing, law, current events, or anything time-sensitive, verify online before answering.
- If a specific page, dataset, PDF, or external repo is referenced and its contents are not already provided, fetch or open it before relying on memory.

## Engineering Guardrails

- Keep edits scoped to the user request and the owning module.
- Do not revert user changes or unrelated dirty files.
- Do not run destructive git commands unless the user explicitly asks.
- Use `apply_patch` for manual file edits.
- Use structured APIs and typed data flow instead of ad hoc string manipulation where practical.
- Add abstractions only when they remove real duplication or match an established local pattern.
- Keep comments sparse and useful.
- Maintain TypeScript type safety; avoid `any` unless the surrounding code already forces it and the boundary is narrow.
- Preserve existing route contracts and runtime JSON shape unless the task explicitly changes them.

## Frontend Rules

This product is an operational tool, not a marketing site. Interfaces should be calm, dense, readable, and optimized for repeated PM work.

- Build the usable workflow as the first screen; do not add landing-page fluff.
- Reuse existing components such as `AppSelect`, `MetricCard`, `SectionCard`, and `TimeRangeBar` when they fit.
- Keep CSS in `apps/web/src/styles.css` unless the existing code already localizes a style elsewhere.
- Keep controls familiar:
  - selects for option sets,
  - inputs for search/text,
  - toggles/checkboxes for binary choices,
  - buttons only for clear commands.
- Avoid nested cards and decorative section cards. Use cards for repeated list items, modals, and framed tools.
- Text must not overflow, overlap, or become unreadable on mobile or desktop.
- Use stable dimensions for list rows, filter bars, buttons, and tool surfaces so hover/open/loading states do not shift layout.
- For PM pages, prioritize scanability: project name, PM, curve type, status, and next action should be easy to find.
- For dashboards, keep one-screen comparisons clear and separate 一曲线 from 二/三曲线 when their business metrics differ.

## Domain Rules

- 曲线类型 currently uses `一曲线`, `二曲线`, `三曲线`.
- 一曲线 is annotation/delivery oriented and commonly uses amount, delivery, supplier, quality, and annotation metrics.
- 二/三曲线 are private-deployment / people-day oriented and should avoid showing irrelevant annotation/supplier metrics unless the business rule changes.
- Project master data owns project id, project name, PM, curve type, annotation type, planned quantity, unit, contract amount, budget, supplier, and status.
- Project list search should support project name, project id, PM, and useful pinyin/keyword aliases when the UI requires fast lookup.
- Dictionary values must be maintained in one obvious place when possible. If a dropdown is reused, update both display labels and filtering/search keywords.
- Do not invent domain dictionary entries silently. If adding entries, keep them consistent between frontend options, API payloads, demo data, and normalization logic.

## Backend Rules

- Follow the NestJS module/controller/service shape already used in `apps/api/src`.
- Validate DTO boundaries with the existing `class-validator` approach.
- Keep persistence behavior compatible with current runtime JSON stores and PostgreSQL direction.
- When changing project fields, update:
  - frontend API types in `apps/web/src/lib/api.ts`,
  - backend DTO/types under `apps/api/src/pm-reports`,
  - demo/runtime normalization logic,
  - affected UI forms and dashboards.
- Keep error messages specific enough for debugging, but do not expose secrets.

## Verification Gates

Choose checks based on the change.

- Frontend-only change:
  - `/opt/homebrew/bin/npm run build:web`
  - Open `http://127.0.0.1:5173` or the relevant hash route when a dev server is available.
  - Visually verify desktop and mobile if layout changed.
- Backend-only change:
  - `/opt/homebrew/bin/npm run build:api`
  - Exercise the relevant `http://127.0.0.1:3000/api/...` endpoint when the API server is available.
- Cross-stack change:
  - `/opt/homebrew/bin/npm run build:api`
  - `/opt/homebrew/bin/npm run build:web`
  - Verify the API payload and the UI behavior that consumes it.
- Markdown/docs-only change:
  - Check links and paths.
  - Run `git diff --check` if whitespace-sensitive editing occurred.

If a browser or server verification cannot be completed, say exactly what was not verified and why.

## Git Workflow

- Default branch for this project is currently `dev`.
- Before committing, review `git status --short --branch` and `git diff --stat`.
- Stage only files related to the task.
- Commit messages should be short and conventional, for example:
  - `feat: add pm project filters`
  - `fix: refine annotation type dropdown`
  - `docs: add codex agent guide`
- Push to `origin dev` only when the user asks or when the task explicitly includes publishing.

## PRP Template For New Requests

When a request is larger than a small edit, first convert it into this structure internally. If the user asks for a written PRP, fill it out in Markdown.

```md
# PRP: <feature name>

## Objective
What user-visible outcome should exist when this is done?

## Current Context
- Relevant pages/components:
- Relevant API modules:
- Relevant data types/dictionaries:
- Current behavior:

## Requirements
- Must have:
- Should have:
- Out of scope:

## Examples To Follow
- Existing file/pattern:
- Similar UI/API behavior:

## Implementation Plan
1. Data/type changes
2. API/service changes
3. UI/component changes
4. Styling/layout changes
5. Migration/demo-data updates if needed

## Validation
- Build commands:
- Endpoint checks:
- Browser checks:
- Edge cases:

## Risks
- Potential regression:
- Ambiguity needing user confirmation:
```

## Ready-To-Paste Codex Prompt

Use this short prompt when starting a substantial task in this repository:

```md
你在 `/Users/abc/Documents/Project_Platform` 工作。先读取 `AGENTS.md`，再执行任务。

请按以下流程处理：
1. 先查 memory connector；如果不可用，说明边界后继续。
2. 运行 `git status --short --branch`，不要覆盖用户已有改动。
3. 用 `rg` 查找相关文件和既有模式。
4. 将我的需求转成最小可落地实现，直接改代码。
5. 前端体验要符合 PM 运营工具：信息密度高、控件清晰、移动端不溢出、不做营销页。
6. 修改后按影响范围运行 build / API / 浏览器验证。
7. 最后用中文简洁说明改了什么、验证了什么、还有什么风险。
```

## Reference Inspirations

- `AGENTS.md`: <https://github.com/agentsmd/agents.md>
- `claude-code-best-practice`: <https://github.com/shanraisshan/claude-code-best-practice>
- `context-engineering-intro`: <https://github.com/coleam00/context-engineering-intro>
- `awesome-design-md`: <https://github.com/VoltAgent/awesome-design-md>

