import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, sep } from 'path';
import { randomUUID } from 'crypto';

import { demoPmReportsStore } from './demo-reports';
import { UpsertPmWeeklyReportDto, UpsertProjectDto } from './pm-reports.dto';
import {
  PmWeeklyReportRecord,
  PmWeeklyReportsStore,
  ProjectOption,
  RiskItem,
} from './types';

@Injectable()
export class PmReportsService {
  private readonly runtimeStorePath = join(
    this.getApiRootDir(),
    'data',
    'pm-weekly-reports.runtime.json',
  );

  async getBootstrap(projectId?: string) {
    const store = await this.readStore();
    return {
      projects: store.projects,
      reports: this.filterAndSortReports(store.reports, projectId, store.projects),
    };
  }

  async listProjects() {
    const store = await this.readStore();
    return store.projects;
  }

  async createProject(payload: UpsertProjectDto) {
    const store = await this.readStore();
    if (store.projects.some((project) => project.id === payload.id)) {
      throw new ConflictException(`Project ${payload.id} already exists`);
    }

    const project = this.buildProjectRecord(payload);
    store.projects = this.sortProjects([project, ...store.projects]);
    await this.writeStore(store);
    return project;
  }

  async updateProject(id: string, payload: UpsertProjectDto) {
    const store = await this.readStore();
    const index = store.projects.findIndex((project) => project.id === id);
    if (index < 0) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    const existing = store.projects[index];
    const nextProject = this.buildProjectRecord({ ...payload, id });

    store.projects[index] = nextProject;
    store.projects = this.sortProjects(store.projects);
    store.reports = store.reports.map((report) =>
      report.projectId === id
        ? this.syncReportWithProject(report, existing, nextProject)
        : report,
    );

    await this.writeStore(store);
    return nextProject;
  }

  async archiveProject(id: string) {
    return this.updateProjectStatus(id, 'archived');
  }

  async recycleProject(id: string) {
    return this.updateProjectStatus(id, 'recycled');
  }

  async restoreProject(id: string) {
    return this.updateProjectStatus(id, 'active');
  }

  async listReports(projectId?: string) {
    const store = await this.readStore();
    return this.filterAndSortReports(store.reports, projectId, store.projects);
  }

  async getReport(id: string) {
    const store = await this.readStore();
    const report = store.reports.find((item) => item.id === id);
    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    return report;
  }

  async createReport(payload: UpsertPmWeeklyReportDto) {
    const store = await this.readStore();
    const project = this.findProject(store.projects, payload.projectId);
    const now = new Date().toISOString();
    const report = this.buildReportRecord({
      id: randomUUID(),
      payload,
      project,
      createdAt: now,
      updatedAt: now,
    });

    store.reports.push(report);
    await this.writeStore(store);
    return report;
  }

  async updateReport(id: string, payload: UpsertPmWeeklyReportDto) {
    const store = await this.readStore();
    const index = store.reports.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    const existing = store.reports[index];
    const project = this.findProject(store.projects, payload.projectId);
    const updated = this.buildReportRecord({
      id,
      payload,
      project,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });

    store.reports[index] = updated;
    await this.writeStore(store);
    return updated;
  }

  async deleteReport(id: string) {
    const store = await this.readStore();
    const nextReports = store.reports.filter((item) => item.id !== id);
    if (nextReports.length === store.reports.length) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    store.reports = nextReports;
    await this.writeStore(store);
    return { success: true };
  }

  private async readStore(): Promise<PmWeeklyReportsStore> {
    await this.ensureStoreFile();
    const raw = await readFile(this.runtimeStorePath, 'utf-8');
    return this.normalizeStore(JSON.parse(raw) as PmWeeklyReportsStore);
  }

