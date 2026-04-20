import { OverviewMetrics, ProjectProgressRow, TrendRow } from './types';

export const demoOverview: OverviewMetrics = {
  active_projects: 6,
  active_pms: 5,
  total_contract_amount: 600.0823,
  curve1_contract_amount: 170.0823,
  curve23_contract_amount: 430.0,
  curve1_delivery_in_period: 16.7,
  curve1_health_rate: 0.5,
  curve23_health_rate: 0.33,
  red_risk_projects: 3,
  yellow_risk_projects: 2,
  total_cost: 300.8,
  roi_value: 2.0,
};

export const demoProjectProgress: ProjectProgressRow[] = [
  {
    project_id: '11111111-1111-1111-1111-111111111111',
    project_name: 'ZBZ32-语义分割',
    curve_type: '一曲线',
    pm_user_id: 'u_pm_1',
    start_progress: 0.75,
    end_progress: 0.87,
    progress_delta: 0.12,
    delivery_in_period: 18.2,
    cost_at_end: 91.2,
    current_risk_level: '绿',
  },
  {
    project_id: '22222222-2222-2222-2222-222222222222',
    project_name: 'zbz32-车道线',
    curve_type: '一曲线',
    pm_user_id: 'u_pm_2',
    start_progress: 0.5,
    end_progress: 0.72,
    progress_delta: 0.22,
    delivery_in_period: 28.6,
    cost_at_end: 8.1,
    current_risk_level: '绿',
  },
  {
    project_id: '33333333-3333-3333-3333-333333333333',
    project_name: 'Prosper-AGV',
    curve_type: '一曲线',
    pm_user_id: 'u_pm_3',
    start_progress: 0,
    end_progress: 0.18,
    progress_delta: 0.18,
    delivery_in_period: 0.58,
    cost_at_end: 2.3,
    current_risk_level: '黄',
  },
  {
    project_id: '44444444-4444-4444-4444-444444444444',
    project_name: 'MIKE-沃尔玛智能电商营销',
    curve_type: '三曲线',
    pm_user_id: 'u_director',
    start_progress: 0.8,
    end_progress: 0.9,
    progress_delta: 0.1,
    delivery_in_period: 0,
    cost_at_end: 252.0,
    current_risk_level: '黄',
  },
  {
    project_id: '55555555-5555-5555-5555-555555555555',
    project_name: 'Mary',
    curve_type: '二曲线',
    pm_user_id: 'u_pm_4',
    start_progress: 0.8,
    end_progress: 0.86,
    progress_delta: 0.06,
    delivery_in_period: 0,
    cost_at_end: 1580.0,
    current_risk_level: '黄',
  },
];

export const demoRiskTrend: TrendRow[] = [
  { snapshot_date: '2026-03-27', red_count: 4, yellow_count: 1, green_count: 1 },
  { snapshot_date: '2026-04-03', red_count: 3, yellow_count: 2, green_count: 1 },
  { snapshot_date: '2026-04-10', red_count: 3, yellow_count: 3, green_count: 0 },
  { snapshot_date: '2026-04-17', red_count: 2, yellow_count: 3, green_count: 1 },
];

export const demoCostRoiTrend: TrendRow[] = [
  { snapshot_date: '2026-03-27', total_cost_consumed: 330.1, weekly_delivery_amount: 18.7, amount_delivered: 92.1, roi_value: 1.79 },
  { snapshot_date: '2026-04-03', total_cost_consumed: 340.4, weekly_delivery_amount: 13.1, amount_delivered: 104.6, roi_value: 1.83 },
  { snapshot_date: '2026-04-10', total_cost_consumed: 354.8, weekly_delivery_amount: 17.6, amount_delivered: 122.8, roi_value: 1.94 },
  { snapshot_date: '2026-04-17', total_cost_consumed: 368.5, weekly_delivery_amount: 16.4, amount_delivered: 140.4, roi_value: 2.03 },
];

export const demoSupplierTrend: TrendRow[] = [
  { snapshot_week: '2026-04-10', avg_quality_pass: 0.8133, avg_otd_rate: 0.7733, avg_supplier_cooperation: 0.7833, total_payout: 120.7 },
  { snapshot_week: '2026-04-17', avg_quality_pass: 0.8766, avg_otd_rate: 0.8433, avg_supplier_cooperation: 0.84, total_payout: 149.0 },
];

export const demoAlgoTrend: TrendRow[] = [
  { batch_date: '2026-03-18', avg_modification_rate: 0.30, avg_time_save_pct: 0.2222 },
  { batch_date: '2026-03-19', avg_modification_rate: 0.75, avg_time_save_pct: 0.05 },
  { batch_date: '2026-04-10', avg_modification_rate: 0.10, avg_time_save_pct: 0.35 },
  { batch_date: '2026-04-17', avg_modification_rate: 0.15, avg_time_save_pct: 0.3556 },
];

