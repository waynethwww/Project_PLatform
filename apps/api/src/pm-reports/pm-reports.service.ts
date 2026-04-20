import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, sep } from 'path';
import { randomUUID } from 'crypto';

import { demoPmReportsStore } from './demo-reports';
import { UpsertPmWeeklyReportDto } from './pm-reports.dto';
import {
  PmWeeklyReportRecord,
  PmWeeklyReportsStore,
  ProjectOption,
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
      reports: this.filterAndSortReports(store.reports, projectId),
    };
  }

  async listProjects() {
    const store = await this.readStore();
    return store.projects;
  }

  async listReports(projectId?: string) {
    const store = await this.readStore();
    return this.filterAndSortReports(store.reports, projectId);
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
    return JSON.parse(raw) as PmWeeklyReportsStore;
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
  ) {
    return reports
      .filter((item) => (projectId ? item.projectId === projectId : true))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  private buildReportRecord(args: {
    id: string;
    payload: UpsertPmWeeklyReportDto;
    project: ProjectOption;
    createdAt: string;
    updatedAt: string;
  }): PmWeeklyReportRecord {
    const { id, payload, project, createdAt, updatedAt } = args;
    return {
      id,
      projectId: project.id,
      projectName: project.name,
      pmName: project.pmName,
      curveType: project.curveType,
      annotationType: project.annotationType,
      plannedQty: project.plannedQty,
      qtyUnit: project.qtyUnit,
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
    };
  }

  private getApiRootDir() {
    const cwd = process.cwd();
    const suffix = `${sep}apps${sep}api`;
    return cwd.endsWith(suffix) ? cwd : join(cwd, 'apps', 'api');
  }
}