  private async writeStore(store: PmWeeklyReportsStore) {
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
      await this.writeStore(demoPmReportsStore);
    }
  }

  private findProject(projects: ProjectOption[], projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  private filterAndSortReports(
    reports: PmWeeklyReportRecord[],
    projectId?: string,
    projects?: ProjectOption[],
  ) {
    const activeProjectIds = new Set(
      (projects || [])
        .filter((project) => project.status !== 'recycled' && project.status !== 'archived')
        .map((project) => project.id),
    );

    return reports
      .filter((item) =>
        projectId ? item.projectId === projectId : activeProjectIds.has(item.projectId),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  private normalizeStore(store: PmWeeklyReportsStore): PmWeeklyReportsStore {
    const normalizedProjects = this.sortProjects(
      store.projects.map((project) => this.normalizeProjectRecord(project)),
    );
    const projectMap = new Map(
      normalizedProjects.map((project) => [project.id, project]),
    );

    return {
      projects: normalizedProjects,
      reports: store.reports.map((report) =>
        this.normalizeReportRecord(
          report,
          projectMap.get(report.projectId),
        ),
      ),
    };
  }

  private isCurve1Project(curveType: string) {
    return curveType.trim() === '一曲线';
  }

  private normalizeNonNegativeNumber(value: unknown, fallback = 0) {
    const numeric =
      typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    if (!Number.isFinite(numeric) || numeric < 0) {
      return fallback;
    }
    return numeric;
  }

  private normalizeProjectRecord(project: ProjectOption): ProjectOption {
    const baseProject = {
      id: project.id?.trim() || '',
      name: project.name?.trim() || '',
      pmName: project.pmName?.trim() || '',
      curveType: project.curveType?.trim() || '',
      annotationType: project.annotationType?.trim() || '',
      plannedQty: this.normalizeNonNegativeNumber(project.plannedQty),
      qtyUnit: project.qtyUnit?.trim() || '',
      contractAmount: this.normalizeNonNegativeNumber(
        project.contractAmount,
        this.normalizeNonNegativeNumber(project.budgetTotal),
      ),
      budgetTotal: this.normalizeNonNegativeNumber(project.budgetTotal),
      defaultSupplier: project.defaultSupplier?.trim() || '',
      status: project.status || 'active',
    };

    if (this.isCurve1Project(baseProject.curveType)) {
      return baseProject;
    }

    return {
      ...baseProject,
      annotationType: '',
      plannedQty: 0,
      qtyUnit: '人天',
      defaultSupplier: '',
    };
  }

  private normalizeReportRecord(
    report: PmWeeklyReportRecord,
    project?: ProjectOption,
  ): PmWeeklyReportRecord {
    const normalizedProject = project
      ? this.normalizeProjectRecord(project)
      : this.normalizeProjectRecord({
          id: report.projectId,
          name: report.projectName,
          pmName: report.pmName,
          curveType: report.curveType,
          annotationType: report.annotationType,
          plannedQty: report.plannedQty,
          qtyUnit: report.qtyUnit,
          contractAmount:
            this.normalizeNonNegativeNumber(report.contractAmount) ||
            this.normalizeNonNegativeNumber(report.budgetTotal),
          budgetTotal: report.budgetTotal,
          defaultSupplier: report.supplierName,
          status: 'active',
        });

    const riskItems = this.normalizeRiskItems(report);
    const primaryRisk = this.pickPrimaryRisk(riskItems);

    const baseReport: PmWeeklyReportRecord = {
      ...report,
      projectId: normalizedProject.id,
      projectName: normalizedProject.name,
      pmName: normalizedProject.pmName,
      curveType: normalizedProject.curveType,
      annotationType: normalizedProject.annotationType,
      plannedQty: normalizedProject.plannedQty,
      qtyUnit: normalizedProject.qtyUnit,
      contractAmount:
        this.normalizeNonNegativeNumber(report.contractAmount) ||
        normalizedProject.contractAmount,
      budgetTotal: normalizedProject.budgetTotal,
      riskLevel: primaryRisk.level,
      riskDesc: primaryRisk.description,
      blockerTitle: primaryRisk.title,
      blockerStatus: primaryRisk.status,
      blockerDueDate: primaryRisk.dueDate,
      suggestedAction: primaryRisk.action,
      riskItems,
    };

    if (this.isCurve1Project(normalizedProject.curveType)) {
      return {
        ...baseReport,
        supplierName: report.supplierName.trim(),
        supplierIssue: report.supplierIssue.trim(),
        algoVersion: report.algoVersion.trim(),
        algoAdvice: report.algoAdvice.trim(),
      };
    }

    return {
      ...baseReport,
      actualQty: 0,
      supplierName: '',
      supplierHeadcount: 0,
      supplierQuality: 0,
      supplierOtdRate: 0,
      supplierCooperation: 0,
      supplierIssue: '',
      algoVersion: '',
      modificationRate: 0,
      timeSavePct: 0,
      algoAdvice: '',
    };
  }

  private buildProjectRecord(payload: UpsertProjectDto): ProjectOption {
    return this.normalizeProjectRecord({
      id: payload.id.trim(),
      name: payload.name.trim(),
      pmName: payload.pmName.trim(),
      curveType: payload.curveType.trim(),
      annotationType: payload.annotationType.trim(),
      plannedQty: payload.plannedQty,
      qtyUnit: payload.qtyUnit.trim(),
      contractAmount: payload.contractAmount,
      budgetTotal: payload.budgetTotal,
      defaultSupplier: payload.defaultSupplier.trim(),
      status: payload.status,
    });
  }

  private async updateProjectStatus(
    id: string,
    status: 'active' | 'archived' | 'recycled',
  ) {
    const store = await this.readStore();
    const index = store.projects.findIndex((project) => project.id === id);
    if (index < 0) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    store.projects[index] = this.normalizeProjectRecord({
      ...store.projects[index],
      status,
    });
    store.projects = this.sortProjects(store.projects);
    await this.writeStore(store);
    return store.projects.find((project) => project.id === id)!;
  }

  private normalizeRiskItems(report: PmWeeklyReportRecord): RiskItem[] {
    const nextItems =
      Array.isArray(report.riskItems) && report.riskItems.length > 0
        ? report.riskItems
        : [
            {
              id: `${report.id}-risk-1`,
              level: report.riskLevel,
              title: report.blockerTitle,
              status: report.blockerStatus,
              dueDate: report.blockerDueDate,
              description: report.riskDesc,
              action: report.suggestedAction,
            },
          ];

    return nextItems.map((item, index) => ({
      id: item.id?.trim() || `${report.id}-risk-${index + 1}`,
      level: item.level,
      title: item.title?.trim() || (item.level === '绿' ? '' : report.blockerTitle.trim()),
      status: item.status,
      dueDate: item.dueDate || report.blockerDueDate,
      description: item.description?.trim() || report.riskDesc,
      action: item.action?.trim() || report.suggestedAction,
    }));
  }

  private pickPrimaryRisk(riskItems: RiskItem[]) {
    const sorted = [...riskItems].sort((left, right) => {
      const rank = this.riskRank(left.level) - this.riskRank(right.level);
      if (rank !== 0) {
        return rank;
      }

      return this.blockerRank(left.status) - this.blockerRank(right.status);
    });

    return sorted[0] || {
      id: 'default-risk',
      level: '绿' as const,
      title: '',
      status: 'closed' as const,
      dueDate: new Date().toISOString().slice(0, 10),
      description: '',
      action: '',
    };
  }

  private riskRank(level: RiskItem['level']) {
    if (level === '红') {
      return 0;
    }

    if (level === '黄') {
      return 1;
    }

    return 2;
  }

  private blockerRank(status: RiskItem['status']) {
    if (status === 'open') {
      return 0;
    }

    if (status === 'watching') {
      return 1;
    }

    return 2;
  }

  private sortProjects(projects: ProjectOption[]) {
    return [...projects].sort((left, right) =>
      left.name.localeCompare(right.name, 'zh-CN'),
    );
  }

  private syncReportWithProject(
    report: PmWeeklyReportRecord,
    previousProject: ProjectOption,
    nextProject: ProjectOption,
  ): PmWeeklyReportRecord {
    const shouldSyncSupplier =
      !report.supplierName || report.supplierName === previousProject.defaultSupplier;
    const syncedReport = {
      ...report,
      projectName: nextProject.name,
      pmName: nextProject.pmName,
      curveType: nextProject.curveType,
      annotationType: nextProject.annotationType,
      plannedQty: nextProject.plannedQty,
      qtyUnit: nextProject.qtyUnit,
      contractAmount: nextProject.contractAmount,
      budgetTotal: nextProject.budgetTotal,
      supplierName: shouldSyncSupplier ? nextProject.defaultSupplier : report.supplierName,
      updatedAt: new Date().toISOString(),
    };

    return this.normalizeReportRecord(syncedReport, nextProject);
  }

  private buildReportRecord(args: {
    id: string;
    payload: UpsertPmWeeklyReportDto;
    project: ProjectOption;
    createdAt: string;
    updatedAt: string;
  }): PmWeeklyReportRecord {
    const { id, payload, project, createdAt, updatedAt } = args;
    return this.normalizeReportRecord({
      id,
      projectId: project.id,
      projectName: project.name,
      pmName: project.pmName,
      curveType: project.curveType,
      annotationType: project.annotationType,
      plannedQty: project.plannedQty,
      qtyUnit: project.qtyUnit,
      contractAmount: project.contractAmount,
      budgetTotal: project.budgetTotal,
      weekStart: payload.weekStart,
      progressPct: payload.progressPct,
      actualQty: payload.actualQty,
      weeklyDeliveryAmount: payload.weeklyDeliveryAmount,
      amountDelivered: payload.amountDelivered,
      costConsumed: payload.costConsumed,
      qualityPass: payload.qualityPass,
      clientScore: payload.clientScore,
      riskLevel: payload.riskLevel,
      riskDesc: payload.riskDesc,
      blockerTitle: payload.blockerTitle,
      blockerStatus: payload.blockerStatus,
      blockerDueDate: payload.blockerDueDate,
      suggestedAction: payload.suggestedAction,
      riskItems: payload.riskItems,
      supplierName: payload.supplierName,
      supplierHeadcount: payload.supplierHeadcount,
      supplierQuality: payload.supplierQuality,
      supplierOtdRate: payload.supplierOtdRate,
      supplierCooperation: payload.supplierCooperation,
      supplierIssue: payload.supplierIssue,
      algoVersion: payload.algoVersion,
      modificationRate: payload.modificationRate,
      timeSavePct: payload.timeSavePct,
      algoAdvice: payload.algoAdvice,
      hoursSpent: payload.hoursSpent,
      pmHourlyCost: payload.pmHourlyCost,
      pmComment: payload.pmComment,
      nextWeekFocus: payload.nextWeekFocus,
      status: payload.status,
      createdAt,
      updatedAt,
    }, project);
  }

  private getApiRootDir() {
    const cwd = process.cwd();
    const suffix = `${sep}apps${sep}api`;
    return cwd.endsWith(suffix) ? cwd : join(cwd, 'apps', 'api');
  }
}
