CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE departments (
  id BIGSERIAL PRIMARY KEY,
  dingtalk_dept_id BIGINT UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  parent_dingtalk_dept_id BIGINT,
  dept_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dingtalk_user_id VARCHAR(128) UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(255),
  mobile VARCHAR(64),
  job_title VARCHAR(128),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_departments (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, department_id)
);

CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL
);

INSERT INTO roles (code, name)
VALUES
  ('ceo', '老板/高管'),
  ('director', '项目总监'),
  ('pm', '项目经理'),
  ('supplier_ops', '供应商运营'),
  ('algo_owner', '算法负责人'),
  ('finance', '经营/财务'),
  ('admin', '系统管理员')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_project_id VARCHAR(128) UNIQUE NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  curve_type VARCHAR(32) NOT NULL,
  project_type VARCHAR(64),
  annotation_types TEXT[] NOT NULL DEFAULT '{}',
  pm_user_id UUID REFERENCES users(id),
  department_id BIGINT REFERENCES departments(id),
  contract_amount NUMERIC(16, 4) NOT NULL DEFAULT 0,
  budget_total NUMERIC(16, 4) NOT NULL DEFAULT 0,
  planned_qty NUMERIC(18, 4),
  qty_unit VARCHAR(32),
  planned_person_days NUMERIC(16, 2),
  actual_person_days_used NUMERIC(16, 2) NOT NULL DEFAULT 0,
  cloud_cost NUMERIC(16, 4) NOT NULL DEFAULT 0,
  internal_labor_cost NUMERIC(16, 4) NOT NULL DEFAULT 0,
  external_procurement_cost NUMERIC(16, 4) NOT NULL DEFAULT 0,
  other_cost NUMERIC(16, 4) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT '执行中',
  risk_note TEXT,
  pm_comment TEXT,
  deal_close_date DATE,
  planned_start_date DATE,
  actual_start_date DATE,
  planned_end_date DATE,
  actual_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_curve_type ON projects(curve_type);
CREATE INDEX idx_projects_pm_user_id ON projects(pm_user_id);
CREATE INDEX idx_projects_status ON projects(status);

CREATE TABLE project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255) NOT NULL,
  milestone_status VARCHAR(32) NOT NULL DEFAULT '未开始',
  milestone_plan_date DATE,
  milestone_actual_date DATE,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_weekly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  progress_pct NUMERIC(7, 4),
  actual_qty NUMERIC(18, 4),
  weekly_delivery_amount NUMERIC(16, 4),
  amount_delivered NUMERIC(16, 4),
  cost_consumed NUMERIC(16, 4),
  quality_pass NUMERIC(7, 4),
  client_score NUMERIC(6, 2),
  risk_level VARCHAR(16),
  risk_desc TEXT,
  pm_comment TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, snapshot_date)
);

CREATE INDEX idx_project_weekly_snapshots_project_date
  ON project_weekly_snapshots(project_id, snapshot_date DESC);

CREATE TABLE project_blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  blocker_title VARCHAR(255) NOT NULL,
  blocker_desc TEXT,
  blocker_owner_user_id UUID REFERENCES users(id),
  severity VARCHAR(16) NOT NULL DEFAULT 'medium',
  blocker_status VARCHAR(32) NOT NULL DEFAULT 'open',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  risk_level VARCHAR(16) NOT NULL,
  risk_desc TEXT NOT NULL,
  impact_scope TEXT,
  suggested_action TEXT,
  owner_user_id UUID REFERENCES users(id),
  target_resolve_date DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  source VARCHAR(64) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_risks_level_status ON project_risks(risk_level, status);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code VARCHAR(64) UNIQUE NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  supplier_level VARCHAR(32),
  supplier_owner_user_id UUID REFERENCES users(id),
  supplier_region VARCHAR(64),
  preferred_annotation_types TEXT[] NOT NULL DEFAULT '{}',
  settlement_cycle VARCHAR(64),
  contract_status VARCHAR(32),
  quotation_status VARCHAR(32),
  entry_status VARCHAR(32) NOT NULL DEFAULT 'active',
  tax_rate NUMERIC(7, 4),
  capacity_upper_limit NUMERIC(16, 2),
  blacklist_flag BOOLEAN NOT NULL DEFAULT FALSE,
  supplier_score NUMERIC(8, 2),
  replacement_recommendation BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE supplier_project_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  annotation_type VARCHAR(64),
  unit_price_cny NUMERIC(16, 4),
  benchmark_unit_price NUMERIC(16, 4),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (supplier_id, project_id, annotation_type)
);

CREATE TABLE supplier_weekly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_week DATE NOT NULL,
  annotation_type VARCHAR(64),
  completion_cycle_days NUMERIC(16, 2),
  headcount NUMERIC(16, 2),
  working_days NUMERIC(16, 2),
  total_person_days NUMERIC(16, 2),
  output_qty NUMERIC(18, 4),
  unit_price_cny NUMERIC(16, 4),
  total_payout NUMERIC(16, 4),
  quality_pass NUMERIC(7, 4),
  otd_rate NUMERIC(7, 4),
  rework_qty NUMERIC(16, 4),
  market_benchmark NUMERIC(16, 4),
  supplier_cooperation NUMERIC(8, 2),
  profit_flag VARCHAR(32),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplier_weekly_metrics_snapshot_week
  ON supplier_weekly_metrics(snapshot_week DESC);

CREATE TABLE algo_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_batch_id VARCHAR(128) UNIQUE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  annotation_type VARCHAR(64),
  batch_date DATE NOT NULL,
  algo_version VARCHAR(128),
  algo_output_qty NUMERIC(18, 4),
  human_modified NUMERIC(18, 4),
  human_added NUMERIC(18, 4),
  human_deleted NUMERIC(18, 4),
  modification_rate NUMERIC(8, 4),
  time_before_min NUMERIC(16, 4),
  time_after_min NUMERIC(16, 4),
  time_save_pct NUMERIC(8, 4),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_algo_batches_batch_date ON algo_batches(batch_date DESC);

CREATE TABLE pm_hour_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pm_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  annotation_types VARCHAR(64),
  hours_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pm_hourly_cost NUMERIC(12, 2),
  week_cost_cny NUMERIC(16, 4),
  accum_hours NUMERIC(16, 2),
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, pm_user_id, week_start)
);

CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  approval_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  applicant_user_id UUID REFERENCES users(id),
  approver_user_id UUID REFERENCES users(id),
  reason TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dashboard_period_agg (
  id BIGSERIAL PRIMARY KEY,
  period_type VARCHAR(16) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  dimension_type VARCHAR(32) NOT NULL,
  dimension_key VARCHAR(128) NOT NULL,
  metric_code VARCHAR(64) NOT NULL,
  metric_value NUMERIC(18, 4),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboard_period_agg_lookup
  ON dashboard_period_agg(period_type, period_start, period_end, dimension_type, dimension_key);

CREATE VIEW project_latest_snapshot AS
SELECT DISTINCT ON (project_id)
  id,
  project_id,
  snapshot_date,
  progress_pct,
  actual_qty,
  weekly_delivery_amount,
  amount_delivered,
  cost_consumed,
  quality_pass,
  client_score,
  risk_level,
  risk_desc,
  pm_comment,
  created_by,
  created_at,
  updated_at
FROM project_weekly_snapshots
ORDER BY project_id, snapshot_date DESC;

