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

export type ReportStatus = 'draft' | 'submitted';
export type RiskLevel = '绿' | '黄' | '红';
export type BlockerStatus = 'open' | 'watching' | 'closed';

export type RiskItem = {
  id: string;
  level: RiskLevel;
  title: string;
  status: BlockerStatus;
  dueDate: string;
  description: string;
  action: string;
};

export type PmWeeklyReportRecord = {
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
  riskLevel: RiskLevel;
  riskDesc: string;
  blockerTitle: string;
  blockerStatus: BlockerStatus;
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
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
};

export type PmWeeklyReportsStore = {
  projects: ProjectOption[];
  reports: PmWeeklyReportRecord[];
};
