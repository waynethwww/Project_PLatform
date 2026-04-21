import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';

import {
  DashboardFilters,
  getAlgoTrend,
  getCostRoiTrend,
  getOverview,
  getPmWeeklyReportsBootstrap,
  getProjectProgress,
  getRiskTrend,
  getSupplierTrend,
  OverviewMetrics,
  PmWeeklyReport,
  ProjectProgressRow,
  TrendRow,
} from '../lib/api';
import { loginWithDingTalk } from '../lib/dingtalk';

type RiskTone = 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'neutral';
type PmLoadTone = 'danger' | 'warn' | 'ok' | 'light';

type WeeklySummaryBox = {
  title: string;
  tone: RiskTone;
  items: string[];
};

type PmLoadRow = {
  pmName: string;
  projectCount: number;
  weeklyDelivery: number;
  share: number;
  totalHours: number;
  tone: PmLoadTone;
  label: string;
};

type PmCard = {
  pmName: string;
  totalHours: number;
  tone: PmLoadTone;
  label: string;
  projects: Array<{
    projectName: string;
    hoursSpent: number;
    share: number;
  }>;
};

const COLOR = {
  navy: '#0F2646',
  blue: '#1560B8',
  teal: '#0A6B5C',
  indigo: '#1E3570',
  purple: '#4A2E90',
  amber: '#9A5400',
  red: '#9A2020',
  green: '#14583A',
  gray: '#6B7390',
  lightBlue: '#E4EFFC',
  lightRed: '#FAEAEA',
  lightGreen: '#E2F5EC',
  lightAmber: '#FEF3E2',
  lightPurple: '#EAE7F8',
  bg: '#E2E8F8',
};

const DEFAULT_OVERVIEW: OverviewMetrics = {
  active_projects: 0,
  active_pms: 0,
  total_contract_amount: 0,
  curve1_contract_amount: 0,
  curve23_contract_amount: 0,
  curve1_delivery_in_period: 0,
  curve1_health_rate: 0,
  curve23_health_rate: 0,
  red_risk_projects: 0,
  yellow_risk_projects: 0,
  total_cost: 0,
  roi_value: 0,
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateInputValue(date);
}

