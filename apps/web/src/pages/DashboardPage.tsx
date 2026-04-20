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

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function currency(value: number) {
  return `${value.toFixed(1)} 万`;
}

function percent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function chartDates(rows: TrendRow[]) {
  return rows.map(
    (row) => row.snapshot_date || row.snapshot_week || row.batch_date || '',
  );
}

export function DashboardPage() {
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
      `${filters.startDate} 至 ${filters.endDate}，共 ${overview.active_projects} 个在执行项目，红灯 ${overview.red_risk_projects} 个，ROI ${overview.roi_value.toFixed(2)}。`,
    [filters, overview],
  );

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
          <p className="hero__eyebrow">DingTalk Project Platform</p>
          <h1>项目经营战情大屏</h1>
          <p className="hero__summary">{summaryText}</p>
        </div>
        <div className="hero__status">
          <span>状态</span>
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

      <section className="content-grid">
        <SectionCard title="项目进展情况" badge="支持时间区间筛选">
          <ReactECharts option={progressOption} style={{ height: 320 }} />
        </SectionCard>
        <SectionCard title="风险趋势" badge="红黄灯联动">
          <ReactECharts option={riskOption} style={{ height: 320 }} />
        </SectionCard>
        <SectionCard title="成本与 ROI 趋势" badge="经营视角">
          <ReactECharts option={costOption} style={{ height: 320 }} />
        </SectionCard>
        <SectionCard title="供应商效能趋势" badge="质量 / 准时率">
          <ReactECharts option={supplierOption} style={{ height: 320 }} />
        </SectionCard>
        <SectionCard title="算法优化趋势" badge="修正率 / 提效">
          <ReactECharts option={algoOption} style={{ height: 320 }} />
        </SectionCard>
        <SectionCard title="时间区间明细" badge="可导出汇报">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>项目</th>
                  <th>曲线</th>
                  <th>起始进度</th>
                  <th>结束进度</th>
                  <th>进度变化</th>
                  <th>区间交付</th>
                  <th>区间成本</th>
                  <th>风险状态</th>
                </tr>
              </thead>
              <tbody>
                {projectProgress.map((row) => (
                  <tr key={row.project_id}>
                    <td>{row.project_name}</td>
                    <td>{row.curve_type}</td>
                    <td>{percent(row.start_progress)}</td>
                    <td>{percent(row.end_progress)}</td>
                    <td>{percent(row.progress_delta)}</td>
                    <td>{currency(row.delivery_in_period)}</td>
                    <td>{currency(row.cost_at_end)}</td>
                    <td>{row.current_risk_level || '绿'}</td>
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

