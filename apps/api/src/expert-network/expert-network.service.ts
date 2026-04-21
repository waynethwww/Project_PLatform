import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, sep } from 'path';

import { demoExpertNetworkStore } from './demo-reports';
import { UpsertExpertNetworkReportDto } from './expert-network.dto';
import {
  ExpertDomainDistributionItem,
  ExpertNetworkStore,
  ExpertNetworkWeeklyReportRecord,
} from './types';

@Injectable()
export class ExpertNetworkService {
  private readonly runtimeStorePath = join(
    this.getApiRootDir(),
    'data',
    'expert-network.runtime.json',
  );

  async getBootstrap(weekStart?: string) {
    const store = await this.readStore();
    const reports = this.sortReportsDesc(store.reports);
    const latestReport = reports[0] || null;
    const targetWeek = weekStart || latestReport?.weekStart;
    const currentReport =
      targetWeek ? reports.find((report) => report.weekStart === targetWeek) || null : null;
    const baselineReport =
      targetWeek
        ? reports.find((report) => report.weekStart < targetWeek) || null
        : reports[1] || null;

    return {
      currentReport,
      baselineReport,
      latestReport,
      reports,
      domainCatalog: store.domainCatalog,
    };
  }

  async getDashboard(startDate: string, endDate: string) {
    const store = await this.readStore();
    const reportsAsc = this.sortReportsAsc(store.reports);
    const reportsInRange = reportsAsc.filter(
      (report) => report.weekStart >= startDate && report.weekStart <= endDate,
    );
    const reportsBeforeEndDate = reportsAsc.filter(
      (report) => report.weekStart <= endDate,
    );
    const latestReport =
      reportsBeforeEndDate.length > 0
        ? reportsBeforeEndDate[reportsBeforeEndDate.length - 1]
        : null;

    const latestIndex = latestReport
      ? reportsAsc.findIndex((report) => report.id === latestReport.id)
      : -1;
    const previousReport = latestIndex > 0 ? reportsAsc[latestIndex - 1] : null;
    const focusReport =
      reportsInRange.length > 0
        ? reportsInRange[reportsInRange.length - 1]
        : latestReport;

    return {
      latestReport,
      previousReport,
      reportsInRange,
      totalDomainDistribution: focusReport?.totalDomainDistribution || [],
      weeklyNewDomainDistribution: focusReport?.weeklyNewDomainDistribution || [],
      domainCatalog: store.domainCatalog,
    };
  }

  async listReports() {
    const store = await this.readStore();
    return this.sortReportsDesc(store.reports);
  }

  async createReport(payload: UpsertExpertNetworkReportDto) {
    const store = await this.readStore();
    this.ensureUniqueWeekStart(store.reports, payload.weekStart);

    const now = new Date().toISOString();
    const report = this.normalizeReportRecord({
      id: randomUUID(),
      weekStart: payload.weekStart,
      ownerName: payload.ownerName,
      newExpertsCount: payload.newExpertsCount,
      weeklySubmittedCases: payload.weeklySubmittedCases,
      totalQcPassedCases: payload.totalQcPassedCases,
      activeExpertsCount: payload.activeExpertsCount,
      totalDomainDistribution: payload.totalDomainDistribution,
      weeklyNewDomainDistribution: payload.weeklyNewDomainDistribution,
      summary: payload.summary,
      nextWeekFocus: payload.nextWeekFocus,
      remarks: payload.remarks,
      status: payload.status,
      createdAt: now,
      updatedAt: now,
    });

    store.reports = this.sortReportsDesc([report, ...store.reports]);
    store.domainCatalog = this.buildDomainCatalog(store);
    await this.writeStore(store);
    return report;
  }

  async updateReport(id: string, payload: UpsertExpertNetworkReportDto) {
    const store = await this.readStore();
    const index = store.reports.findIndex((report) => report.id === id);
    if (index < 0) {
      throw new NotFoundException(`Expert network report ${id} not found`);
    }

    this.ensureUniqueWeekStart(
      store.reports.filter((report) => report.id !== id),
      payload.weekStart,
    );

    const current = store.reports[index];
    const report = this.normalizeReportRecord({
      id,
      weekStart: payload.weekStart,
      ownerName: payload.ownerName,
      newExpertsCount: payload.newExpertsCount,
      weeklySubmittedCases: payload.weeklySubmittedCases,
      totalQcPassedCases: payload.totalQcPassedCases,
      activeExpertsCount: payload.activeExpertsCount,
      totalDomainDistribution: payload.totalDomainDistribution,
      weeklyNewDomainDistribution: payload.weeklyNewDomainDistribution,
      summary: payload.summary,
      nextWeekFocus: payload.nextWeekFocus,
      remarks: payload.remarks,
      status: payload.status,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    });

    store.reports[index] = report;
    store.reports = this.sortReportsDesc(store.reports);
    store.domainCatalog = this.buildDomainCatalog(store);
    await this.writeStore(store);
    return report;
  }

  async deleteReport(id: string) {
    const store = await this.readStore();
    const nextReports = store.reports.filter((report) => report.id !== id);
    if (nextReports.length === store.reports.length) {
      throw new NotFoundException(`Expert network report ${id} not found`);
    }

    store.reports = nextReports;
    store.domainCatalog = this.buildDomainCatalog(store);
    await this.writeStore(store);
    return { success: true };
  }

