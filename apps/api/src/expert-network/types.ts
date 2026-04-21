export type ExpertDomainDistributionItem = {
  id: string;
  domain: string;
  count: number;
};

export type ExpertNetworkReportStatus = 'draft' | 'submitted';

export type ExpertNetworkWeeklyReportRecord = {
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
  status: ExpertNetworkReportStatus;
  createdAt: string;
  updatedAt: string;
};

export type ExpertNetworkStore = {
  domainCatalog: string[];
  reports: ExpertNetworkWeeklyReportRecord[];
};
