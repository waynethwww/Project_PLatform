import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../common/database.service';
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
      return demoOverview;
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
      return demoProjectProgress;
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
      return demoRiskTrend;
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
      return demoCostRoiTrend;
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
      return demoSupplierTrend;
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
      return demoAlgoTrend;
    }
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
}
