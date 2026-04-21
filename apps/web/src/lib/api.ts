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

export type ProjectStatus = 'active' | 'archived' | 'recycled';

export type ProjectOption = {
  id: string;
  name: string;
  pmName: string;
  curveType: string;
  annotationType: string;
  plannedQty: number;
  qtyUnit: string;
  contractAmount: number;
  budgetTotal: number;
  defaultSupplier: string;
  status: ProjectStatus;
};

export type ProjectPayload = ProjectOption;

export type RiskItem = {
  id: string;
  level: '绿' | '黄' | '红';
  title: string;
  status: 'open' | 'watching' | 'closed';
  dueDate: string;
  description: string;
  action: string;
};

export type PmWeeklyReport = {
  id: string;
  projectId: string;
  projectName: string;
  pmName: string;
  curveType: string;
  annotationType: string;
  plannedQty: number;
  qtyUnit: string;
  contractAmount: number;
  budgetTotal: number;
  weekStart: string;
  progressPct: number;
  actualQty: number;
  weeklyDeliveryAmount: number;
  amountDelivered: number;
  costConsumed: number;
  qualityPass: number;
  clientScore: number;
  riskLevel: '绿' | '黄' | '红';
  riskDesc: string;
  blockerTitle: string;
  blockerStatus: 'open' | 'watching' | 'closed';
  blockerDueDate: string;
  suggestedAction: string;
  riskItems: RiskItem[];
  supplierName: string;
  supplierHeadcount: number;
  supplierQuality: number;
  supplierOtdRate: number;
  supplierCooperation: number;
  supplierIssue: string;
  algoVersion: string;
  modificationRate: number;
  timeSavePct: number;
  algoAdvice: string;
  hoursSpent: number;
  pmHourlyCost: number;
  pmComment: string;
  nextWeekFocus: string;
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;
};

export type PmWeeklyReportPayload = Omit<
  PmWeeklyReport,
  | 'id'
  | 'projectName'
  | 'pmName'
  | 'curveType'
  | 'annotationType'
  | 'plannedQty'
  | 'qtyUnit'
  | 'contractAmount'
  | 'budgetTotal'
  | 'createdAt'
  | 'updatedAt'
>;

export type PmWeeklyReportsBootstrap = {
  projects: ProjectOption[];
  reports: PmWeeklyReport[];
};

export type ExpertDomainDistributionItem = {
  id: string;
  domain: string;
  count: number;
};

export type ExpertNetworkWeeklyReport = {
  id: string;
  weekStart: string;
  ownerName: string;
  newExpertsCount: number;
  weeklySubmittedCases: number;
  totalQcPassedCases: number;
  activeExpertsCount: number;
  totalDomainDistribution: ExpertDomainDistributionItem[];
  weeklyNewDomainDistribution: ExpertDomainDistributionItem[];
  summary: string;
  nextWeekFocus: string;
  remarks: string;
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;
};

export type ExpertNetworkWeeklyReportPayload = Omit<
  ExpertNetworkWeeklyReport,
  'id' | 'createdAt' | 'updatedAt'
>;

export type ExpertNetworkBootstrap = {
  currentReport: ExpertNetworkWeeklyReport | null;
  baselineReport: ExpertNetworkWeeklyReport | null;
  latestReport: ExpertNetworkWeeklyReport | null;
  reports: ExpertNetworkWeeklyReport[];
  domainCatalog: string[];
};

export type ExpertNetworkDashboardData = {
  latestReport: ExpertNetworkWeeklyReport | null;
  previousReport: ExpertNetworkWeeklyReport | null;
  reportsInRange: ExpertNetworkWeeklyReport[];
  totalDomainDistribution: ExpertDomainDistributionItem[];
  weeklyNewDomainDistribution: ExpertDomainDistributionItem[];
  domainCatalog: string[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
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

export async function getPmWeeklyReportsBootstrap(projectId?: string) {
  const query = projectId
    ? `?${new URLSearchParams({ projectId }).toString()}`
    : '';
  return request<PmWeeklyReportsBootstrap>(
    `/pm-weekly-reports/bootstrap${query}`,
  );
}

export async function createProject(payload: ProjectPayload) {
  return request<ProjectOption>('/pm-weekly-reports/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateProject(id: string, payload: ProjectPayload) {
  return request<ProjectOption>(`/pm-weekly-reports/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function archiveProject(id: string) {
  return request<ProjectOption>(`/pm-weekly-reports/projects/${id}/archive`, {
    method: 'POST',
  });
}

export async function recycleProject(id: string) {
  return request<ProjectOption>(`/pm-weekly-reports/projects/${id}/recycle`, {
    method: 'POST',
  });
}

export async function restoreProject(id: string) {
  return request<ProjectOption>(`/pm-weekly-reports/projects/${id}/restore`, {
    method: 'POST',
  });
}

export async function createPmWeeklyReport(payload: PmWeeklyReportPayload) {
  return request<PmWeeklyReport>('/pm-weekly-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updatePmWeeklyReport(
  id: string,
  payload: PmWeeklyReportPayload,
) {
  return request<PmWeeklyReport>(`/pm-weekly-reports/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deletePmWeeklyReport(id: string) {
  return request<{ success: boolean }>(`/pm-weekly-reports/${id}`, {
    method: 'DELETE',
  });
}

export async function getExpertNetworkBootstrap(weekStart?: string) {
  const query = weekStart
    ? `?${new URLSearchParams({ weekStart }).toString()}`
    : '';
  return request<ExpertNetworkBootstrap>(`/expert-network/bootstrap${query}`);
}

export async function getExpertNetworkDashboard(filters: {
  startDate: string;
  endDate: string;
}) {
  const query = new URLSearchParams(filters).toString();
  return request<ExpertNetworkDashboardData>(`/expert-network/dashboard?${query}`);
}

export async function createExpertNetworkReport(
  payload: ExpertNetworkWeeklyReportPayload,
) {
  return request<ExpertNetworkWeeklyReport>('/expert-network', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateExpertNetworkReport(
  id: string,
  payload: ExpertNetworkWeeklyReportPayload,
) {
  return request<ExpertNetworkWeeklyReport>(`/expert-network/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteExpertNetworkReport(id: string) {
  return request<{ success: boolean }>(`/expert-network/${id}`, {
    method: 'DELETE',
  });
}
