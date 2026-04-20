INSERT INTO departments (dingtalk_dept_id, name, parent_dingtalk_dept_id, dept_path)
VALUES
  (100, '项目管理中心', 1, '总部/项目管理中心'),
  (200, '交付运营中心', 1, '总部/交付运营中心')
ON CONFLICT (dingtalk_dept_id) DO NOTHING;

INSERT INTO users (dingtalk_user_id, name, email, mobile, job_title)
VALUES
  ('u_director', '王天浩', 'director@example.com', '13800000001', '项目总监'),
  ('u_pm_1', '李仕伟', 'lishiwei@example.com', '13800000002', '项目经理'),
  ('u_pm_2', '张艺缤', 'zhangyibin@example.com', '13800000003', '项目经理'),
  ('u_pm_3', '冯德隆', 'fengdelong@example.com', '13800000004', '项目经理'),
  ('u_pm_4', '郑威格', 'zhengweige@example.com', '13800000005', '项目经理'),
  ('u_supplier', '供应商运营', 'supplier.ops@example.com', '13800000006', '供应商运营'),
  ('u_algo', '算法负责人', 'algo@example.com', '13800000007', '算法负责人'),
  ('u_finance', '经营分析', 'finance@example.com', '13800000008', '经营分析')
ON CONFLICT (dingtalk_user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON (
  (u.dingtalk_user_id = 'u_director' AND r.code = 'director') OR
  (u.dingtalk_user_id IN ('u_pm_1', 'u_pm_2', 'u_pm_3', 'u_pm_4') AND r.code = 'pm') OR
  (u.dingtalk_user_id = 'u_supplier' AND r.code = 'supplier_ops') OR
  (u.dingtalk_user_id = 'u_algo' AND r.code = 'algo_owner') OR
  (u.dingtalk_user_id = 'u_finance' AND r.code = 'finance')
)
ON CONFLICT DO NOTHING;

INSERT INTO projects (
  id,
  external_project_id,
  project_name,
  curve_type,
  project_type,
  annotation_types,
  pm_user_id,
  department_id,
  contract_amount,
  budget_total,
  planned_qty,
  qty_unit,
  planned_person_days,
  actual_person_days_used,
  cloud_cost,
  internal_labor_cost,
  external_procurement_cost,
  other_cost,
  status,
  risk_note,
  pm_comment,
  planned_start_date,
  actual_start_date,
  planned_end_date
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '3805',
    'ZBZ32-语义分割',
    '一曲线',
    '数据标注',
    ARRAY['点云分割'],
    (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_1'),
    (SELECT id FROM departments WHERE dingtalk_dept_id = 100),
    82.3002,
    104.0,
    128000,
    '帧',
    NULL,
    0,
    6.8,
    28.5,
    48.7,
    0.0,
    '执行中',
    '合同单价偏低，重点跟踪成本',
    '算法优化中，关注交付质量',
    '2026-03-01',
    '2026-03-01',
    '2026-07-01'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '40',
    'zbz32-车道线',
    '一曲线',
    '数据标注',
    ARRAY['4D车道线'],
    (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_2'),
    (SELECT id FROM departments WHERE dingtalk_dept_id = 100),
    67.7821,
    50.8,
    9000,
    '包',
    NULL,
    0,
    2.0,
    8.5,
    19.5,
    0.0,
    '执行中',
    '通过率偏低',
    '供应商培训中',
    '2026-01-15',
    '2026-01-15',
    '2026-12-31'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '17',
    'Prosper-AGV',
    '一曲线',
    '数据标注',
    ARRAY['2D框'],
    (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_3'),
    (SELECT id FROM departments WHERE dingtalk_dept_id = 200),
    20.0,
    12.0,
    30000,
    '帧',
    NULL,
    0,
    0.5,
    0.7,
    0.8,
    0.0,
    '执行中',
    '供应商稳定性风险',
    '需商务介入',
    '2026-03-10',
    '2026-03-10',
    '2026-12-30'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'P001',
    'MIKE-沃尔玛智能电商营销',
    '三曲线',
    '平台交付',
    ARRAY['里程碑'],
    (SELECT id FROM users WHERE dingtalk_user_id = 'u_director'),
    (SELECT id FROM departments WHERE dingtalk_dept_id = 100),
    340.0,
    0,
    NULL,
    '里程碑',
    200,
    242.8,
    16.0,
    62.0,
    0.0,
    0.0,
    '执行中',
    '人天超耗',
    '需求收敛中',
    '2025-11-03',
    '2025-11-01',
    '2026-04-30'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'P002',
    'Mary',
    '二曲线',
    '私有化部署',
    ARRAY['里程碑'],
    (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_4'),
    (SELECT id FROM departments WHERE dingtalk_dept_id = 100),
    0,
    0,
    NULL,
    '里程碑',
    1200,
    1548.7,
    28.0,
    105.0,
    0.0,
    0.0,
    '执行中',
    '算法与格式适配双重风险',
    '后端与算法联合排查',
    '2025-03-06',
    '2025-03-06',
    '2025-10-31'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'P004',
    '大唐poc',
    '二曲线',
    'POC',
    ARRAY['里程碑'],
    (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_4'),
    (SELECT id FROM departments WHERE dingtalk_dept_id = 100),
    90.0,
    0,
    NULL,
    '里程碑',
    15,
    24.9,
    1.0,
    6.5,
    0.0,
    0.0,
    '执行中',
    '超耗',
    '项目压缩范围中',
    '2026-04-01',
    '2026-04-01',
    '2026-04-25'
  )
ON CONFLICT (external_project_id) DO NOTHING;

INSERT INTO project_weekly_snapshots (
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
  created_by
)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2026-03-27', 0.75, 96580, 5.0640, 58.9000, 83.1500, 0.82, 4.0, '红', '成本超标', '关注单价与算法提效', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_1')),
  ('a1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '2026-04-03', 0.79, 101000, 4.8000, 63.7000, 86.3000, 0.84, 4.1, '黄', '质量有改善但成本仍高', '持续观察', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_1')),
  ('a1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', '2026-04-10', 0.83, 108300, 6.3000, 70.0000, 88.4000, 0.88, 4.2, '黄', '成本趋稳', '等待新模型上线', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_1')),
  ('a1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', '2026-04-17', 0.87, 113500, 7.1000, 77.1000, 91.2000, 0.91, 4.4, '绿', '恢复健康', '算法上线后人效提升', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_1')),

  ('a2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', '2026-03-27', 0.50, 1283, 13.6300, 29.9948, 4.0000, 0.62, 3.0, '黄', '通过率低', '供应商培训中', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_2')),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '2026-04-03', 0.56, 1550, 8.2000, 38.1000, 5.1000, 0.70, 3.3, '黄', '质量提升中', '客户侧标准澄清中', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_2')),
  ('a2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', '2026-04-10', 0.63, 2100, 11.1000, 49.2000, 6.8000, 0.79, 3.8, '黄', '接近目标线', '重点盯质量', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_2')),
  ('a2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', '2026-04-17', 0.72, 2960, 9.3000, 58.5000, 8.1000, 0.86, 4.1, '绿', '恢复在控', '效率继续拉升', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_2')),

  ('a3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', '2026-03-27', 0.00, 1895, 0.0000, 2.5000, 0.7700, 0.40, 2.5, '红', '产出极低，通过率低', '商务跟进中', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_3')),
  ('a3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', '2026-04-03', 0.05, 3200, 0.1000, 2.8000, 1.1000, 0.52, 2.6, '红', '供应商磨合慢', '暂未解除风险', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_3')),
  ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '2026-04-10', 0.10, 6200, 0.1800, 3.6000, 1.7000, 0.63, 2.9, '黄', '质量改善中', '继续商务陪跑', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_3')),
  ('a3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', '2026-04-17', 0.18, 9800, 0.3000, 4.8000, 2.3000, 0.74, 3.2, '黄', '仍需继续提升', '供应商阶段性在控', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_3')),

  ('a4444444-4444-4444-4444-444444444441', '44444444-4444-4444-4444-444444444444', '2026-03-27', 0.80, NULL, 0.0000, 0.0000, 242.8000, 0.00, 0.0, '红', '人天超耗', '控制需求范围', (SELECT id FROM users WHERE dingtalk_user_id = 'u_director')),
  ('a4444444-4444-4444-4444-444444444442', '44444444-4444-4444-4444-444444444444', '2026-04-10', 0.86, NULL, 0.0000, 0.0000, 248.6000, 0.00, 0.0, '黄', '超耗收敛中', '减少非关键需求', (SELECT id FROM users WHERE dingtalk_user_id = 'u_director')),
  ('a4444444-4444-4444-4444-444444444443', '44444444-4444-4444-4444-444444444444', '2026-04-17', 0.90, NULL, 0.0000, 0.0000, 252.0000, 0.00, 0.0, '黄', '仍高于应耗人天', '持续压需求', (SELECT id FROM users WHERE dingtalk_user_id = 'u_director')),

  ('a5555555-5555-5555-5555-555555555551', '55555555-5555-5555-5555-555555555555', '2026-03-27', 0.80, NULL, 0.0000, 0.0000, 1548.7000, 0.00, 0.0, '红', '算法/后端联动风险', '紧急排查中', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_4')),
  ('a5555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555555', '2026-04-10', 0.82, NULL, 0.0000, 0.0000, 1562.0000, 0.00, 0.0, '红', '仍有超耗和适配风险', '本周复盘', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_4')),
  ('a5555555-5555-5555-5555-555555555553', '55555555-5555-5555-5555-555555555555', '2026-04-17', 0.86, NULL, 0.0000, 0.0000, 1580.0000, 0.00, 0.0, '黄', '风险下降', '继续推进治理', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_4')),

  ('a6666666-6666-6666-6666-666666666661', '66666666-6666-6666-6666-666666666666', '2026-04-03', 0.55, NULL, 0.0000, 0.0000, 18.6000, 0.00, 0.0, '黄', '超耗风险', '压缩范围', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_4')),
  ('a6666666-6666-6666-6666-666666666662', '66666666-6666-6666-6666-666666666666', '2026-04-10', 0.72, NULL, 0.0000, 0.0000, 21.4000, 0.00, 0.0, '红', '已超耗', '需项目总监介入', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_4')),
  ('a6666666-6666-6666-6666-666666666663', '66666666-6666-6666-6666-666666666666', '2026-04-17', 0.82, NULL, 0.0000, 0.0000, 24.9000, 0.00, 0.0, '红', '超耗未解除', '尽快结项', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_4'))
ON CONFLICT (project_id, snapshot_date) DO NOTHING;

INSERT INTO suppliers (
  supplier_code,
  supplier_name,
  supplier_level,
  supplier_owner_user_id,
  supplier_region,
  preferred_annotation_types,
  settlement_cycle,
  contract_status,
  quotation_status,
  entry_status,
  tax_rate,
  capacity_upper_limit,
  supplier_score
)
VALUES
  ('SUP-A', '供应商甲', 'A', (SELECT id FROM users WHERE dingtalk_user_id = 'u_supplier'), '华北', ARRAY['点云分割', '4D车道线'], '月结', '生效中', '已报价', 'active', 0.06, 60, 88.0),
  ('SUP-B', '供应商乙', 'B', (SELECT id FROM users WHERE dingtalk_user_id = 'u_supplier'), '华东', ARRAY['2D框'], '双周结', '生效中', '已报价', 'active', 0.06, 35, 75.0)
ON CONFLICT (supplier_code) DO NOTHING;

INSERT INTO supplier_project_bindings (supplier_id, project_id, annotation_type, unit_price_cny, benchmark_unit_price, status)
VALUES
  ((SELECT id FROM suppliers WHERE supplier_code = 'SUP-A'), '11111111-1111-1111-1111-111111111111', '点云分割', 135, 128, 'active'),
  ((SELECT id FROM suppliers WHERE supplier_code = 'SUP-A'), '22222222-2222-2222-2222-222222222222', '4D车道线', 168, 160, 'active'),
  ((SELECT id FROM suppliers WHERE supplier_code = 'SUP-B'), '33333333-3333-3333-3333-333333333333', '2D框', 95, 90, 'active')
ON CONFLICT (supplier_id, project_id, annotation_type) DO NOTHING;

INSERT INTO supplier_weekly_metrics (
  supplier_id,
  project_id,
  snapshot_week,
  annotation_type,
  completion_cycle_days,
  headcount,
  working_days,
  total_person_days,
  output_qty,
  unit_price_cny,
  total_payout,
  quality_pass,
  otd_rate,
  rework_qty,
  market_benchmark,
  supplier_cooperation,
  profit_flag,
  notes
)
VALUES
  ((SELECT id FROM suppliers WHERE supplier_code = 'SUP-A'), '11111111-1111-1111-1111-111111111111', '2026-04-10', '点云分割', 5, 12, 5, 60, 52000, 135, 81.0, 0.91, 0.88, 600, 128, 86, '观察', '质量稳定，成本偏高'),
  ((SELECT id FROM suppliers WHERE supplier_code = 'SUP-A'), '22222222-2222-2222-2222-222222222222', '2026-04-10', '4D车道线', 4, 10, 5, 50, 1800, 168, 30.2, 0.79, 0.74, 180, 160, 81, '风险', '需强化培训'),
  ((SELECT id FROM suppliers WHERE supplier_code = 'SUP-B'), '33333333-3333-3333-3333-333333333333', '2026-04-10', '2D框', 7, 6, 5, 30, 9800, 95, 9.5, 0.74, 0.70, 300, 90, 68, '风险', '产能不稳定'),
  ((SELECT id FROM suppliers WHERE supplier_code = 'SUP-A'), '11111111-1111-1111-1111-111111111111', '2026-04-17', '点云分割', 5, 12, 5, 60, 61000, 135, 94.5, 0.94, 0.91, 420, 128, 90, '健康', '质量与准时率提升'),
  ((SELECT id FROM suppliers WHERE supplier_code = 'SUP-A'), '22222222-2222-2222-2222-222222222222', '2026-04-17', '4D车道线', 4, 10, 5, 50, 2400, 168, 40.3, 0.86, 0.83, 110, 160, 85, '观察', '逐步恢复'),
  ((SELECT id FROM suppliers WHERE supplier_code = 'SUP-B'), '33333333-3333-3333-3333-333333333333', '2026-04-17', '2D框', 7, 8, 5, 40, 15000, 95, 14.2, 0.83, 0.79, 160, 90, 77, '观察', '商务陪跑后改善')
ON CONFLICT DO NOTHING;

INSERT INTO algo_batches (
  external_batch_id,
  project_id,
  annotation_type,
  batch_date,
  algo_version,
  algo_output_qty,
  human_modified,
  human_added,
  human_deleted,
  modification_rate,
  time_before_min,
  time_after_min,
  time_save_pct,
  created_by
)
VALUES
  ('AB-001', '11111111-1111-1111-1111-111111111111', '点云分割', '2026-03-18', 'v2.0', 1400, 280, 70, 70, 0.30, 9, 7, 0.2222, (SELECT id FROM users WHERE dingtalk_user_id = 'u_algo')),
  ('AB-002', '22222222-2222-2222-2222-222222222222', '4D车道线', '2026-03-19', 'v1.1', 700, 350, 105, 70, 0.75, 10, 9.5, 0.0500, (SELECT id FROM users WHERE dingtalk_user_id = 'u_algo')),
  ('AB-003', '33333333-3333-3333-3333-333333333333', '2D框', '2026-04-10', 'v1.3', 10000, 800, 100, 100, 0.10, 6, 3.9, 0.3500, (SELECT id FROM users WHERE dingtalk_user_id = 'u_algo')),
  ('AB-004', '11111111-1111-1111-1111-111111111111', '点云分割', '2026-04-17', 'v2.1', 1800, 180, 54, 36, 0.15, 9, 5.8, 0.3556, (SELECT id FROM users WHERE dingtalk_user_id = 'u_algo'))
ON CONFLICT (external_batch_id) DO NOTHING;

INSERT INTO pm_hour_logs (
  project_id,
  pm_user_id,
  week_start,
  annotation_types,
  hours_spent,
  pm_hourly_cost,
  week_cost_cny,
  accum_hours,
  remark
)
VALUES
  ('11111111-1111-1111-1111-111111111111', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_1'), '2026-04-14', '点云分割', 34, 180, 6120, 154, '重点跟踪成本与模型切换'),
  ('22222222-2222-2222-2222-222222222222', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_2'), '2026-04-14', '4D车道线', 40, 180, 7200, 188, '聚焦质量和客户标准'),
  ('33333333-3333-3333-3333-333333333333', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_3'), '2026-04-14', '2D框', 28, 180, 5040, 106, '供应商陪跑'),
  ('55555555-5555-5555-5555-555555555555', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_4'), '2026-04-14', '里程碑', 24, 180, 4320, 260, '联动后端与算法')
ON CONFLICT (project_id, pm_user_id, week_start) DO NOTHING;

INSERT INTO project_risks (
  project_id,
  risk_level,
  risk_desc,
  impact_scope,
  suggested_action,
  owner_user_id,
  target_resolve_date,
  status,
  source
)
VALUES
  ('11111111-1111-1111-1111-111111111111', '红', '成本超支风险', '影响一曲线毛利', '继续推进算法提效并复盘报价策略', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_1'), '2026-04-25', 'open', 'manual'),
  ('33333333-3333-3333-3333-333333333333', '黄', '供应商稳定性不足', '影响交付节奏', '商务和运营联合跟进', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_3'), '2026-04-24', 'open', 'manual'),
  ('55555555-5555-5555-5555-555555555555', '红', '格式适配和算法效果叠加风险', '影响二曲线交付', '后端与算法联合排查并拆分问题单', (SELECT id FROM users WHERE dingtalk_user_id = 'u_pm_4'), '2026-04-22', 'open', 'manual')
ON CONFLICT DO NOTHING;
