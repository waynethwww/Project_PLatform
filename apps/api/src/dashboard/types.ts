export type OverviewMetrics = {
  active_projects: number;
  active_pms: number;
  total_contract_amount: number;
  curve1_contract_amount: number;
  curve23_contract_amount: number;
  curve1_delivery_in_period: number;
  curve1_health_rate: number;
  curve23_health_rate: number;
  red_risk_projects: number;
  yellow_risk_projects: number;
  total_cost: number;
  roi_value: number;
};

export type ProjectProgressRow = {
  project_id: string;
  project_name: string;
  curve_type: string;
  pm_user_id: string | null;
  start_progress: number;
  end_progress: number;
  progress_delta: number;
  delivery_in_period: number;
  cost_at_end: number;
  current_risk_level: string;
};

export type TrendRow = {
  snapshot_date?: string;
  snapshot_week?: string;
  batch_date?: string;
  red_count?: number;
  yellow_count?: number;
  green_count?: number;
  total_cost_consumed?: number;
  weekly_delivery_amount?: number;
  amount_delivered?: number;
  roi_value?: number;
  avg_quality_pass?: number;
  avg_otd_rate?: number;
  avg_supplier_cooperation?: number;
  total_payout?: number;
  avg_modification_rate?: number;
  avg_time_save_pct?: number;
};