  private ensureUniqueWeekStart(
    reports: ExpertNetworkWeeklyReportRecord[],
    weekStart: string,
  ) {
    if (reports.some((report) => report.weekStart === weekStart)) {
      throw new ConflictException(`Week ${weekStart} already exists`);
    }
  }

  private async readStore(): Promise<ExpertNetworkStore> {
    await this.ensureStoreFile();
    const raw = await readFile(this.runtimeStorePath, 'utf-8');
    return this.normalizeStore(JSON.parse(raw) as ExpertNetworkStore);
  }

  private async writeStore(store: ExpertNetworkStore) {
    await writeFile(
      this.runtimeStorePath,
      JSON.stringify(store, null, 2),
      'utf-8',
    );
  }

  private async ensureStoreFile() {
    const directory = dirname(this.runtimeStorePath);
    await mkdir(directory, { recursive: true });

    try {
      await readFile(this.runtimeStorePath, 'utf-8');
    } catch {
      await this.writeStore(demoExpertNetworkStore);
    }
  }

  private normalizeStore(store: ExpertNetworkStore): ExpertNetworkStore {
    const reports = this.sortReportsDesc(
      (store.reports || []).map((report) => this.normalizeReportRecord(report)),
    );
    const domainCatalog = this.sortDomains([
      ...(store.domainCatalog || []),
      ...reports.flatMap((report) =>
        [
          ...report.totalDomainDistribution.map((item) => item.domain),
          ...report.weeklyNewDomainDistribution.map((item) => item.domain),
        ].filter(Boolean),
      ),
    ]);

    return {
      domainCatalog,
      reports,
    };
  }

  private normalizeReportRecord(
    report: ExpertNetworkWeeklyReportRecord,
  ): ExpertNetworkWeeklyReportRecord {
    return {
      id: String(report.id || randomUUID()),
      weekStart: this.normalizeString(report.weekStart),
      ownerName: this.normalizeString(report.ownerName, '王天浩'),
      newExpertsCount: this.normalizeNumber(report.newExpertsCount),
      weeklySubmittedCases: this.normalizeNumber(report.weeklySubmittedCases),
      totalQcPassedCases: this.normalizeNumber(report.totalQcPassedCases),
      activeExpertsCount: this.normalizeNumber(report.activeExpertsCount),
      totalDomainDistribution: this.normalizeDomainRows(
        report.totalDomainDistribution,
        'total',
      ),
      weeklyNewDomainDistribution: this.normalizeDomainRows(
        report.weeklyNewDomainDistribution,
        'weekly',
      ),
      summary: this.normalizeString(report.summary),
      nextWeekFocus: this.normalizeString(report.nextWeekFocus),
      remarks: this.normalizeString(report.remarks),
      status: report.status === 'submitted' ? 'submitted' : 'draft',
      createdAt:
        this.normalizeString(report.createdAt) || new Date().toISOString(),
      updatedAt:
        this.normalizeString(report.updatedAt) || new Date().toISOString(),
    };
  }

  private normalizeDomainRows(
    rows: ExpertDomainDistributionItem[] | undefined,
    prefix: string,
  ) {
    const grouped = new Map<string, number>();

    for (const row of rows || []) {
      const domain = this.normalizeString(row.domain);
      const count = this.normalizeNumber(row.count);
      if (!domain || count <= 0) {
        continue;
      }

      grouped.set(domain, (grouped.get(domain) || 0) + count);
    }

    return this.sortDomains(Array.from(grouped.keys())).map((domain, index) => ({
      id: `${prefix}-${index + 1}`,
      domain,
      count: grouped.get(domain) || 0,
    }));
  }

  private sortReportsDesc(reports: ExpertNetworkWeeklyReportRecord[]) {
    return [...reports].sort(
      (left, right) =>
        right.weekStart.localeCompare(left.weekStart) ||
        right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  private sortReportsAsc(reports: ExpertNetworkWeeklyReportRecord[]) {
    return [...reports].sort(
      (left, right) =>
        left.weekStart.localeCompare(right.weekStart) ||
        left.updatedAt.localeCompare(right.updatedAt),
    );
  }

  private buildDomainCatalog(store: ExpertNetworkStore) {
    return this.sortDomains([
      ...(store.domainCatalog || []),
      ...store.reports.flatMap((report) =>
        [
          ...report.totalDomainDistribution.map((item) => item.domain),
          ...report.weeklyNewDomainDistribution.map((item) => item.domain),
        ].filter(Boolean),
      ),
    ]);
  }

  private sortDomains(domains: string[]) {
    return Array.from(new Set(domains.map((item) => item.trim()).filter(Boolean))).sort(
      (left, right) => left.localeCompare(right, 'zh-CN'),
    );
  }

  private normalizeNumber(value: unknown, fallback = 0) {
    const numeric =
      typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    if (!Number.isFinite(numeric) || numeric < 0) {
      return fallback;
    }
    return numeric;
  }

  private normalizeString(value: unknown, fallback = '') {
    return typeof value === 'string' ? value.trim() : fallback;
  }

  private getApiRootDir() {
    const currentDir = __dirname.split(sep);
    const srcIndex = currentDir.lastIndexOf('src');
    return srcIndex >= 0
      ? currentDir.slice(0, srcIndex).join(sep)
      : process.cwd();
  }
}
