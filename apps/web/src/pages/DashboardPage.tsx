import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';

import { MetricCard } from '../components/MetricCard';
import { SectionCard } from '../components/SectionCard';
import { TimeRangeBar } from '../components/TimeRangeBar';
import {
  DashboardFilters,
  getAlgoTrend,
  getCostRoiTrend,
  getOverview,
  getProjectProgress,
  getRiskTrend,
  getSupplierTrend,
  OverviewMetrics,
  ProjectProgressRow,
  TrendRow,
} from '../lib/api';
import { loginWithDingTalk } from '../lib/dingtalk';

type ReportView =
  | 'weekly-summary'
  | 'risk-review'
  | 'delivery-review'
  | 'team-sync';

type BriefTone = 'blue' | 'teal' | 'amber' | 'red';

const REPORT_VIEW_STORAGE_KEY = 'project-platform-weekly-report-view';

const REPORT_VIEW_META: Record<
  ReportView,
  { label: string; badge: string; description: string }
> = {
  'weekly-summary': {
    label: '周汇报总览',
    badge: '借鉴 Plane Views',
    description: '适合老板周会或总监例会，先讲结论、再看变化、最后落动作。',
  },
  'risk-review': {
    label: '风险与阻碍',
    badge: '借鉴 Leantime 状态更新',
    description: '聚焦红黄灯、阻碍事项和需协调决策，适合专项推进会。',
  },
  'delivery-review': {
    label: '交付与经营',
    badge: '借鉴 OpenProject 成本治理',
    description: '聚焦交付、成本、ROI、供应商和算法提效，适合经营复盘。',
  },
  'team-sync': {
    label: '团队同步',
    badge: '借鉴项目工作台',
    description: '聚焦项目 owner、团队节奏和跨项目同步事项，适合 PM 周会。',
  },
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

function currency(value: number) {
  return `${value.toFixed(1)} 万`;
}

function percent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function toneFromRisk(
  riskLevel: string,
): 'ok' | 'warn' | 'danger' {
  if (riskLevel === '红') {
    return 'danger';
  }

  if (riskLevel === '黄') {
    return 'warn';
  }

  return 'ok';
}

function riskRank(riskLevel: string) {
  if (riskLevel === '红') {
    return 0;
  }

  if (riskLevel === '黄') {
    return 1;
  }

  return 2;
}

function getProjectAction(row: ProjectProgressRow) {
  if (row.current_risk_level === '红') {
    return '需要总监牵头协调资源或客户决策，避免影响下周里程碑。';
  }

  if (row.current_risk_level === '黄') {
    return '本周继续跟 Blocker 和责任人，确保下个快照前完成收敛。';
  }

  if (row.progress_delta <= 0) {
    return '项目整体在控，但进展无明显推进，建议拆细动作和验收节点。';
  }

  return '保持当前节奏，按既定计划推进交付和质量稳定。';
}

function getInitialReportView(): ReportView {
  if (typeof window === 'undefined') {
    return 'weekly-summary';
  }

  const stored = window.localStorage.getItem(REPORT_VIEW_STORAGE_KEY);
  if (stored && stored in REPORT_VIEW_META) {
    return stored as ReportView;
  }

  return 'weekly-summary';
}

function chartDates(rows: TrendRow[]) {
  return rows.map(
    (row) => row.snapshot_date || row.snapshot_week || row.batch_date || '',
  );
}

export function DashboardPage() {
  const [reportView, setReportView] = useState<ReportView>(getInitialReportView);
  const [filters, setFilters] = useState<DashboardFilters>({
    startDate: daysAgo(30),
    endDate: daysAgo(0),
    mode: 'period',
    curveType: '',
  });
  const [overview, setOverview] = useState(DEFAULT_OVERVIEW);
  const [projectProgress, setProjectProgress] = useState<ProjectProgressRow[]>(
    [],
  );
  const [riskTrend, setRiskTrend] = useState<TrendRow[]>([]);
  const [costTrend, setCostTrend] = useState<TrendRow[]>([]);
  const [supplierTrend, setSupplierTrend] = useState<TrendRow[]>([]);
  const [algoTrend, setAlgoTrend] = useState<TrendRow[]>([]);
  const [loginStatus, setLoginStatus] = useState('未登录钉钉');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REPORT_VIEW_STORAGE_KEY, reportView);
    }
  }, [reportView]);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      getOverview(filters),
      getProjectProgress(filters),
      getRiskTrend(filters),
      getCostRoiTrend(filters),
      getSupplierTrend(filters),
      getAlgoTrend(filters),
    ])
      .then(
        ([
          overviewResponse,
          projectProgressResponse,
          riskTrendResponse,
          costTrendResponse,
          supplierTrendResponse,
          algoTrendResponse,
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

  const progressOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 30, left: 36, right: 16, bottom: 60 },
      xAxis: {
        type: 'category',
        data: projectProgress.map((item) => item.project_name),
        axisLabel: { rotate: 25, color: '#c1d7ff' },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#c1d7ff', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.08)' } },
      },
      series: [
        {
          type: 'bar',
          data: projectProgress.map((item) =>
            Number((item.end_progress * 100).toFixed(1)),
          ),
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: '#24d3ee',
          },
        },
      ],
    }),
    [projectProgress],
  );

  const riskOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: '#c1d7ff' } },
      grid: { top: 40, left: 36, right: 16, bottom: 30 },
      xAxis: {
        type: 'category',
        data: chartDates(riskTrend),
        axisLabel: { color: '#c1d7ff' },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#c1d7ff' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.08)' } },
      },
      series: [
        {
          name: '红色风险',
          type: 'line',
          smooth: true,
          data: riskTrend.map((item) => item.red_count || 0),
          color: '#ff6b6b',
        },
        {
          name: '黄色风险',
          type: 'line',
          smooth: true,
          data: riskTrend.map((item) => item.yellow_count || 0),
          color: '#ffc857',
        },
      ],
    }),
    [riskTrend],
  );

  const costOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: '#c1d7ff' } },
      grid: { top: 40, left: 36, right: 16, bottom: 30 },
      xAxis: {
        type: 'category',
        data: chartDates(costTrend),
        axisLabel: { color: '#c1d7ff' },
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: { color: '#c1d7ff' },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,.08)' } },
        },
        {
          type: 'value',
          axisLabel: { color: '#c1d7ff' },
        },
      ],
      series: [
        {
          name: '累计成本',
          type: 'bar',
          data: costTrend.map((item) => item.total_cost_consumed || 0),
          color: '#3b82f6',
        },
        {
          name: 'ROI',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: costTrend.map((item) => item.roi_value || 0),
          color: '#34d399',
        },
      ],
    }),
    [costTrend],
  );

  const supplierOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: '#c1d7ff' } },
      grid: { top: 40, left: 36, right: 16, bottom: 30 },
      xAxis: {
        type: 'category',
        data: chartDates(supplierTrend),
        axisLabel: { color: '#c1d7ff' },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#c1d7ff',
          formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.08)' } },
      },
      series: [
        {
          name: '质量合格率',
          type: 'line',
          smooth: true,
          data: supplierTrend.map((item) => item.avg_quality_pass || 0),
          color: '#8b5cf6',
        },
        {
          name: '准时率',
          type: 'line',
          smooth: true,
          data: supplierTrend.map((item) => item.avg_otd_rate || 0),
          color: '#06b6d4',
        },
      ],
    }),
    [supplierTrend],
  );

  const algoOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: '#c1d7ff' } },
      grid: { top: 40, left: 36, right: 16, bottom: 30 },
      xAxis: {
        type: 'category',
        data: chartDates(algoTrend),
        axisLabel: { color: '#c1d7ff' },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#c1d7ff',
          formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,.08)' } },
      },
      series: [
        {
          name: '平均修正率',
          type: 'bar',
          data: algoTrend.map((item) => item.avg_modification_rate || 0),
          color: '#fb7185',
        },
        {
          name: '平均提效',
          type: 'line',
          smooth: true,
          data: algoTrend.map((item) => item.avg_time_save_pct || 0),
          color: '#22c55e',
        },
      ],
    }),
    [algoTrend],
  );

  const summaryText = useMemo(
    () =>
      `${filters.startDate} 至 ${filters.endDate}，共 ${overview.active_projects} 个在执行项目，红灯 ${overview.red_risk_projects} 个，黄色预警 ${overview.yellow_risk_projects} 个，累计 ROI ${overview.roi_value.toFixed(2)}。`,
    [filters, overview],
  );

  const reportViewMeta = REPORT_VIEW_META[reportView];

  const focusProjects = useMemo(
    () =>
      [...projectProgress]
        .sort((left, right) => {
          return (
            riskRank(left.current_risk_level) - riskRank(right.current_risk_level) ||
            left.progress_delta - right.progress_delta ||
            right.cost_at_end - left.cost_at_end
          );
        })
        .slice(0, 4),
    [projectProgress],
  );

  const decisionProjects = useMemo(
    () =>
      [...projectProgress]
        .filter(
          (row) => row.current_risk_level !== '绿' || row.progress_delta <= 0,
        )
        .sort((left, right) => {
          return (
            riskRank(left.current_risk_level) - riskRank(right.current_risk_level) ||
            left.progress_delta - right.progress_delta
          );
        })
        .slice(0, 4),
    [projectProgress],
  );

  const bestProject = useMemo(
    () =>
      [...projectProgress].sort(
        (left, right) =>
          right.progress_delta - left.progress_delta ||
          right.delivery_in_period - left.delivery_in_period,
      )[0] || null,
    [projectProgress],
  );

  const teamSummaries = useMemo(() => {
    const summaryMap = new Map<
      string,
      {
        pmName: string;
        projectCount: number;
        deliveryAmount: number;
        avgProgress: number;
        riskCount: number;
        costAmount: number;
      }
    >();

    for (const row of projectProgress) {
      const pmName = row.pm_user_id || '未分配';
      const current = summaryMap.get(pmName) || {
        pmName,
        projectCount: 0,
        deliveryAmount: 0,
        avgProgress: 0,
        riskCount: 0,
        costAmount: 0,
      };

      current.projectCount += 1;
      current.deliveryAmount += row.delivery_in_period;
      current.avgProgress += row.end_progress;
      current.costAmount += row.cost_at_end;
      if (row.current_risk_level !== '绿') {
        current.riskCount += 1;
      }

      summaryMap.set(pmName, current);
    }

    return Array.from(summaryMap.values())
      .map((item) => ({
        ...item,
        avgProgress:
          item.projectCount > 0 ? item.avgProgress / item.projectCount : 0,
      }))
      .sort(
        (left, right) =>
          right.projectCount - left.projectCount ||
          right.deliveryAmount - left.deliveryAmount,
      );
  }, [projectProgress]);

  const briefCards = useMemo(() => {
    const cards: Array<{
      title: string;
      body: string;
      tone: BriefTone;
    }> = [];

    if (reportView === 'weekly-summary') {
      cards.push(
        {
          title: '本周结论',
          body: `当前共有 ${overview.active_projects} 个项目纳入周汇报，红灯 ${overview.red_risk_projects} 个，整体更适合按“重点项目 + 风险动作”方式汇报。`,
          tone: 'blue',
        },
        {
          title: '需管理层关注',
          body:
            decisionProjects[0]
              ? `${decisionProjects[0].project_name} 当前为 ${decisionProjects[0].current_risk_level} 灯，建议先讲项目风险与协调动作。`
              : '当前没有突出的红黄灯项目，可按常规经营节奏汇报。',
          tone: 'red',
        },
        {
          title: '本周亮点',
          body:
            bestProject
              ? `${bestProject.project_name} 进展提升 ${percent(
                  bestProject.progress_delta,
                )}，可作为周会中的正向案例。`
              : '当前暂无明显亮点项目，建议以整体经营趋势展开。',
          tone: 'teal',
        },
        {
          title: '下周动作',
          body: '围绕风险收敛、成本稳定、重点项目推进和责任人动作闭环展开。',
          tone: 'amber',
        },
      );
    }

    if (reportView === 'risk-review') {
      cards.push(
        {
          title: '红黄灯扫描',
          body: `当前红灯 ${overview.red_risk_projects} 个，黄灯 ${overview.yellow_risk_projects} 个，建议优先看项目状态卡和协调清单。`,
          tone: 'red',
        },
        {
          title: '需协调事项',
          body:
            decisionProjects.length > 0
              ? `本周建议至少协调 ${decisionProjects.length} 个重点项目，避免风险延续到下周快照。`
              : '本周未出现明确的协调项，可转为例行跟踪。',
          tone: 'amber',
        },
        {
          title: '在控项目',
          body: `${projectProgress.filter((item) => item.current_risk_level === '绿').length} 个项目处于绿灯，可作为对比口径说明整体在控面。`,
          tone: 'teal',
        },
        {
          title: '处置建议',
          body: '每个红黄灯项目都需要明确责任人、截止日期和下个快照前的收敛标准。',
          tone: 'blue',
        },
      );
    }

    if (reportView === 'delivery-review') {
      cards.push(
        {
          title: '经营口径',
          body: `区间累计成本 ${currency(
            overview.total_cost,
          )}，ROI ${overview.roi_value.toFixed(2)}，建议按交付、成本、资源三段讲清楚。`,
          tone: 'blue',
        },
        {
          title: '交付观察',
          body: `一曲线区间交付 ${currency(
            overview.curve1_delivery_in_period,
          )}，适合作为周汇报中的交付主线。`,
          tone: 'teal',
        },
        {
          title: '供应商观察',
          body: '供应商页建议重点讲质量与准时率变化，不建议只报绝对投入。 ',
          tone: 'amber',
        },
        {
          title: '算法观察',
          body: '算法页建议同时讲修正率和提效，不单讲模型版本。',
          tone: 'red',
        },
      );
    }

    if (reportView === 'team-sync') {
      cards.push(
        {
          title: '本周协同重点',
          body: `当前活跃 PM ${overview.active_pms} 位，更适合按负责人和项目组汇报，而不是按图表逐个讲。`,
          tone: 'blue',
        },
        {
          title: '待同步事项',
          body:
            decisionProjects[0]
              ? `${decisionProjects[0].project_name} 需要优先同步责任人与截止日期。`
              : '当前暂无明显阻塞项，可聚焦节奏和交付节拍。',
          tone: 'red',
        },
        {
          title: '团队节奏',
          body: '建议每位 PM 周会上只讲“进展变化 + 风险 + 下周动作”三件事。',
          tone: 'teal',
        },
        {
          title: '下周准备',
          body: '把周报快照、重点项目、资源协调事项和客户变化提前同步到总监视图。',
          tone: 'amber',
        },
      );
    }

    return cards;
  }, [
    bestProject,
    decisionProjects,
    overview.active_pms,
    overview.active_projects,
    overview.curve1_delivery_in_period,
    overview.red_risk_projects,
    overview.roi_value,
    overview.total_cost,
    overview.yellow_risk_projects,
    projectProgress,
    reportView,
  ]);

  async function handleDingtalkLogin() {
    try {
      const corpId = import.meta.env.VITE_DINGTALK_CORP_ID;
      if (!corpId) {
        setLoginStatus('缺少 VITE_DINGTALK_CORP_ID');
        return;
      }

      const payload = await loginWithDingTalk(corpId);
      setLoginStatus(`已登录：${payload.profile.name}`);
    } catch (error) {
      setLoginStatus('钉钉登录失败，请在钉钉容器内重试');
    }
  }

  function updatePreset(preset: 'week' | 'month' | 'quarter') {
    const days = preset === 'week' ? 7 : preset === 'month' ? 30 : 90;
    setFilters((current) => ({
      ...current,
      startDate: daysAgo(days),
      endDate: daysAgo(0),
    }));
  }

  return (
    <div className="dashboard-shell">
      <header className="hero">
        <div>
          <p className="hero__eyebrow">DingTalk Weekly Report View</p>
          <h1>项目经营周汇报视图</h1>
          <p className="hero__summary">
            {summaryText} {reportViewMeta.description}
          </p>
        </div>
        <div className="hero__status">
          <span>当前视角</span>
          <strong>{reportViewMeta.label}</strong>
          <span>钉钉状态</span>
          <strong>{loginStatus}</strong>
        </div>
      </header>

      <TimeRangeBar
        startDate={filters.startDate}
        endDate={filters.endDate}
        mode={filters.mode}
        curveType={filters.curveType || ''}
        onPresetChange={updatePreset}
        onStartDateChange={(startDate) =>
          setFilters((current) => ({ ...current, startDate }))
        }
        onEndDateChange={(endDate) =>
          setFilters((current) => ({ ...current, endDate }))
        }
        onModeChange={(mode) => setFilters((current) => ({ ...current, mode }))}
        onCurveTypeChange={(curveType) =>
          setFilters((current) => ({ ...current, curveType }))
        }
        onLoginClick={handleDingtalkLogin}
      />

      <section className="report-view-tabs">
        {(Object.entries(REPORT_VIEW_META) as Array<
          [ReportView, (typeof REPORT_VIEW_META)[ReportView]]
        >).map(([key, meta]) => (
          <button
            key={key}
            className={reportView === key ? 'is-active' : ''}
            onClick={() => setReportView(key)}
          >
            <strong>{meta.label}</strong>
            <span>{meta.badge}</span>
          </button>
        ))}
      </section>

      <section className="report-brief-grid">
        {briefCards.map((card) => (
          <article
            key={card.title}
            className={`report-brief-card report-brief-card--${card.tone}`}
          >
            <p>{card.title}</p>
            <strong>{card.title}</strong>
            <span>{card.body}</span>
          </article>
        ))}
      </section>

      <section className="metric-grid">
        <MetricCard
          label="在执行项目"
          value={String(overview.active_projects)}
          subtext={`在执行 PM ${overview.active_pms}`}
          tone="blue"
        />
        <MetricCard
          label="一曲线合同额"
          value={currency(overview.curve1_contract_amount)}
          subtext={`区间交付 ${currency(overview.curve1_delivery_in_period)}`}
          tone="teal"
        />
        <MetricCard
          label="二/三曲线合同额"
          value={currency(overview.curve23_contract_amount)}
          subtext={`健康率 ${percent(overview.curve23_health_rate)}`}
          tone="blue"
        />
        <MetricCard
          label="风险预警"
          value={String(overview.red_risk_projects)}
          subtext={`黄色预警 ${overview.yellow_risk_projects}`}
          tone="red"
        />
        <MetricCard
          label="一曲线健康率"
          value={percent(overview.curve1_health_rate)}
          subtext="基于筛选区间最新快照"
          tone="teal"
        />
        <MetricCard
          label="ROI"
          value={overview.roi_value.toFixed(2)}
          subtext={`累计成本 ${currency(overview.total_cost)}`}
          tone="amber"
        />
      </section>

      <section className="status-board">
        {focusProjects.map((project) => (
          <article
            key={project.project_id}
            className={`status-card status-card--${toneFromRisk(
              project.current_risk_level,
            )}`}
          >
            <div className="status-card__header">
              <div>
                <span>{project.curve_type}</span>
                <strong>{project.project_name}</strong>
              </div>
              <em>{project.current_risk_level || '绿'}灯</em>
            </div>
            <p className="status-card__desc">
              当前进度 {percent(project.end_progress)}，区间变化{' '}
              {percent(project.progress_delta)}，适合作为周会重点项目状态更新。
            </p>
            <div className="status-card__metrics">
              <div>
                <span>PM</span>
                <strong>{project.pm_user_id || '未分配'}</strong>
              </div>
              <div>
                <span>区间交付</span>
                <strong>{currency(project.delivery_in_period)}</strong>
              </div>
              <div>
                <span>区间成本</span>
                <strong>{currency(project.cost_at_end)}</strong>
              </div>
            </div>
            <div className="status-card__footer">
              建议动作：{getProjectAction(project)}
            </div>
          </article>
        ))}
      </section>

      <section className="content-grid">
        {(reportView === 'weekly-summary' ||
          reportView === 'delivery-review' ||
          reportView === 'team-sync') && (
          <SectionCard title="项目进展情况" badge="支持时间区间筛选">
            <ReactECharts option={progressOption} style={{ height: 320 }} />
          </SectionCard>
        )}
        {(reportView === 'weekly-summary' || reportView === 'risk-review') && (
          <SectionCard title="风险趋势" badge="红黄灯联动">
            <ReactECharts option={riskOption} style={{ height: 320 }} />
          </SectionCard>
        )}
        {(reportView === 'weekly-summary' || reportView === 'delivery-review') && (
          <SectionCard title="成本与 ROI 趋势" badge="经营视角">
            <ReactECharts option={costOption} style={{ height: 320 }} />
          </SectionCard>
        )}
        {(reportView === 'weekly-summary' || reportView === 'delivery-review') && (
          <SectionCard title="供应商效能趋势" badge="质量 / 准时率">
            <ReactECharts option={supplierOption} style={{ height: 320 }} />
          </SectionCard>
        )}
        {(reportView === 'weekly-summary' || reportView === 'delivery-review') && (
          <SectionCard title="算法优化趋势" badge="修正率 / 提效">
            <ReactECharts option={algoOption} style={{ height: 320 }} />
          </SectionCard>
        )}
        {reportView === 'risk-review' && (
          <SectionCard title="需协调决策" badge="借鉴周会状态更新">
            <div className="agenda-list">
              {decisionProjects.length > 0 ? (
                decisionProjects.map((project) => (
                  <article key={project.project_id} className="agenda-item">
                    <div className="agenda-item__top">
                      <strong>{project.project_name}</strong>
                      <span>{project.current_risk_level || '绿'}灯</span>
                    </div>
                    <p>
                      进度 {percent(project.end_progress)}，区间变化{' '}
                      {percent(project.progress_delta)}，建议动作：
                      {getProjectAction(project)}
                    </p>
                  </article>
                ))
              ) : (
                <article className="agenda-item">
                  <div className="agenda-item__top">
                    <strong>当前暂无重点协调项</strong>
                    <span>在控</span>
                  </div>
                  <p>本周可以把风险页简化成例行跟踪，不必展开专项说明。</p>
                </article>
              )}
            </div>
          </SectionCard>
        )}
        {reportView === 'team-sync' && (
          <SectionCard title="PM 状态更新" badge="借鉴项目工作台">
            <div className="team-grid">
              {teamSummaries.map((summary) => (
                <article key={summary.pmName} className="team-card">
                  <div className="team-card__top">
                    <strong>{summary.pmName}</strong>
                    <span>{summary.projectCount} 个项目</span>
                  </div>
                  <div className="team-card__metrics">
                    <div>
                      <span>平均进度</span>
                      <strong>{percent(summary.avgProgress)}</strong>
                    </div>
                    <div>
                      <span>区间交付</span>
                      <strong>{currency(summary.deliveryAmount)}</strong>
                    </div>
                    <div>
                      <span>风险项目</span>
                      <strong>{summary.riskCount}</strong>
                    </div>
                    <div>
                      <span>区间成本</span>
                      <strong>{currency(summary.costAmount)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        )}
        <SectionCard title="周汇报明细" badge="可导出汇报">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>项目</th>
                  <th>PM</th>
                  <th>曲线</th>
                  <th>起始进度</th>
                  <th>结束进度</th>
                  <th>进度变化</th>
                  <th>区间交付</th>
                  <th>区间成本</th>
                  <th>风险状态</th>
                  <th>建议动作</th>
                </tr>
              </thead>
              <tbody>
                {projectProgress.map((row) => (
                  <tr key={row.project_id}>
                    <td>{row.project_name}</td>
                    <td>{row.pm_user_id || '未分配'}</td>
                    <td>{row.curve_type}</td>
                    <td>{percent(row.start_progress)}</td>
                    <td>{percent(row.end_progress)}</td>
                    <td>{percent(row.progress_delta)}</td>
                    <td>{currency(row.delivery_in_period)}</td>
                    <td>{currency(row.cost_at_end)}</td>
                    <td>{row.current_risk_level || '绿'}</td>
                    <td>{getProjectAction(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
