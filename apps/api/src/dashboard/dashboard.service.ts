import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join, sep } from 'path';

import { DatabaseService } from '../common/database.service';
import { demoPmReportsStore } from '../pm-reports/demo-reports';
import {
  PmWeeklyReportRecord,
  PmWeeklyReportsStore,
} from '../pm-reports/types';
import {
  demoAlgoTrend,
  demoCostRoiTrend,
  demoOverview,
  demoProjectProgress,
  demoRiskTrend,
  demoSupplierTrend,
} from './demo-data';
import { DashboardQueryDto, ProjectProgressQueryDto } from './dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getOverview(query: DashboardQueryDto) {
    const filters = this.buildProjectFilters(query, 3);
    const sql = `
      WITH scoped_projects AS (
        SELECT p.*
        FROM projects p
        WHERE p.status NOT IN ('已完工', '暂停')
        ${filters.sql}
      ),
      latest_snapshot AS (
        SELECT DISTINCT ON (s.project_id)
          s.project_id,
          s.snapshot_date,
          COALESCE(s.progress_pct, 0) AS progress_pct,
          COALESCE(s.weekly_delivery_amount, 0) AS weekly_delivery_amount,
          COALESCE(s.amount_delivered, 0) AS amount_delivered,
          COALESCE(s.cost_consumed, 0) AS cost_consumed,
          COALESCE(s.quality_pass, 0) AS quality_pass,
          COALESCE(s.client_score, 0) AS client_score,
          COALESCE(s.risk_level, '绿') AS risk_level
        FROM project_weekly_snapshots s
        JOIN scoped_projects p ON p.id = s.project_id
        WHERE s.snapshot_date <= $2
        ORDER BY s.project_id, s.snapshot_date DESC
      ),
      period_snapshot AS (
        SELECT
          s.project_id,
          MIN(s.progress_pct) AS progress_start,
          MAX(s.progress_pct) AS progress_end,
          SUM(COALESCE(s.weekly_delivery_amount, 0)) AS delivery_in_period,
          MAX(COALESCE(s.cost_consumed, 0)) AS cost_at_end,
          COUNT(*) FILTER (WHERE s.risk_level = '红') AS red_risk_count,
          COUNT(*) FILTER (WHERE s.risk_level = '黄') AS yellow_risk_count
        FROM project_weekly_snapshots s
        JOIN scoped_projects p ON p.id = s.project_id
        WHERE s.snapshot_date BETWEEN $1 AND $2
        GROUP BY s.project_id
      )
      SELECT
        COUNT(*)::INT AS active_projects,
        COUNT(DISTINCT p.pm_user_id)::INT AS active_pms,
        COALESCE(SUM(p.contract_amount), 0)::NUMERIC AS total_contract_amount,
        COALESCE(SUM(CASE WHEN p.curve_type = '一曲线' THEN p.contract_amount ELSE 0 END), 0)::NUMERIC AS curve1_contract_amount,
        COALESCE(SUM(CASE WHEN p.curve_type IN ('二曲线', '三曲线') THEN p.contract_amount ELSE 0 END), 0)::NUMERIC AS curve23_contract_amount,
        COALESCE(SUM(CASE WHEN p.curve_type = '一曲线' THEN ps.delivery_in_period ELSE 0 END), 0)::NUMERIC AS curve1_delivery_in_period,
        COALESCE(AVG(CASE WHEN p.curve_type = '一曲线' AND ls.risk_level = '绿' THEN 1 ELSE 0 END), 0)::NUMERIC(8, 4) AS curve1_health_rate,
        COALESCE(AVG(CASE
          WHEN p.curve_type IN ('二曲线', '三曲线')
            AND COALESCE(p.actual_person_days_used, 0) <= COALESCE(p.planned_person_days, 0) * COALESCE(ls.progress_pct, 0)
          THEN 1 ELSE 0 END), 0)::NUMERIC(8, 4) AS curve23_health_rate,
        COALESCE(SUM(CASE WHEN ls.risk_level = '红' THEN 1 ELSE 0 END), 0)::INT AS red_risk_projects,
        COALESCE(SUM(CASE WHEN ls.risk_level = '黄' THEN 1 ELSE 0 END), 0)::INT AS yellow_risk_projects,
        COALESCE(SUM(COALESCE(p.cloud_cost, 0) + COALESCE(p.internal_labor_cost, 0) + COALESCE(p.external_procurement_cost, 0) + COALESCE(p.other_cost, 0)), 0)::NUMERIC AS total_cost,
        COALESCE(
          SUM(p.contract_amount) / NULLIF(SUM(COALESCE(p.cloud_cost, 0) + COALESCE(p.internal_labor_cost, 0) + COALESCE(p.external_procurement_cost, 0) + COALESCE(p.other_cost, 0)), 0),
          0
        )::NUMERIC(12, 4) AS roi_value
      FROM scoped_projects p
      LEFT JOIN latest_snapshot ls ON ls.project_id = p.id
      LEFT JOIN period_snapshot ps ON ps.project_id = p.id;
    `;

    try {
      const result = await this.db.query(sql, [
        query.startDate,
        query.endDate,
        ...filters.params,
      ]);

      return result.rows[0];
    } catch {
      return this.buildRuntimeOverview(query);
    }
  }

  async getProjectProgress(query: ProjectProgressQueryDto) {
    const filters = this.buildProjectFilters(query, 3);
    const sql = `
      WITH scoped_projects AS (
        SELECT p.*
        FROM projects p
        WHERE 1 = 1
        ${filters.sql}
      ),
      progress_window AS (
        SELECT
          p.id,
          p.project_name,
          p.curve_type,
          p.pm_user_id,
          MIN(s.progress_pct) AS start_progress,
          MAX(s.progress_pct) AS end_progress,
          SUM(COALESCE(s.weekly_delivery_amount, 0)) AS delivery_in_period,
          MAX(COALESCE(s.cost_consumed, 0)) AS cost_at_end,
          MAX(COALESCE(s.risk_level, '绿')) AS current_risk_level
        FROM scoped_projects p
        LEFT JOIN project_weekly_snapshots s
          ON s.project_id = p.id
         AND s.snapshot_date BETWEEN $1 AND $2
        GROUP BY p.id, p.project_name, p.curve_type, p.pm_user_id
      )
      SELECT
        id AS project_id,
        project_name,
        curve_type,
        pm_user_id,
        COALESCE(start_progress, 0) AS start_progress,
        COALESCE(end_progress, 0) AS end_progress,
        COALESCE(end_progress, 0) - COALESCE(start_progress, 0) AS progress_delta,
        COALESCE(delivery_in_period, 0) AS delivery_in_period,
        COALESCE(cost_at_end, 0) AS cost_at_end,
        current_risk_level
      FROM progress_window
      ORDER BY progress_delta DESC, delivery_in_period DESC, project_name ASC;
    `;

    try {
      const result = await this.db.query(sql, [
        query.startDate,
        query.endDate,
        ...filters.params,
      ]);

      return result.rows;
    } catch {
      return this.buildRuntimeProjectProgress(query);
    }
  }

  async getRiskTrend(query: DashboardQueryDto) {
    const filters = this.buildProjectFilters(query, 3);
    const sql = `
      SELECT
        s.snapshot_date,
        COUNT(*) FILTER (WHERE s.risk_level = '红')::INT AS red_count,
        COUNT(*) FILTER (WHERE s.risk_level = '黄')::INT AS yellow_count,
        COUNT(*) FILTER (WHERE COALESCE(s.risk_level, '绿') = '绿')::INT AS green_count
      FROM project_weekly_snapshots s
      JOIN projects p ON p.id = s.project_id
      WHERE s.snapshot_date BETWEEN $1 AND $2
      ${filters.sql.replaceAll('p.', 'p.')}
      GROUP BY s.snapshot_date
      ORDER BY s.snapshot_date ASC;
    `;

    try {
      const result = await this.db.query(sql, [
        query.startDate,
        query.endDate,
        ...filters.params,
      ]);

      return result.rows;
    } catch {
      return this.buildRuntimeRiskTrend(query);
    }
  }

  async getCostRoiTrend(query: DashboardQueryDto) {
    const filters = this.buildProjectFilters(query, 3);
    const sql = `
      SELECT
        s.snapshot_date,
        SUM(COALESCE(s.cost_consumed, 0))::NUMERIC AS total_cost_consumed,
        SUM(COALESCE(s.weekly_delivery_amount, 0))::NUMERIC AS weekly_delivery_amount,
        SUM(COALESCE(s.amount_delivered, 0))::NUMERIC AS amount_delivered,
        (
          SUM(p.contract_amount) / NULLIF(SUM(COALESCE(p.cloud_cost, 0) + COALESCE(p.internal_labor_cost, 0) + COALESCE(p.external_procurement_cost, 0) + COALESCE(p.other_cost, 0)), 0)
        )::NUMERIC(12, 4) AS roi_value
      FROM project_weekly_snapshots s
      JOIN projects p ON p.id = s.project_id
      WHERE s.snapshot_date BETWEEN $1 AND $2
      ${filters.sql}
      GROUP BY s.snapshot_date
      ORDER BY s.snapshot_date ASC;
    `;

    try {
      const result = await this.db.query(sql, [
        query.startDate,
        query.endDate,
        ...filters.params,
      ]);

      return result.rows;
    } catch {
      return this.buildRuntimeCostTrend(query);
    }
  }

  async getSupplierTrend(query: DashboardQueryDto) {
    const filters = this.buildSupplierProjectFilters(query, 3);
    const sql = `
      SELECT
        swm.snapshot_week,
        ROUND(AVG(COALESCE(swm.quality_pass, 0))::numeric, 4) AS avg_quality_pass,
        ROUND(AVG(COALESCE(swm.otd_rate, 0))::numeric, 4) AS avg_otd_rate,
        ROUND(AVG(COALESCE(swm.supplier_cooperation, 0))::numeric, 4) AS avg_supplier_cooperation,
        SUM(COALESCE(swm.total_payout, 0))::NUMERIC AS total_payout
      FROM supplier_weekly_metrics swm
      JOIN projects p ON p.id = swm.project_id
      WHERE swm.snapshot_week BETWEEN $1 AND $2
      ${filters.sql}
      GROUP BY swm.snapshot_week
      ORDER BY swm.snapshot_week ASC;
    `;

    try {
      const result = await this.db.query(sql, [
        query.startDate,
        query.endDate,
        ...filters.params,
      ]);

      return result.rows;
    } catch {
      return this.buildRuntimeSupplierTrend(query);
    }
  }

  async getAlgoTrend(query: DashboardQueryDto) {
    const filters = this.buildProjectFilters(query, 3);
    const sql = `
      SELECT
        a.batch_date,
        ROUND(AVG(COALESCE(a.modification_rate, 0))::numeric, 4) AS avg_modification_rate,
        ROUND(AVG(COALESCE(a.time_save_pct, 0))::numeric, 4) AS avg_time_save_pct
      FROM algo_batches a
      JOIN projects p ON p.id = a.project_id
      WHERE a.batch_date BETWEEN $1 AND $2
      ${filters.sql}
      GROUP BY a.batch_date
      ORDER BY a.batch_date ASC;
    `;

    try {
      const result = await this.db.query(sql, [
        query.startDate,
        query.endDate,
        ...filters.params,
      ]);

      return result.rows;
    } catch {
      return this.buildRuntimeAlgoTrend(query);
    }
  }

  private async buildRuntimeOverview(query: DashboardQueryDto) {
    const { latestReports, periodReports } = await this.getRuntimeScope(query);
    if (!latestReports.length) {
      return demoOverview;
    }

    const curve1Reports = latestReports.filter(
      (report) => report.curveType === '一曲线',
    );
    const curve23Reports = latestReports.filter((report) =>
      ['二曲线', '三曲线'].includes(report.curveType),
    );
    const totalContractAmount = this.sum(latestReports, 'budgetTotal');
    const totalCost = this.sum(latestReports, 'costConsumed');

    return {
      active_projects: latestReports.length,
      active_pms: new Set(latestReports.map((report) => report.pmName)).size,
      total_contract_amount: totalContractAmount,
      curve1_contract_amount: this.sum(curve1Reports, 'budgetTotal'),
      curve23_contract_amount: this.sum(curve23Reports, 'budgetTotal'),
      curve1_delivery_in_period: this.sum(
        periodReports.filter((report) => report.curveType === '一曲线'),
        'weeklyDeliveryAmount',
      ),
      curve1_health_rate: this.safeRate(
        curve1Reports.filter((report) => report.riskLevel === '绿').length,
        curve1Reports.length,
      ),
      curve23_health_rate: this.safeRate(
        curve23Reports.filter((report) => {
          const progress = this.asUnit(report.progressPct);
          return progress === 0 || report.costConsumed <= report.budgetTotal * progress;
        }).length,
        curve23Reports.length,
      ),
      red_risk_projects: latestReports.filter((report) => report.riskLevel === '红')
        .length,
      yellow_risk_projects: latestReports.filter(
        (report) => report.riskLevel === '黄',
      ).length,
      total_cost: totalCost,
      roi_value: totalCost > 0 ? totalContractAmount / totalCost : 0,
    };
  }

  private async buildRuntimeProjectProgress(query: DashboardQueryDto) {
    const { filteredReports } = await this.getRuntimeScope(query);
    if (!filteredReports.length) {
      return demoProjectProgress;
    }

    const reportGroups = this.groupByProject(filteredReports);
    return Array.from(reportGroups.values())
      .map((reports) => {
        const sorted = [...reports].sort((left, right) =>
          this.compareReports(left, right),
        );
        const endReport = sorted[sorted.length - 1];
        const startBaseline =
          sorted.find((report) => report.weekStart >= query.startDate) || sorted[0];
        const deliveryInPeriod = reports
          .filter((report) => this.isInRange(report.weekStart, query))
          .reduce((sum, report) => sum + report.weeklyDeliveryAmount, 0);

        return {
          project_id: endReport.projectId,
          project_name: endReport.projectName,
          curve_type: endReport.curveType,
          pm_user_id: endReport.pmName,
          start_progress: this.asUnit(startBaseline.progressPct),
          end_progress: this.asUnit(endReport.progressPct),
          progress_delta:
            this.asUnit(endReport.progressPct) -
            this.asUnit(startBaseline.progressPct),
          delivery_in_period: deliveryInPeriod,
          cost_at_end: endReport.costConsumed,
          current_risk_level: endReport.riskLevel,
        };
      })
      .sort(
        (left, right) =>
          right.progress_delta - left.progress_delta ||
          right.delivery_in_period - left.delivery_in_period,
      );
  }

  private async buildRuntimeRiskTrend(query: DashboardQueryDto) {
    const { periodReports } = await this.getRuntimeScope(query);
    if (!periodReports.length) {
      return demoRiskTrend;
    }

    return this.groupByDate(periodReports).map(([date, reports]) => ({
      snapshot_date: date,
      red_count: reports.filter((report) => report.riskLevel === '红').length,
      yellow_count: reports.filter((report) => report.riskLevel === '黄').length,
      green_count: reports.filter((report) => report.riskLevel === '绿').length,
    }));
  }

  private async buildRuntimeCostTrend(query: DashboardQueryDto) {
    const { periodReports } = await this.getRuntimeScope(query);
    if (!periodReports.length) {
      return demoCostRoiTrend;
    }

    return this.groupByDate(periodReports).map(([date, reports]) => {
      const totalContractAmount = this.sumUniqueProjectBudget(reports);
      const totalCost = this.sum(reports, 'costConsumed');
      return {
        snapshot_date: date,
        total_cost_consumed: totalCost,
        weekly_delivery_amount: this.sum(reports, 'weeklyDeliveryAmount'),
        amount_delivered: this.sum(reports, 'amountDelivered'),
        roi_value: totalCost > 0 ? totalContractAmount / totalCost : 0,
      };
    });
  }

  private async buildRuntimeSupplierTrend(query: DashboardQueryDto) {
    const { periodReports } = await this.getRuntimeScope(query);
    if (!periodReports.length) {
      return demoSupplierTrend;
    }

    return this.groupByDate(periodReports).map(([date, reports]) => ({
      snapshot_week: date,
      avg_quality_pass: this.average(reports, (report) =>
        this.asUnit(report.supplierQuality),
      ),
      avg_otd_rate: this.average(reports, (report) =>
        this.asUnit(report.supplierOtdRate),
      ),
      avg_supplier_cooperation: this.average(reports, (report) =>
        this.asUnit(report.supplierCooperation),
      ),
      total_payout: this.sum(reports, 'costConsumed'),
    }));
  }

  private async buildRuntimeAlgoTrend(query: DashboardQueryDto) {
    const { periodReports } = await this.getRuntimeScope(query);
    if (!periodReports.length) {
      return demoAlgoTrend;
    }

    return this.groupByDate(periodReports).map(([date, reports]) => ({
      batch_date: date,
      avg_modification_rate: this.average(reports, (report) =>
        this.asUnit(report.modificationRate),
      ),
      avg_time_save_pct: this.average(reports, (report) =>
        this.asUnit(report.timeSavePct),
      ),
    }));
  }

  private buildProjectFilters(
    query: DashboardQueryDto,
    startingIndex: number,
  ): { sql: string; params: string[] } {
    const clauses: string[] = [];
    const params: string[] = [];

    if (query.departmentId) {
      clauses.push(`AND p.department_id = $${startingIndex + params.length}`);
      params.push(query.departmentId);
    }

    if (query.pmId) {
      clauses.push(`AND p.pm_user_id = $${startingIndex + params.length}`);
      params.push(query.pmId);
    }

    if (query.curveType) {
      clauses.push(`AND p.curve_type = $${startingIndex + params.length}`);
      params.push(query.curveType);
    }

    return {
      sql: clauses.length ? `\n${clauses.join('\n')}` : '',
      params,
    };
  }

  private buildSupplierProjectFilters(
    query: DashboardQueryDto,
    startingIndex: number,
  ): { sql: string; params: string[] } {
    return this.buildProjectFilters(query, startingIndex);
  }

  private async getRuntimeScope(query: DashboardQueryDto) {
    const store = await this.readRuntimeStore();
    const filteredReports = store.reports
      .filter((report) => this.matchCurveType(report, query.curveType))
      .filter((report) => report.weekStart <= query.endDate)
      .sort((left, right) => this.compareReports(left, right));
    const periodReports = filteredReports.filter((report) =>
      this.isInRange(report.weekStart, query),
    );

    return {
      filteredReports,
      periodReports,
      latestReports: this.pickLatestReports(filteredReports),
    };
  }

  private async readRuntimeStore(): Promise<PmWeeklyReportsStore> {
    try {
      const raw = await readFile(this.getRuntimeStorePath(), 'utf-8');
      return JSON.parse(raw) as PmWeeklyReportsStore;
    } catch {
      return demoPmReportsStore;
    }
  }

  private getRuntimeStorePath() {
    const cwd = process.cwd();
    const apiRoot = cwd.endsWith(`${sep}apps${sep}api`)
      ? cwd
      : join(cwd, 'apps', 'api');
    return join(apiRoot, 'data', 'pm-weekly-reports.runtime.json');
  }

  private pickLatestReports(reports: PmWeeklyReportRecord[]) {
    const latestByProject = new Map<string, PmWeeklyReportRecord>();

    for (const report of reports) {
      const existing = latestByProject.get(report.projectId);
      if (!existing || this.compareReports(existing, report) < 0) {
        latestByProject.set(report.projectId, report);
      }
    }

    return Array.from(latestByProject.values());
  }

  private groupByProject(reports: PmWeeklyReportRecord[]) {
    const groups = new Map<string, PmWeeklyReportRecord[]>();

    for (const report of reports) {
      const current = groups.get(report.projectId) || [];
      current.push(report);
      groups.set(report.projectId, current);
    }

    return groups;
  }

  private groupByDate(reports: PmWeeklyReportRecord[]) {
    const groups = new Map<string, PmWeeklyReportRecord[]>();

    for (const report of reports) {
      const current = groups.get(report.weekStart) || [];
      current.push(report);
      groups.set(report.weekStart, current);
    }

    return Array.from(groups.entries()).sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }

  private compareReports(left: PmWeeklyReportRecord, right: PmWeeklyReportRecord) {
    const weekCompare = left.weekStart.localeCompare(right.weekStart);
    if (weekCompare !== 0) {
      return weekCompare;
    }

    return left.updatedAt.localeCompare(right.updatedAt);
  }

  private matchCurveType(
    report: PmWeeklyReportRecord,
    curveType?: string,
  ) {
    return !curveType || report.curveType === curveType;
  }

  private isInRange(date: string, query: DashboardQueryDto) {
    return date >= query.startDate && date <= query.endDate;
  }

  private sum<T extends keyof PmWeeklyReportRecord>(
    reports: PmWeeklyReportRecord[],
    key: T,
  ) {
    return reports.reduce((total, report) => {
      const value = report[key];
      return total + (typeof value === 'number' ? value : 0);
    }, 0);
  }

  private sumUniqueProjectBudget(reports: PmWeeklyReportRecord[]) {
    const latestByProject = this.pickLatestReports(reports);
    return latestByProject.reduce((total, report) => total + report.budgetTotal, 0);
  }

  private average(
    reports: PmWeeklyReportRecord[],
    selector: (report: PmWeeklyReportRecord) => number,
  ) {
    if (!reports.length) {
      return 0;
    }

    return reports.reduce((total, report) => total + selector(report), 0) / reports.length;
  }

  private asUnit(value: number) {
    return value > 1 ? value / 100 : value;
  }

  private safeRate(part: number, total: number) {
    return total > 0 ? part / total : 0;
  }
}