function money(value: number) {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function moneyWithUnit(value: number) {
  return `${money(value)} 万`;
}

function percentFromUnit(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function percentFromRaw(value: number) {
  return `${value.toFixed(0)}%`;
}

function progressUnit(value: number) {
  return value > 1 ? value / 100 : value;
}

function isCurve1Project(curveType: string) {
  return curveType === '一曲线';
}

function compareReports(left: PmWeeklyReport, right: PmWeeklyReport) {
  const weekCompare = left.weekStart.localeCompare(right.weekStart);
  if (weekCompare !== 0) {
    return weekCompare;
  }

  return left.updatedAt.localeCompare(right.updatedAt);
}

function riskRank(level: string) {
  if (level === '红') {
    return 0;
  }

  if (level === '黄') {
    return 1;
  }

  return 2;
}

function healthTag(level: string) {
  if (level === '红') {
    return { text: '🔴 风险', className: 'wr-tag wr-tag--red' };
  }

  if (level === '黄') {
    return { text: '🟡 关注', className: 'wr-tag wr-tag--amber' };
  }

  return { text: '🟢 良好', className: 'wr-tag wr-tag--green' };
}

function loadTone(hours: number): { tone: PmLoadTone; label: string } {
  if (hours > 48) {
    return { tone: 'danger', label: '超载' };
  }

  if (hours >= 40) {
    return { tone: 'warn', label: '满载' };
  }

  if (hours >= 24) {
    return { tone: 'ok', label: '在控' };
  }

  return { tone: 'light', label: '轻载' };
}

function getRiskImpact(report: PmWeeklyReport) {
  const text = `${report.riskDesc} ${report.supplierIssue} ${report.pmComment}`;

  if (isCurve1Project(report.curveType) && /供应商|外包|退出/.test(text)) {
    return '供应商稳定性';
  }

  if (!isCurve1Project(report.curveType)) {
    return '影响部署里程碑';
  }

  if (/质量|验收|通过率/.test(text)) {
    return '质量交付';
  }

  if (/成本|超支|预算/.test(text)) {
    return '成本超支';
  }

  if (/算法|模型|修正率/.test(text)) {
    return '算法效果';
  }

  return '影响项目里程碑';
}

function getRiskRows(reports: PmWeeklyReport[]) {
  return [...reports]
    .filter((report) => report.riskLevel !== '绿')
    .sort(
      (left, right) =>
        riskRank(left.riskLevel) - riskRank(right.riskLevel) ||
        right.updatedAt.localeCompare(left.updatedAt),
    );
}

function getTopNames<T>(
  rows: T[],
  selector: (row: T) => string,
  limit = 4,
) {
  return rows.slice(0, limit).map(selector);
}

function compactProjectName(name: string, max = 12) {
  if (name.length <= max) {
    return name;
  }

  return `${name.slice(0, max)}…`;
}

type PieDatum = {
  value: number;
  name: string;
  itemStyle: {
    color: string;
  };
};

function buildBottomLegend(fontSize = 10) {
  return {
    type: 'scroll' as const,
    bottom: 0,
    left: 'center' as const,
    icon: 'circle',
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 16,
    pageIconColor: COLOR.blue,
    pageIconInactiveColor: '#BCC4DF',
    pageTextStyle: { color: '#6868A0', fontSize: 10 },
    textStyle: { color: '#38385E', fontSize },
  };
}

function buildRingSeries(data: PieDatum[], radius: [string, string] = ['55%', '78%']) {
  return {
    type: 'pie' as const,
    radius,
    center: ['50%', '42%'] as [string, string],
    avoidLabelOverlap: false,
    label: { show: false },
    labelLine: { show: false },
    emphasis: { scale: true, scaleSize: 4 },
    data,
  };
}

export function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    startDate: daysAgo(30),
    endDate: daysAgo(0),
    mode: 'period',
    curveType: '',
  });
  const [overview, setOverview] = useState(DEFAULT_OVERVIEW);
  const [projectProgress, setProjectProgress] = useState<ProjectProgressRow[]>([]);
  const [riskTrend, setRiskTrend] = useState<TrendRow[]>([]);
  const [costTrend, setCostTrend] = useState<TrendRow[]>([]);
  const [supplierTrend, setSupplierTrend] = useState<TrendRow[]>([]);
  const [algoTrend, setAlgoTrend] = useState<TrendRow[]>([]);
  const [pmReports, setPmReports] = useState<PmWeeklyReport[]>([]);
  const [loginStatus, setLoginStatus] = useState('未登录钉钉');

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      getOverview(filters),
      getProjectProgress(filters),
      getRiskTrend(filters),
      getCostRoiTrend(filters),
      getSupplierTrend(filters),
      getAlgoTrend(filters),
      getPmWeeklyReportsBootstrap(),
    ])
      .then(
        ([
          overviewResponse,
          projectProgressResponse,
          riskTrendResponse,
          costTrendResponse,
          supplierTrendResponse,
          algoTrendResponse,
          bootstrapResponse,
        ]) => {
          if (!mounted) {
            return;
          }

          setOverview(overviewResponse);
          setProjectProgress(projectProgressResponse);
          setRiskTrend(riskTrendResponse);
          setCostTrend(costTrendResponse);
          setSupplierTrend(supplierTrendResponse);
          setAlgoTrend(algoTrendResponse);
          setPmReports(bootstrapResponse.reports);
        },
      )
      .catch(() => {
        if (!mounted) {
          return;
        }

        setOverview(DEFAULT_OVERVIEW);
      });

    return () => {
      mounted = false;
    };
  }, [filters]);

  const scopedReports = useMemo(
    () =>
      pmReports
        .filter((report) => (filters.curveType ? report.curveType === filters.curveType : true))
        .filter((report) => report.weekStart <= filters.endDate),
    [filters.curveType, filters.endDate, pmReports],
  );

  const periodReports = useMemo(
    () =>
      scopedReports.filter(
        (report) =>
          report.weekStart >= filters.startDate && report.weekStart <= filters.endDate,
      ),
    [filters.endDate, filters.startDate, scopedReports],
  );

  const latestReports = useMemo(() => {
    const latestByProject = new Map<string, PmWeeklyReport>();

    for (const report of scopedReports) {
      const existing = latestByProject.get(report.projectId);
      if (!existing || compareReports(existing, report) < 0) {
        latestByProject.set(report.projectId, report);
      }
    }

    return Array.from(latestByProject.values()).sort(
      (left, right) =>
        riskRank(left.riskLevel) - riskRank(right.riskLevel) ||
        left.projectName.localeCompare(right.projectName, 'zh-CN'),
    );
  }, [scopedReports]);

  const curve1Reports = useMemo(
    () => latestReports.filter((report) => isCurve1Project(report.curveType)),
    [latestReports],
  );

  const curve23Reports = useMemo(
    () => latestReports.filter((report) => report.curveType !== '一曲线'),
    [latestReports],
  );

  const curveBreakdown = useMemo(() => {
    const counts = { curve1: 0, curve2: 0, curve3: 0 };

    for (const report of latestReports) {
      if (report.curveType === '一曲线') {
        counts.curve1 += 1;
      } else if (report.curveType === '二曲线') {
        counts.curve2 += 1;
      } else if (report.curveType === '三曲线') {
        counts.curve3 += 1;
      }
    }

    return counts;
  }, [latestReports]);

  const curve1HealthCounts = useMemo(() => {
    const healthy = curve1Reports.filter((report) => report.riskLevel === '绿').length;
    const risky = curve1Reports.filter((report) => report.riskLevel === '红').length;
    const warn = curve1Reports.filter((report) => report.riskLevel === '黄').length;
    return { healthy, risky, warn };
  }, [curve1Reports]);

  const curve23ProgressRows = useMemo(
    () =>
      curve23Reports.map((report) => ({
        name: compactProjectName(report.projectName, 10),
        progress: Number((progressUnit(report.progressPct) * 100).toFixed(1)),
      })),
    [curve23Reports],
  );

  const annotationContractRows = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const report of curve1Reports) {
      grouped.set(
        report.annotationType,
        (grouped.get(report.annotationType) || 0) + report.budgetTotal,
      );
    }

    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);
  }, [curve1Reports]);

  const annotationWeeklyRows = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const report of periodReports.filter((report) => isCurve1Project(report.curveType))) {
      grouped.set(
        report.annotationType,
        (grouped.get(report.annotationType) || 0) + report.weeklyDeliveryAmount,
      );
    }

    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);
  }, [periodReports]);

  const algoRows = useMemo(
    () =>
      [...latestReports]
        .filter(
          (report) =>
            isCurve1Project(report.curveType) &&
            (report.algoVersion || report.modificationRate > 0),
        )
        .sort((left, right) => right.modificationRate - left.modificationRate),
    [latestReports],
  );

  const hasCurve1Data = curve1Reports.length > 0;
  const hasCurve23Data = curve23Reports.length > 0;

  const curve1CostRows = useMemo(
    () =>
      curve1Reports.map((report) => {
        const expectedCost = report.budgetTotal * progressUnit(report.progressPct);
        const deviation = report.costConsumed - expectedCost;
        const deviationRate = expectedCost > 0 ? deviation / expectedCost : 0;

        return {
          report,
          expectedCost,
          deviation,
          deviationRate,
        };
      }),
    [curve1Reports],
  );

  const curve23ExecutionRows = useMemo(
    () =>
      curve23Reports.map((report) => {
        const expectedBudget = report.budgetTotal * progressUnit(report.progressPct);
        const deviation = report.costConsumed - expectedBudget;
        const deviationRate = expectedBudget > 0 ? deviation / expectedBudget : 0;

        return {
          report,
          expectedBudget,
          deviation,
          deviationRate,
        };
      }),
    [curve23Reports],
  );

  const qualityRows = useMemo(
    () =>
      curve1Reports.map((report) => ({
        report,
        issue:
          report.riskLevel === '红'
            ? '需立即处理'
            : report.riskLevel === '黄'
              ? '需持续跟踪'
              : '正常',
      })),
    [curve1Reports],
  );

  const riskRows = useMemo(() => getRiskRows(latestReports), [latestReports]);

  const topRiskNames = useMemo(() => getTopNames(riskRows, (row) => row.projectName), [riskRows]);

  const topDeliveryPm = useMemo(() => {
    const grouped = new Map<string, { weeklyDelivery: number; hours: number; projects: Set<string> }>();

    for (const report of periodReports.filter((item) => item.curveType === '一曲线')) {
      const current = grouped.get(report.pmName) || {
        weeklyDelivery: 0,
        hours: 0,
        projects: new Set<string>(),
      };

      current.weeklyDelivery += report.weeklyDeliveryAmount;
      current.hours += report.hoursSpent;
      current.projects.add(report.projectId);
      grouped.set(report.pmName, current);
    }

    return Array.from(grouped.entries())
      .map(([pmName, values]) => ({
        pmName,
        weeklyDelivery: values.weeklyDelivery,
        hours: values.hours,
        projectCount: values.projects.size,
      }))
      .sort((left, right) => right.weeklyDelivery - left.weeklyDelivery)[0] || null;
  }, [periodReports]);

  const pmLoadRows = useMemo(() => {
    const grouped = new Map<string, { weeklyDelivery: number; hours: number; projects: Set<string> }>();

    for (const report of periodReports.filter((item) => item.curveType === '一曲线')) {
      const current = grouped.get(report.pmName) || {
        weeklyDelivery: 0,
        hours: 0,
        projects: new Set<string>(),
      };

      current.weeklyDelivery += report.weeklyDeliveryAmount;
      current.hours += report.hoursSpent;
      current.projects.add(report.projectId);
      grouped.set(report.pmName, current);
    }

    const totalDelivery = Array.from(grouped.values()).reduce(
      (sum, item) => sum + item.weeklyDelivery,
      0,
    );

    return Array.from(grouped.entries())
      .map(([pmName, item]) => {
        const load = loadTone(item.hours);
        return {
          pmName,
          projectCount: item.projects.size,
          weeklyDelivery: item.weeklyDelivery,
          share: totalDelivery > 0 ? item.weeklyDelivery / totalDelivery : 0,
          totalHours: item.hours,
          tone: load.tone,
          label: load.label,
        } satisfies PmLoadRow;
      })
      .sort((left, right) => right.weeklyDelivery - left.weeklyDelivery);
  }, [periodReports]);

  const pmCards = useMemo(() => {
    const grouped = new Map<string, { totalHours: number; projects: Map<string, number> }>();

    for (const report of periodReports) {
      const current = grouped.get(report.pmName) || {
        totalHours: 0,
        projects: new Map<string, number>(),
      };

      current.totalHours += report.hoursSpent;
      current.projects.set(
        report.projectName,
        (current.projects.get(report.projectName) || 0) + report.hoursSpent,
      );
      grouped.set(report.pmName, current);
    }

    return Array.from(grouped.entries())
      .map(([pmName, item]) => {
        const load = loadTone(item.totalHours);
        const projects = Array.from(item.projects.entries())
          .map(([projectName, hoursSpent]) => ({
            projectName,
            hoursSpent,
            share: item.totalHours > 0 ? hoursSpent / item.totalHours : 0,
          }))
          .sort((left, right) => right.hoursSpent - left.hoursSpent);

        return {
          pmName,
          totalHours: item.totalHours,
          tone: load.tone,
          label: load.label,
          projects,
        } satisfies PmCard;
      })
      .sort((left, right) => right.totalHours - left.totalHours);
  }, [periodReports]);

  const weeklySummaryBoxes = useMemo(() => {
    const boxes: WeeklySummaryBox[] = [
      {
        title: '✅ 本周经营结论',
        tone: 'green',
        items: [
          `一曲线本周交付金额 ${moneyWithUnit(overview.curve1_delivery_in_period)}。`,
          `一曲线当前快照项目 ${curve1Reports.length} 个，其中健康 ${curve1HealthCounts.healthy} 个，健康率 ${percentFromUnit(overview.curve1_health_rate)}。`,
          `二/三曲线私有化部署项目 ${curve23Reports.length} 个，健康率 ${percentFromUnit(overview.curve23_health_rate)}。`,
        ],
      },
      {
        title: '⚠ 本周重点风险',
        tone: 'red',
        items: [
          `高/中风险共 ${riskRows.length} 条，需优先盯住 ${topRiskNames.length > 0 ? topRiskNames.join('、') : '当前重点项目'}。`,
          `一曲线成本风险项目 ${curve1CostRows.filter((row) => row.deviation > 0).length} 个。`,
          `二/三曲线部署预算偏离项目 ${curve23ExecutionRows.filter((row) => row.deviation > 0).length} 个。`,
        ],
      },
      {
        title: '🎯 交付与资源观察',
        tone: 'amber',
        items: [
          topDeliveryPm
            ? `${topDeliveryPm.pmName} 是本周一曲线交付最高 PM，本周交付 ${moneyWithUnit(topDeliveryPm.weeklyDelivery)}。`
            : '当前暂无一曲线交付 PM 统计。',
          pmCards[0]
            ? `各 PM 工时中，${pmCards[0].pmName} ${pmCards[0].totalHours}h 最高。`
            : '当前暂无 PM 工时统计。',
          '当前汇报页已统一按“本周交付 + 最新快照”双口径呈现。',
          '二/三曲线已切换为私有化部署口径，不再展示标注和供应商信息。',
        ],
      },
      {
        title: '🧭 管理建议',
        tone: 'blue',
        items: [
          `对 ${topRiskNames.slice(0, 3).join('、') || '重点项目'} 做周内专项复盘，优先处理超支与交付偏差。`,
          '对偏差持续放大的项目收紧需求边界，避免继续透支产研资源。',
          '后续周会继续沿用“业务总览 + 成本质量 + 风险 + PM负载”的固定结构。',
        ],
      },
    ];

    return boxes;
  }, [
    curve1CostRows,
    curve1HealthCounts.healthy,
    curve1Reports.length,
    curve23ExecutionRows,
    curve23Reports.length,
    overview.curve1_delivery_in_period,
    overview.curve1_health_rate,
    overview.curve23_health_rate,
    pmCards,
    riskRows.length,
    topDeliveryPm,
    topRiskNames,
  ]);

  const overviewKpis = useMemo(
    () => [
      {
        label: '在执行项目',
        value: String(overview.active_projects),
        subtext: `一${curveBreakdown.curve1}·二${curveBreakdown.curve2}·三${curveBreakdown.curve3}`,
        color: COLOR.navy,
      },
      {
        label: '在执行PM',
        value: String(overview.active_pms),
        subtext: `工时填报 ${pmCards.length} 人`,
        color: COLOR.purple,
      },
      {
        label: '🔴 风险预警',
        value: String(overview.red_risk_projects + overview.yellow_risk_projects),
        subtext: `高风险${overview.red_risk_projects}·中风险${overview.yellow_risk_projects}`,
        color: COLOR.red,
      },
      {
        label: '一曲线合同额（万）',
        value: money(overview.curve1_contract_amount),
        subtext: `标注外包 · ${curveBreakdown.curve1} 项目`,
        color: COLOR.teal,
      },
      {
        label: '本周一曲线交付金额（万）',
        value: money(overview.curve1_delivery_in_period),
        subtext: '取值来自周填报本周交付金额字段',
        color: '#1A8C7D',
      },
      {
        label: '一曲线健康率',
        value: percentFromUnit(overview.curve1_health_rate),
        subtext: `${curve1HealthCounts.healthy}绿·${curve1HealthCounts.risky}红·${curve1HealthCounts.warn}黄`,
        color: COLOR.teal,
      },
      {
        label: '二/三曲线合同额（万）',
        value: money(overview.curve23_contract_amount),
        subtext: `私有化部署 · ${curveBreakdown.curve2 + curveBreakdown.curve3} 项目`,
        color: COLOR.indigo,
      },
      {
        label: '二/三曲线已耗成本（万）',
        value: money(curve23Reports.reduce((sum, report) => sum + report.costConsumed, 0)),
        subtext: '按预算与里程碑执行口径汇报',
        color: '#3A4FA0',
      },
      {
        label: '二/三曲线健康率',
        value: percentFromUnit(overview.curve23_health_rate),
        subtext: `${curve23Reports.filter((report) => report.riskLevel === '绿').length}在控·${curve23Reports.filter((report) => report.riskLevel !== '绿').length}偏离`,
        color: COLOR.indigo,
      },
    ],
    [
      curve1HealthCounts.healthy,
      curve1HealthCounts.risky,
      curve1HealthCounts.warn,
      curve23Reports,
      curveBreakdown.curve1,
      curveBreakdown.curve2,
      curveBreakdown.curve3,
      overview.active_pms,
      overview.active_projects,
      overview.curve1_contract_amount,
      overview.curve1_delivery_in_period,
      overview.curve1_health_rate,
      overview.curve23_contract_amount,
      overview.curve23_health_rate,
      overview.red_risk_projects,
      overview.yellow_risk_projects,
      pmCards.length,
    ],
  );

  const c1HealthOption = useMemo(
    () => ({
      tooltip: { trigger: 'item', confine: true },
      legend: buildBottomLegend(11),
      series: [
        buildRingSeries([
          { value: curve1HealthCounts.healthy, name: '健康', itemStyle: { color: 'rgba(20,88,58,.82)' } },
          { value: curve1HealthCounts.risky, name: '红色风险', itemStyle: { color: 'rgba(154,32,32,.82)' } },
          { value: curve1HealthCounts.warn, name: '黄色预警', itemStyle: { color: 'rgba(154,84,0,.82)' } },
        ]),
      ],
    }),
    [curve1HealthCounts.healthy, curve1HealthCounts.risky, curve1HealthCounts.warn],
  );

  const curve23ProgressOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { top: 18, left: 42, right: 12, bottom: 46 },
      xAxis: {
        type: 'category',
        data: curve23ProgressRows.map((row) => row.name),
        axisLabel: { color: '#38385E', fontSize: 10, rotate: 12 },
        axisLine: { lineStyle: { color: '#BCC4DF' } },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: '#38385E', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,.06)' } },
      },
      series: [
        {
          type: 'bar',
          data: curve23ProgressRows.map((row) => row.progress),
          itemStyle: {
            color: (params: { dataIndex: number }) =>
              curve23Reports[params.dataIndex]?.riskLevel === '绿'
                ? 'rgba(10,107,92,.72)'
                : 'rgba(154,32,32,.72)',
            borderRadius: 4,
          },
        },
      ],
    }),
    [curve23ProgressRows, curve23Reports],
  );

  const annotationContractOption = useMemo(
    () => ({
      tooltip: { trigger: 'item', formatter: '{b}: {c}万 ({d}%)', confine: true },
      legend: buildBottomLegend(10),
      series: [
        buildRingSeries(
          annotationContractRows.map((row, index) => ({
            value: Number(row.value.toFixed(1)),
            name: row.name,
            itemStyle: {
              color: [
                'rgba(154,32,32,.85)',
                'rgba(10,107,92,.8)',
                'rgba(21,96,184,.75)',
                'rgba(30,53,112,.75)',
                'rgba(154,84,0,.75)',
                'rgba(15,122,107,.7)',
                'rgba(74,46,144,.8)',
              ][index % 7],
            },
          })),
          ['52%', '74%'],
        ),
      ],
    }),
    [annotationContractRows],
  );

  const annotationWeeklyOption = useMemo(
    () => ({
      tooltip: { trigger: 'item', formatter: '{b}: {c}万 ({d}%)', confine: true },
      legend: buildBottomLegend(10),
      series: [
        buildRingSeries(
          annotationWeeklyRows.map((row, index) => ({
            value: Number(row.value.toFixed(1)),
            name: row.name,
            itemStyle: {
              color: [
                'rgba(154,32,32,.85)',
                'rgba(10,107,92,.8)',
                'rgba(21,96,184,.75)',
                'rgba(30,53,112,.75)',
                'rgba(154,84,0,.75)',
              ][index % 5],
            },
          })),
          ['52%', '74%'],
        ),
      ],
    }),
    [annotationWeeklyRows],
  );

  const algoOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: {
        bottom: 0,
        textStyle: { color: '#38385E', fontSize: 10 },
      },
      grid: { top: 18, left: 42, right: 16, bottom: 42 },
      xAxis: {
        type: 'category',
        data: algoRows.map((row) => row.annotationType),
        axisLabel: { color: '#38385E' },
        axisLine: { lineStyle: { color: '#BCC4DF' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: '#38385E', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,.05)' } },
      },
      series: [
        {
          name: '修正率',
          type: 'bar',
          data: algoRows.map((row) => row.modificationRate),
          itemStyle: {
            color: (params: { dataIndex: number }) =>
              algoRows[params.dataIndex]?.modificationRate > 15
                ? 'rgba(154,32,32,.75)'
                : 'rgba(10,107,92,.75)',
            borderRadius: 4,
          },
        },
        {
          name: '目标线15%',
          type: 'line',
          data: algoRows.map(() => 15),
          showSymbol: false,
          lineStyle: { color: 'rgba(154,32,32,.65)', type: 'dashed', width: 2 },
        },
      ],
    }),
    [algoRows],
  );

  const costHealthOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (params: Array<{ axisValue: string; data: number }>) =>
          `${params[0]?.axisValue}<br/>成本健康度：${params[0]?.data === 1 ? '未超支' : '超支'}`,
      },
      grid: { top: 18, left: 42, right: 12, bottom: 56 },
      xAxis: {
        type: 'category',
        data: curve1CostRows.map((row) => compactProjectName(row.report.projectName, 12)),
        axisLabel: { color: '#38385E', fontSize: 10, rotate: 16 },
        axisLine: { lineStyle: { color: '#BCC4DF' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        interval: 1,
        axisLabel: {
          color: '#38385E',
          formatter: (value: number) => (value === 1 ? '未超支' : '超支'),
        },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,.05)' } },
      },
      series: [
        {
          type: 'bar',
          data: curve1CostRows.map((row) => (row.deviation <= 0 ? 1 : 0)),
          itemStyle: {
            borderRadius: 4,
            color: (params: { dataIndex: number }) =>
              curve1CostRows[params.dataIndex]?.deviation <= 0
                ? 'rgba(10,107,92,.78)'
                : 'rgba(154,32,32,.78)',
          },
        },
      ],
    }),
    [curve1CostRows],
  );

  const qualityOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: {
        bottom: 0,
        textStyle: { color: '#38385E', fontSize: 10 },
      },
      grid: { top: 18, left: 42, right: 16, bottom: 42 },
      xAxis: {
        type: 'category',
        data: qualityRows.map((row) => compactProjectName(row.report.projectName, 12)),
        axisLabel: { color: '#38385E', fontSize: 10, rotate: 16 },
        axisLine: { lineStyle: { color: '#BCC4DF' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: '#38385E', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,.05)' } },
      },
      series: [
        {
          name: '验收通过率%',
          type: 'bar',
          data: qualityRows.map((row) => row.report.qualityPass),
          itemStyle: {
            color: (params: { dataIndex: number }) => {
              const value = qualityRows[params.dataIndex]?.report.qualityPass || 0;
              if (value === 0) {
                return 'rgba(120,120,120,.45)';
              }
              if (value < 90) {
                return 'rgba(154,32,32,.8)';
              }
              if (value < 98) {
                return 'rgba(154,84,0,.72)';
              }
              return 'rgba(10,107,92,.72)';
            },
            borderRadius: 3,
          },
        },
        {
          name: '目标线 98%',
          type: 'line',
          data: qualityRows.map(() => 98),
          showSymbol: false,
          lineStyle: { color: 'rgba(154,32,32,.65)', type: 'dashed', width: 2 },
        },
      ],
    }),
    [qualityRows],
  );

  const curve1ProgressOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { top: 18, left: 42, right: 12, bottom: 52 },
      xAxis: {
        type: 'category',
        data: qualityRows.map((row) => compactProjectName(row.report.projectName, 12)),
        axisLabel: { color: '#38385E', fontSize: 10, rotate: 16 },
        axisLine: { lineStyle: { color: '#BCC4DF' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: '#38385E', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,.05)' } },
      },
      series: [
        {
          type: 'bar',
          data: qualityRows.map((row) => Number((progressUnit(row.report.progressPct) * 100).toFixed(1))),
          itemStyle: {
            color: 'rgba(10,107,92,.72)',
            borderRadius: 3,
          },
        },
      ],
    }),
    [qualityRows],
  );

  const pmWeeklyShareOption = useMemo(
    () => ({
      tooltip: { trigger: 'item', formatter: '{b}: {c}万 ({d}%)', confine: true },
      legend: buildBottomLegend(10),
      series: [
        buildRingSeries(
          pmLoadRows.map((row, index) => ({
            value: Number(row.weeklyDelivery.toFixed(3)),
            name: row.pmName,
            itemStyle: {
              color: [
                'rgba(154,32,32,.8)',
                'rgba(10,107,92,.8)',
                'rgba(21,96,184,.8)',
                'rgba(154,84,0,.8)',
                'rgba(74,46,144,.75)',
              ][index % 5],
            },
          })),
          ['42%', '70%'],
        ),
      ],
    }),
    [pmLoadRows],
  );

  const pmStackOption = useMemo(() => {
    const pmNames = pmCards.map((card) => card.pmName);
    const projectNames = Array.from(
      new Set(pmCards.flatMap((card) => card.projects.map((project) => project.projectName))),
    );

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        right: 0,
        top: 0,
        orient: 'vertical',
        textStyle: { color: '#38385E', fontSize: 9 },
      },
      grid: { top: 18, left: 42, right: 140, bottom: 38 },
      xAxis: {
        type: 'category',
        data: pmNames,
        axisLabel: { color: '#38385E' },
        axisLine: { lineStyle: { color: '#BCC4DF' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#38385E', formatter: '{value}h' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,.05)' } },
      },
      series: projectNames.map((projectName, index) => ({
        name: compactProjectName(projectName, 16),
        type: 'bar',
        stack: 'hours',
        data: pmCards.map((card) => {
          const current = card.projects.find((project) => project.projectName === projectName);
          return current ? current.hoursSpent : 0;
        }),
        itemStyle: {
          color: [
            'rgba(21,96,184,.75)',
            'rgba(10,107,92,.75)',
            'rgba(74,46,144,.75)',
            'rgba(154,84,0,.75)',
            'rgba(154,32,32,.75)',
            'rgba(15,122,107,.75)',
            'rgba(30,53,112,.75)',
            'rgba(140,60,20,.75)',
            'rgba(80,110,170,.75)',
            'rgba(40,130,80,.75)',
          ][index % 10],
        },
      })),
    };
  }, [pmCards]);

  const topWeeklyType = annotationWeeklyRows[0] || null;
  const lowRiskCount = latestReports.filter((report) => report.riskLevel === '绿').length;

  async function handleDingtalkLogin() {
    try {
      const corpId = import.meta.env.VITE_DINGTALK_CORP_ID;
      if (!corpId) {
        setLoginStatus('缺少 VITE_DINGTALK_CORP_ID');
        return;
      }

      const payload = await loginWithDingTalk(corpId);
      setLoginStatus(`已登录：${payload.profile.name}`);
    } catch {
      setLoginStatus('钉钉登录失败，请在钉钉容器内重试');
    }
  }

  function updatePreset(preset: 'week' | 'month' | 'quarter') {
    const days = preset === 'week' ? 7 : preset === 'month' ? 30 : 90;
    setFilters((current) => ({
      ...current,
      startDate: daysAgo(days),
      endDate: daysAgo(0),
      mode: 'period',
    }));
  }

  return (
    <div className="dashboard-shell wr-shell">
      <header className="wr-header">
        <div className="wr-header__left">
          <div className="wr-header__icon">📊</div>
          <div>
            <h1>AI数据业务 · 管理层汇报</h1>
            <p>
              数据口径 {filters.startDate} 至 {filters.endDate} · 页面更新于{' '}
              {toDateInputValue(new Date())}
            </p>
          </div>
        </div>
        <div className="wr-header__right">
          <div className="wr-header__focus">🎯 本次重点：本周交付金额 & 成本/预算健康</div>
          <div className="wr-header__date">周汇报视图</div>
        </div>
      </header>

      <div className="wr-toolbar">
        <div className="wr-toolbar__group">
          <button onClick={() => updatePreset('week')}>近一周</button>
          <button onClick={() => updatePreset('month')}>近一月</button>
          <button onClick={() => updatePreset('quarter')}>近一季度</button>
        </div>
        <div className="wr-toolbar__group">
          <label>
            开始日期
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) =>
                setFilters((current) => ({ ...current, startDate: event.target.value }))
              }
            />
          </label>
          <label>
            结束日期
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) =>
                setFilters((current) => ({ ...current, endDate: event.target.value }))
              }
            />
          </label>
          <label>
            曲线类型
            <select
              value={filters.curveType || ''}
              onChange={(event) =>
                setFilters((current) => ({ ...current, curveType: event.target.value }))
              }
            >
              <option value="">全部曲线</option>
              <option value="一曲线">一曲线</option>
              <option value="二曲线">二曲线</option>
              <option value="三曲线">三曲线</option>
            </select>
          </label>
          <label>
            统计模式
            <select
              value={filters.mode}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  mode: event.target.value as 'latest' | 'period',
                }))
              }
            >
              <option value="period">时间区间</option>
              <option value="latest">最新快照</option>
            </select>
          </label>
        </div>
        <div className="wr-toolbar__group">
          <button className="wr-toolbar__login" onClick={handleDingtalkLogin}>
            钉钉免登
          </button>
          <span className="wr-toolbar__status">{loginStatus}</span>
        </div>
      </div>

      <section className="wr-sec">
        <div className="wr-sec__hdr wr-sec__hdr--navy">
          <h2>📊 ① 业务总览</h2>
          <span className="wr-badge">
            {overview.active_projects}个在执行项目 · 合同总规模 {money(overview.total_contract_amount)}万
          </span>
        </div>
        <div className="wr-sec__body">
          <div className="wr-kpi-row">
            {overviewKpis.map((kpi) => (
              <article key={kpi.label} className="wr-kpi">
                <div className="wr-kpi__label" style={{ background: kpi.color }}>
                  {kpi.label}
                </div>
                <div className="wr-kpi__value" style={{ color: kpi.color }}>
                  {kpi.value}
                </div>
                <div className="wr-kpi__sub">{kpi.subtext}</div>
              </article>
            ))}
          </div>
          <div className="wr-grid wr-grid--2">
            <div>
              <div className="wr-chart-title wr-chart-title--teal">一曲线健康度分布（按最新快照）</div>
              <div className="wr-chart wr-chart--ring-compact">
                <ReactECharts option={c1HealthOption} style={{ height: '100%' }} />
              </div>
            </div>
            <div>
              <div className="wr-chart-title wr-chart-title--indigo">二/三曲线部署进度</div>
              {hasCurve23Data ? (
                <>
                  <div className="wr-chart wr-chart--220">
                    <ReactECharts option={curve23ProgressOption} style={{ height: '100%' }} />
                  </div>
                  <div className="wr-note wr-note--green">
                    二/三曲线已按私有化部署口径展示，仅保留里程碑进度、预算执行和风险信息。
                  </div>
                </>
              ) : (
                <div className="wr-empty">当前筛选下无二/三曲线部署项目。</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="wr-sec">
        <div className="wr-sec__hdr wr-sec__hdr--blue">
          <h2>📦 ② 一曲线标注类型价值分布 · 合同金额 vs 本周交付</h2>
        </div>
        <div className="wr-sec__body">
          {hasCurve1Data ? (
            <div className="wr-grid wr-grid--2 wr-grid--center">
              <div>
                <div className="wr-chart-title wr-chart-title--blue">合同金额占比（万元）</div>
                <div className="wr-chart wr-chart--ring-wide">
                  <ReactECharts option={annotationContractOption} style={{ height: '100%' }} />
                </div>
              </div>
              <div>
                <div className="wr-chart-title wr-chart-title--blue">本周交付金额占比（万元）</div>
                <div className="wr-chart wr-chart--ring-wide">
                  <ReactECharts option={annotationWeeklyOption} style={{ height: '100%' }} />
                </div>
                <div className="wr-note wr-note--amber">
                  当前 <b>{topWeeklyType?.name || '重点类型'}</b> 本周交付金额占比最高，为{' '}
                  <b>
                    {topWeeklyType && overview.curve1_delivery_in_period > 0
                      ? percentFromUnit(topWeeklyType.value / overview.curve1_delivery_in_period)
                      : '0%'}
                  </b>
                  。
                </div>
              </div>
            </div>
          ) : (
            <div className="wr-empty">当前筛选下无一曲线项目，本区不展示标注类型与交付分布。</div>
          )}
        </div>
      </section>

      <section className="wr-sec">
        <div className="wr-sec__hdr wr-sec__hdr--purple">
          <h2>🤖 ③ 一曲线算法优化专项 · 修正率 & 提效分析</h2>
        </div>
        <div className="wr-sec__body">
          {hasCurve1Data ? (
            <>
              <div className="wr-grid wr-grid--2">
                <div>
                  <div className="wr-chart-title wr-chart-title--purple">本期算法修正率（越低越好）</div>
                  <div className="wr-chart wr-chart--180">
                    <ReactECharts option={algoOption} style={{ height: '100%' }} />
                  </div>
                  <div className="wr-note" style={{ borderLeftColor: COLOR.purple }}>
                    📌 目标线：点云/图像类 ≤ 15% · 当前以最新周填报记录为准
                  </div>
                </div>
                <div>
                  <div className="wr-chart-title wr-chart-title--purple">本期算法效果详情</div>
                  <div className="wr-table-wrap">
                    <table className="wr-table">
                      <thead>
                        <tr>
                          <th>标注类型</th>
                          <th>批次日期</th>
                          <th>算法版本</th>
                          <th>修正率%</th>
                          <th>本期样本量</th>
                          <th>提效%</th>
                          <th>优化优先级</th>
                        </tr>
                      </thead>
                      <tbody>
                        {algoRows.map((row) => (
                          <tr key={`${row.projectId}-${row.weekStart}`}>
                            <td className="wr-table__project">{row.annotationType}</td>
                            <td>{row.weekStart}</td>
                            <td>{row.algoVersion || '—'}</td>
                            <td>
                              <b
                                style={{
                                  color: row.modificationRate > 15 ? COLOR.red : COLOR.teal,
                                }}
                              >
                                {percentFromRaw(row.modificationRate)}
                              </b>
                            </td>
                            <td>{row.actualQty.toLocaleString('zh-CN')}</td>
                            <td>{percentFromRaw(row.timeSavePct)}</td>
                            <td>
                              <span
                                className={
                                  row.modificationRate > 30
                                    ? 'wr-tag wr-tag--red'
                                    : row.modificationRate > 15
                                      ? 'wr-tag wr-tag--amber'
                                      : 'wr-tag wr-tag--blue'
                                }
                              >
                                {row.modificationRate > 30
                                  ? 'P0 重点优化'
                                  : row.modificationRate > 15
                                    ? 'P1 优先优化'
                                    : 'P2 持续跟踪'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="wr-note" style={{ background: '#F3E5F5', borderLeftColor: COLOR.purple }}>
                🚀 <b>算法观察：</b>最高修正率为{' '}
                <b>{algoRows[0]?.annotationType || '—'}</b> {algoRows[0] ? percentFromRaw(algoRows[0].modificationRate) : '—'}；
                最高提效为 <b>{[...algoRows].sort((a, b) => b.timeSavePct - a.timeSavePct)[0]?.annotationType || '—'}</b>{' '}
                {[...algoRows].sort((a, b) => b.timeSavePct - a.timeSavePct)[0]
                  ? percentFromRaw([...algoRows].sort((a, b) => b.timeSavePct - a.timeSavePct)[0].timeSavePct)
                  : '—'}
                。
              </div>
            </>
          ) : (
            <div className="wr-empty">当前筛选下无一曲线项目，本区不展示标注算法指标。</div>
          )}
        </div>
      </section>

      <section className="wr-sec">
        <div className="wr-sec__hdr wr-sec__hdr--navy">
          <h2>💰 ④ 成本与执行专项 · 分曲线统计</h2>
          <span className="wr-badge">一曲线按标注交付口径；二/三曲线按私有化部署口径</span>
        </div>
        <div className="wr-sec__body">
          <div className="wr-chart-title wr-chart-title--navy">一曲线成本健康状态（按项目）</div>
          <div className="wr-chart wr-chart--260">
            <ReactECharts option={costHealthOption} style={{ height: '100%' }} />
          </div>

          <div className="wr-chart-title wr-chart-title--navy wr-chart-title--mt">一曲线成本分析明细</div>
          <div className="wr-table-wrap">
            <table className="wr-table">
              <thead>
                <tr>
                  <th>项目名称</th>
                  <th>PM</th>
                  <th>进度%</th>
                  <th>本周交付金额(万)</th>
                  <th>累计交付金额(万)</th>
                  <th>成本偏差(万)</th>
                  <th>偏差率</th>
                  <th>综合健康度</th>
                  <th>成本状态</th>
                </tr>
              </thead>
              <tbody>
                {curve1CostRows.map((row) => {
                  const tag = healthTag(row.report.riskLevel);
                  return (
                    <tr key={row.report.projectId}>
                      <td className="wr-table__project">{row.report.projectName}</td>
                      <td>{row.report.pmName}</td>
                      <td>{percentFromUnit(progressUnit(row.report.progressPct))}</td>
                      <td className="wr-money">{money(row.report.weeklyDeliveryAmount)}</td>
                      <td className="wr-money">{money(row.report.amountDelivered)}</td>
                      <td className={row.deviation > 0 ? 'wr-over' : row.deviation < 0 ? 'wr-save' : 'wr-ok'}>
                        {row.deviation > 0 ? '+' : ''}
                        {money(row.deviation)}
                      </td>
                      <td className={row.deviationRate > 0 ? 'wr-over' : row.deviationRate < 0 ? 'wr-save' : 'wr-ok'}>
                        {row.deviationRate > 0 ? '+' : ''}
                        {percentFromUnit(row.deviationRate)}
                      </td>
                      <td>
                        <span className={tag.className}>{tag.text}</span>
                      </td>
                      <td>
                        <span className={row.deviation > 0 ? 'wr-tag wr-tag--red' : 'wr-tag wr-tag--green'}>
                          {row.deviation > 0 ? '超支' : '未超支'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="wr-note wr-note--amber">
            ⚠ 判定规则：当前先按“实际成本 vs 应耗预算”计算偏差；项目未开始时默认记为“未超支”。
          </div>

          <div className="wr-chart-title wr-chart-title--indigo wr-chart-title--mt">
            二/三曲线部署执行明细（预算 / 里程碑口径）
          </div>
          <div className="wr-table-wrap">
            <table className="wr-table">
            <thead>
              <tr>
                <th>项目名称</th>
                <th>PM</th>
                <th>进度%</th>
                <th>预算总额(万)</th>
                <th>已耗成本(万)</th>
                <th>应耗预算(万)</th>
                <th>偏差(万)</th>
                <th>偏差率</th>
                <th>综合健康度</th>
                <th>执行状态</th>
              </tr>
            </thead>
            <tbody>
              {curve23ExecutionRows.map((row) => {
                const tag = healthTag(row.report.riskLevel);
                return (
                  <tr key={row.report.projectId}>
                    <td className="wr-table__project">{row.report.projectName}</td>
                    <td>{row.report.pmName}</td>
                    <td>{percentFromUnit(progressUnit(row.report.progressPct))}</td>
                    <td>{money(row.report.budgetTotal)}</td>
                    <td>{money(row.report.costConsumed)}</td>
                    <td>{money(row.expectedBudget)}</td>
                    <td className={row.deviation > 0 ? 'wr-over' : row.deviation < 0 ? 'wr-save' : 'wr-ok'}>
                      {row.deviation > 0 ? '+' : ''}
                      {money(row.deviation)}
                    </td>
                    <td className={row.deviationRate > 0 ? 'wr-over' : row.deviationRate < 0 ? 'wr-save' : 'wr-ok'}>
                      {row.deviationRate > 0 ? '+' : ''}
                      {percentFromUnit(row.deviationRate)}
                    </td>
                    <td>
                      <span className={tag.className}>{tag.text}</span>
                    </td>
                    <td>
                      <span className={row.deviation > 0 ? 'wr-tag wr-tag--red' : 'wr-tag wr-tag--green'}>
                        {row.deviation > 0 ? '偏离' : '在控'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
          <div className="wr-note wr-note--amber">
            二/三曲线为私有化部署项目，本区不展示标注数量、标注单位和供应商信息。
          </div>
        </div>
      </section>

      <section className="wr-sec">
        <div className="wr-sec__hdr wr-sec__hdr--amber">
          <h2>🎯 ⑤ 一曲线质量管控专项 · 当前质量问题全景</h2>
          <span className="wr-badge">基于一曲线项目最新快照</span>
        </div>
        <div className="wr-sec__body">
          {hasCurve1Data ? (
            <>
              <div className="wr-grid wr-grid--2">
            <div>
              <div className="wr-chart-title wr-chart-title--amber">一曲线：有验收数据的项目质量对比</div>
              <div className="wr-chart wr-chart--220">
                <ReactECharts option={qualityOption} style={{ height: '100%' }} />
              </div>
              <div className="wr-note wr-note--red">
                ⚠ 当前质量目标线为 98%；无验收数据项目{' '}
                {qualityRows.filter((row) => row.report.qualityPass === 0).length} 个。
              </div>
            </div>
            <div>
              <div className="wr-chart-title wr-chart-title--amber">一曲线各项目进度</div>
              <div className="wr-chart wr-chart--210">
                <ReactECharts option={curve1ProgressOption} style={{ height: '100%' }} />
              </div>
              <div className="wr-note wr-note--amber">
                {qualityRows
                  .filter((row) => row.report.riskLevel !== '绿')
                  .slice(0, 4)
                  .map((row) => row.report.projectName)
                  .join('；') || '当前暂无重点项目'}
                需持续跟踪进度与质量联动。
              </div>
            </div>
          </div>

          <div className="wr-chart-title wr-chart-title--amber wr-chart-title--mt">一曲线项目质量明细表</div>
          <div className="wr-table-wrap">
            <table className="wr-table">
            <thead>
              <tr>
                <th>项目名称</th>
                <th>PM</th>
                <th>进度%</th>
                <th>实际交付量</th>
                <th>验收率</th>
                <th>合同额(万)</th>
                <th>已用成本(万)</th>
                <th>状态</th>
                <th>健康</th>
                <th>当前问题</th>
              </tr>
            </thead>
            <tbody>
              {qualityRows.map((row) => {
                const tag = healthTag(row.report.riskLevel);
                return (
                  <tr key={row.report.projectId}>
                    <td className="wr-table__project">{row.report.projectName}</td>
                    <td>{row.report.pmName}</td>
                    <td>
                      <b>{percentFromUnit(progressUnit(row.report.progressPct))}</b>
                      <div className="wr-progress">
                        <div
                          className="wr-progress__fill"
                          style={{
                            width: `${progressUnit(row.report.progressPct) * 100}%`,
                            background:
                              row.report.riskLevel === '红'
                                ? COLOR.red
                                : row.report.riskLevel === '黄'
                                  ? COLOR.amber
                                  : COLOR.teal,
                          }}
                        />
                      </div>
                    </td>
                    <td>{row.report.actualQty.toLocaleString('zh-CN')}</td>
                    <td>{row.report.qualityPass > 0 ? percentFromRaw(row.report.qualityPass) : '—'}</td>
                    <td>{money(row.report.budgetTotal)}</td>
                    <td>
                      <b>{money(row.report.costConsumed)}</b>
                    </td>
                    <td>
                      <span className="wr-tag wr-tag--neutral">
                        {progressUnit(row.report.progressPct) === 0 ? '未启动' : '执行中'}
                      </span>
                    </td>
                    <td>
                      <span className={tag.className}>{tag.text}</span>
                    </td>
                    <td className="wr-issue">
                      <b>{row.issue}</b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
            </>
          ) : (
            <div className="wr-empty">当前筛选下无一曲线项目，本区不展示质量验收与标注交付信息。</div>
          )}
        </div>
      </section>

      <section className="wr-sec">
        <div className="wr-sec__hdr wr-sec__hdr--red">
          <h2>🚨 ⑥ 本周风险预警 · {riskRows.length}条（按优先级排序）</h2>
          <span className="wr-badge wr-badge--warn">另有低风险 {lowRiskCount} 条，未纳入预警主表</span>
        </div>
        <div className="wr-sec__body">
          <div className="wr-table-wrap">
            <table className="wr-risk-table">
            <thead>
              <tr>
                <th>风险级别</th>
                <th>项目名称</th>
                <th>风险描述</th>
                <th>影响范围</th>
                <th>建议决策动作</th>
                <th>责任PM</th>
                <th>计划解决日期</th>
              </tr>
            </thead>
            <tbody>
              {riskRows.map((row) => (
                <tr key={row.projectId}>
                  <td>
                    <span className={row.riskLevel === '红' ? 'wr-tag wr-tag--red' : 'wr-tag wr-tag--amber'}>
                      {row.riskLevel === '红' ? '🔴 高' : '🟡 中'}
                    </span>
                  </td>
                  <td className="wr-table__project">{row.projectName}</td>
                  <td>{row.riskDesc}</td>
                  <td>{getRiskImpact(row)}</td>
                  <td>{row.suggestedAction || row.nextWeekFocus || '继续跟进'}</td>
                  <td>{row.pmName}</td>
                  <td>{row.blockerDueDate || '—'}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="wr-sec">
        <div className="wr-sec__hdr wr-sec__hdr--summary">
          <h2>📋 ⑦ 综合结论 · 管理层决策建议</h2>
        </div>
        <div className="wr-sec__body">
          <div className="wr-summary-grid">
            {weeklySummaryBoxes.map((box) => (
              <article key={box.title} className={`wr-summary wr-summary--${box.tone}`}>
                <h3>{box.title}</h3>
                <ul>
                  {box.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wr-sec">
        <div className="wr-sec__hdr wr-sec__hdr--pm">
          <h2>👤 ⑧ 人员管理专项 · 一曲线交付分布 & 全员负载分析</h2>
          <span className="wr-badge">统计周：{filters.endDate}</span>
        </div>
        <div className="wr-sec__body">
          <div className="wr-grid wr-grid--2">
            <div>
              <div className="wr-chart-title wr-chart-title--pm">一曲线项目经理本周交付金额占比</div>
              {hasCurve1Data ? (
                <>
                  <div className="wr-chart wr-chart--ring-compact">
                    <ReactECharts option={pmWeeklyShareOption} style={{ height: '100%' }} />
                  </div>
                  <div className="wr-note wr-note--green">
                    仅展示本周交付金额 &gt; 0 的项目经理；取值来自周填报本周交付金额字段。
                  </div>
                </>
              ) : (
                <div className="wr-empty">当前筛选下无一曲线项目，交付占比图不适用。</div>
              )}
            </div>
            <div>
              <div className="wr-chart-title wr-chart-title--pm">各PM项目时间投入分布（堆叠图）</div>
              <div className="wr-chart wr-chart--260">
                <ReactECharts option={pmStackOption} style={{ height: '100%' }} />
              </div>
            </div>
          </div>

          <div className="wr-chart-title wr-chart-title--pm wr-chart-title--mt">本周一曲线 PM交付金额统计</div>
          <div className="wr-table-wrap">
            <table className="wr-table">
            <thead>
              <tr>
                <th>PM姓名</th>
                <th>一曲线项目数</th>
                <th>本周交付(万)</th>
                <th>交付占比</th>
                <th>本周工时</th>
                <th>负载状态</th>
              </tr>
            </thead>
            <tbody>
              {pmLoadRows.map((row) => (
                <tr key={row.pmName}>
                  <td className="wr-table__project">{row.pmName}</td>
                  <td>{row.projectCount}</td>
                  <td className="wr-money">{money(row.weeklyDelivery)}</td>
                  <td>{percentFromUnit(row.share)}</td>
                  <td>{row.totalHours}h</td>
                  <td>
                    <span className={`wr-tag wr-tag--load-${row.tone}`}>{row.label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          <div className="wr-pm-grid">
            {pmCards.map((card) => (
              <article key={card.pmName} className={`wr-pm-card wr-pm-card--${card.tone}`}>
                <div className="wr-pm-card__name">{card.pmName}</div>
                <div className="wr-pm-card__hours">{card.totalHours}h</div>
                <span className={`wr-pm-card__badge wr-pm-card__badge--${card.tone}`}>{card.label}</span>
                <div className="wr-pm-card__bar">
                  <div
                    className="wr-pm-card__bar-fill"
                    style={{
                      width: `${Math.min((card.totalHours / 60) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div className="wr-pm-card__projects">
                  {card.projects.map((project) => (
                    <div key={project.projectName}>
                      <div className="wr-pm-card__project">
                        <span>{project.projectName}</span>
                        <span>
                          {project.hoursSpent}h <small>{percentFromUnit(project.share)}</small>
                        </span>
                      </div>
                      <div className="wr-pm-card__project-bar">
                        <div
                          className="wr-pm-card__project-fill"
                          style={{ width: `${project.share * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="wr-pm-card__alert">
                  当前覆盖 {card.projects.length} 个项目，最高投入为{' '}
                  {card.projects[0]?.projectName || '—'}。
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="wr-footer">
        数据来源：项目管理周填报运行时数据 · 参考模板：项目看板_0419.html · 页面更新日期{' '}
        {toDateInputValue(new Date())}
      </footer>
    </div>
  );
}
