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

export type DashboardFilters = {
  startDate: string;
  endDate: string;
  mode: 'latest' | 'period';
  curveType?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function toQuery(filters: DashboardFilters): string {
  const query = new URLSearchParams();
  query.set('startDate', filters.startDate);
  query.set('endDate', filters.endDate);
  query.set('mode', filters.mode);
  if (filters.curveType) {
    query.set('curveType', filters.curveType);
  }
  return query.toString();
}

export async function getOverview(filters: DashboardFilters) {
  return request<OverviewMetrics>(`/dashboard/overview?${toQuery(filters)}`);
}

export async function getProjectProgress(filters: DashboardFilters) {
  return request<ProjectProgressRow[]>(
    `/dashboard/project-progress?${toQuery(filters)}&groupBy=project`,
  );
}

export async function getRiskTrend(filters: DashboardFilters) {
  return request<TrendRow[]>(`/dashboard/risk-trend?${toQuery(filters)}`);
}

export async function getCostRoiTrend(filters: DashboardFilters) {
  return request<TrendRow[]>(`/dashboard/cost-roi-trend?${toQuery(filters)}`);
}

export async function getSupplierTrend(filters: DashboardFilters) {
  return request<TrendRow[]>(`/dashboard/supplier-trend?${toQuery(filters)}`);
}

export async function getAlgoTrend(filters: DashboardFilters) {
  return request<TrendRow[]>(`/dashboard/algo-trend?${toQuery(filters)}`);
}

