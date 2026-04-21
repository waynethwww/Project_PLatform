import { useEffect, useMemo, useState } from 'react';

import {
  createExpertNetworkReport,
  ExpertDomainDistributionItem,
  ExpertNetworkBootstrap,
  ExpertNetworkWeeklyReport,
  ExpertNetworkWeeklyReportPayload,
  getExpertNetworkBootstrap,
  updateExpertNetworkReport,
} from '../lib/api';

type DomainRow = {
  id: string;
  domain: string;
  count: string;
};

type ExpertNetworkFormState = {
  weekStart: string;
  ownerName: string;
  newExpertsCount: string;
  weeklySubmittedCases: string;
  totalQcPassedCases: string;
  activeExpertsCount: string;
  weeklyNewDomainDistribution: DomainRow[];
  totalDomainDistribution: DomainRow[];
  summary: string;
  nextWeekFocus: string;
  remarks: string;
  status: 'draft' | 'submitted';
};

const DEFAULT_OWNER = '王天浩';
const DEFAULT_DOMAIN_OPTIONS = [
  '教育',
  '信息传输、软件和信息技术服务业',
  '科学研究和技术服务业',
  '制造业',
  '国际组织',
  '金融业',
  '建筑业',
  '批发和零售业',
  '交通运输、仓储和邮政业',
  '房地产业',
  '文化、体育和娱乐业',
  '农林牧渔业',
  '卫生和社会工作',
  '采矿业',
  '水利、环境和公共设施管理业',
];

function createRowId() {
  return globalThis.crypto?.randomUUID?.() || `row-${Math.random().toString(36).slice(2, 10)}`;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentWeekStart(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay() || 7;
  current.setDate(current.getDate() - day + 1);
  return toDateInputValue(current);
}

function normalizeIntegerString(value: string) {
  return value.replace(/[^\d]/g, '');
}

function parseCount(value: string) {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function parseMetric(value: string) {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function formatDelta(current: number, previous: number | null) {
  if (previous === null) {
    return '首次填报';
  }

  const delta = current - previous;
  if (delta === 0) {
    return '较上期持平';
  }

  return `${delta > 0 ? '+' : ''}${delta}`;
}

function toFormRows(rows: ExpertDomainDistributionItem[]) {
  if (!rows.length) {
    return [createEmptyRow()];
  }

  return rows.map((row) => ({
    id: row.id || createRowId(),
    domain: row.domain,
    count: String(row.count),
  }));
}

function createEmptyRow(domain = ''): DomainRow {
  return {
    id: createRowId(),
    domain,
    count: '',
  };
}

function aggregateRows(rows: DomainRow[]) {
  const grouped = new Map<string, number>();

  for (const row of rows) {
    const domain = row.domain.trim();
    const count = parseCount(row.count);
    if (!domain || count <= 0) {
      continue;
    }

    grouped.set(domain, (grouped.get(domain) || 0) + count);
  }

  return Array.from(grouped.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((left, right) => right.count - left.count || left.domain.localeCompare(right.domain, 'zh-CN'));
}

function rowsFromAggregate(rows: Array<{ domain: string; count: number }>) {
  return rows.length > 0
    ? rows.map((row) => ({
        id: createRowId(),
        domain: row.domain,
        count: String(row.count),
      }))
    : [createEmptyRow()];
}

function deriveTotalRows(
  baselineRows: DomainRow[],
  weeklyRows: DomainRow[],
) {
  const grouped = new Map<string, number>();

  for (const row of aggregateRows(baselineRows)) {
    grouped.set(row.domain, row.count);
  }

  for (const row of aggregateRows(weeklyRows)) {
    grouped.set(row.domain, (grouped.get(row.domain) || 0) + row.count);
  }

  return rowsFromAggregate(
    Array.from(grouped.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((left, right) => right.count - left.count || left.domain.localeCompare(right.domain, 'zh-CN')),
  );
}

function areRowsEqual(left: DomainRow[], right: DomainRow[]) {
  const normalize = (rows: DomainRow[]) =>
    aggregateRows(rows).map((row) => `${row.domain}:${row.count}`).join('|');
  return normalize(left) === normalize(right);
}

function emptyForm(weekStart: string): ExpertNetworkFormState {
  return {
    weekStart,
    ownerName: DEFAULT_OWNER,
    newExpertsCount: '',
    weeklySubmittedCases: '',
    totalQcPassedCases: '',
    activeExpertsCount: '',
    weeklyNewDomainDistribution: [createEmptyRow()],
    totalDomainDistribution: [createEmptyRow()],
    summary: '',
    nextWeekFocus: '',
    remarks: '',
    status: 'draft',
  };
}

function buildDraftFromBaseline(
  weekStart: string,
  baselineReport: ExpertNetworkWeeklyReport | null,
) {
  const form = emptyForm(weekStart);
  if (!baselineReport) {
    return form;
  }

  return {
    ...form,
    ownerName: baselineReport.ownerName || DEFAULT_OWNER,
    totalQcPassedCases: String(baselineReport.totalQcPassedCases),
    activeExpertsCount: String(baselineReport.activeExpertsCount),
    totalDomainDistribution: toFormRows(baselineReport.totalDomainDistribution),
    remarks: `默认沿用 ${baselineReport.weekStart} 的累计口径，可按本周新增领域自动累加后再微调。`,
  };
}

function formFromReport(report: ExpertNetworkWeeklyReport): ExpertNetworkFormState {
  return {
    weekStart: report.weekStart,
    ownerName: report.ownerName,
    newExpertsCount: String(report.newExpertsCount),
    weeklySubmittedCases: String(report.weeklySubmittedCases),
    totalQcPassedCases: String(report.totalQcPassedCases),
    activeExpertsCount: String(report.activeExpertsCount),
    weeklyNewDomainDistribution: toFormRows(report.weeklyNewDomainDistribution),
    totalDomainDistribution: toFormRows(report.totalDomainDistribution),
    summary: report.summary,
    nextWeekFocus: report.nextWeekFocus,
    remarks: report.remarks,
    status: report.status,
  };
}

function buildPayload(
  form: ExpertNetworkFormState,
  status: 'draft' | 'submitted',
): ExpertNetworkWeeklyReportPayload {
  const toPayloadRows = (rows: DomainRow[]) =>
    aggregateRows(rows).map((row, index) => ({
      id: `domain-${index + 1}`,
      domain: row.domain,
      count: row.count,
    }));

  return {
    weekStart: form.weekStart,
    ownerName: form.ownerName.trim() || DEFAULT_OWNER,
    newExpertsCount: parseMetric(form.newExpertsCount),
    weeklySubmittedCases: parseMetric(form.weeklySubmittedCases),
    totalQcPassedCases: parseMetric(form.totalQcPassedCases),
    activeExpertsCount: parseMetric(form.activeExpertsCount),
    totalDomainDistribution: toPayloadRows(form.totalDomainDistribution),
    weeklyNewDomainDistribution: toPayloadRows(form.weeklyNewDomainDistribution),
    summary: form.summary.trim(),
    nextWeekFocus: form.nextWeekFocus.trim(),
    remarks: form.remarks.trim(),
    status,
  };
}

function topLabel(rows: DomainRow[]) {
  const current = aggregateRows(rows)[0];
  return current ? `${current.domain} ${current.count}` : '暂无';
}

export function ExpertNetworkFormPage() {
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekStart());
  const [reportId, setReportId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpertNetworkFormState>(() =>
    emptyForm(getCurrentWeekStart()),
  );
  const [baselineReport, setBaselineReport] =
    useState<ExpertNetworkWeeklyReport | null>(null);
  const [latestReport, setLatestReport] =
    useState<ExpertNetworkWeeklyReport | null>(null);
  const [historyReports, setHistoryReports] = useState<ExpertNetworkWeeklyReport[]>([]);
  const [domainCatalog, setDomainCatalog] = useState<string[]>(DEFAULT_DOMAIN_OPTIONS);
  const [manualTotalAdjust, setManualTotalAdjust] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadWeek(targetWeek: string) {
    setLoading(true);
    setNotice('');

    try {
      const bootstrap = await getExpertNetworkBootstrap(targetWeek);
      applyBootstrap(targetWeek, bootstrap);
    } catch {
      setReportId(null);
      setBaselineReport(null);
      setLatestReport(null);
      setHistoryReports([]);
      setDomainCatalog(DEFAULT_DOMAIN_OPTIONS);
      setManualTotalAdjust(false);
      setForm(emptyForm(targetWeek));
      setNotice('专家网络数据读取失败，已回退为空白草稿。');
    } finally {
      setLoading(false);
    }
  }

  function applyBootstrap(targetWeek: string, bootstrap: ExpertNetworkBootstrap) {
    setHistoryReports(bootstrap.reports);
    setDomainCatalog(
      bootstrap.domainCatalog.length > 0
        ? bootstrap.domainCatalog
        : DEFAULT_DOMAIN_OPTIONS,
    );
    setLatestReport(bootstrap.latestReport);
    setBaselineReport(bootstrap.baselineReport);

    if (bootstrap.currentReport) {
      setReportId(bootstrap.currentReport.id);
      setManualTotalAdjust(true);
      setForm(formFromReport(bootstrap.currentReport));
      return;
    }

    setReportId(null);
    setManualTotalAdjust(false);
    setForm(
      buildDraftFromBaseline(
        targetWeek,
        bootstrap.baselineReport || bootstrap.latestReport,
      ),
    );
  }

  useEffect(() => {
    void loadWeek(selectedWeek);
  }, [selectedWeek]);

  const baselineRows = useMemo(
    () => toFormRows(baselineReport?.totalDomainDistribution || []),
    [baselineReport],
  );

  const autoTotalRows = useMemo(
    () => deriveTotalRows(baselineRows, form.weeklyNewDomainDistribution),
    [baselineRows, form.weeklyNewDomainDistribution],
  );

  useEffect(() => {
    if (!manualTotalAdjust && !areRowsEqual(form.totalDomainDistribution, autoTotalRows)) {
      setForm((current) => ({
        ...current,
        totalDomainDistribution: autoTotalRows,
      }));
    }
  }, [autoTotalRows, form.totalDomainDistribution, manualTotalAdjust]);

  const weeklyRows = useMemo(
    () => aggregateRows(form.weeklyNewDomainDistribution),
    [form.weeklyNewDomainDistribution],
  );

  const totalRows = useMemo(
    () => aggregateRows(form.totalDomainDistribution),
    [form.totalDomainDistribution],
  );

  const completionItems = useMemo(
    () => [
      {
        label: '基础指标',
        detail: '新增专家、提交 case、活跃专家、累计质检通过已填写',
        done:
          form.newExpertsCount !== '' &&
          form.weeklySubmittedCases !== '' &&
          form.totalQcPassedCases !== '' &&
          form.activeExpertsCount !== '',
      },
      {
        label: '本周新增领域',
        detail: '至少维护 1 条新增领域分布',
        done: weeklyRows.length > 0,
      },
      {
        label: '累计领域校准',
        detail: '累计领域分布已生成或人工校准',
        done: totalRows.length > 0,
      },
      {
        label: '周报摘要',
        detail: '输出本周经营摘要',
        done: form.summary.trim().length > 0,
      },
      {
        label: '下周重点',
        detail: '补充下周推进重点',
        done: form.nextWeekFocus.trim().length > 0,
      },
    ],
    [
      form.activeExpertsCount,
      form.newExpertsCount,
      form.nextWeekFocus,
      form.summary,
      form.totalQcPassedCases,
      form.weeklySubmittedCases,
      totalRows.length,
      weeklyRows.length,
    ],
  );

  const completedCount = completionItems.filter((item) => item.done).length;
  const previousReport = baselineReport;
  const currentMetrics = {
    newExpertsCount: parseMetric(form.newExpertsCount),
    weeklySubmittedCases: parseMetric(form.weeklySubmittedCases),
    totalQcPassedCases: parseMetric(form.totalQcPassedCases),
    activeExpertsCount: parseMetric(form.activeExpertsCount),
  };

  async function handlePersist(status: 'draft' | 'submitted') {
    const payload = buildPayload(form, status);
    setLoading(true);
    setNotice('');

    try {
      const response = reportId
        ? await updateExpertNetworkReport(reportId, payload)
        : await createExpertNetworkReport(payload);

      setReportId(response.id);
      setManualTotalAdjust(true);
      setForm(formFromReport(response));
      await loadWeek(form.weekStart);
      setNotice(status === 'submitted' ? '专家网络周报已提交。' : '专家网络草稿已保存。');
    } catch {
      setNotice('保存失败，请检查周别是否重复或接口是否可用。');
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof ExpertNetworkFormState>(
    key: K,
    value: ExpertNetworkFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateRows(
    key: 'weeklyNewDomainDistribution' | 'totalDomainDistribution',
    updater: (rows: DomainRow[]) => DomainRow[],
  ) {
    if (key === 'totalDomainDistribution') {
      setManualTotalAdjust(true);
    }

    setForm((current) => ({
      ...current,
      [key]: updater(current[key]),
    }));
  }

  function addQuickDomain(domain: string) {
    updateRows('weeklyNewDomainDistribution', (rows) => {
      const exists = rows.some((row) => row.domain.trim() === domain);
      if (exists) {
        return rows;
      }
      return [...rows, createEmptyRow(domain)];
    });
  }

  return (
    <div className="dashboard-shell pm-form-shell expert-form-shell">
      <section className="pm-page-header">
        <div>
          <p className="pm-page-header__eyebrow">专家网络运营</p>
          <h1>专家网络周填报</h1>
          <p className="pm-page-header__sub">
            只填本周变化项，累计领域分布默认沿用上周并自动累加，可在需要时人工校准。
          </p>
        </div>
        <div className="pm-page-actions">
          <button
            type="button"
            className="pm-btn pm-btn--light"
            onClick={() => {
              window.location.hash = '#/weekly-report';
            }}
          >
            返回周汇报视图
          </button>
          <button
            type="button"
            className="pm-btn pm-btn--light"
            onClick={() => {
              const nextWeek = getCurrentWeekStart();
              setSelectedWeek(nextWeek);
            }}
          >
            新建本周草稿
          </button>
          <button
            type="button"
            className="pm-btn pm-btn--accent"
            onClick={() => void handlePersist('draft')}
            disabled={loading}
          >
            保存草稿
          </button>
          <button
            type="button"
            className="pm-btn pm-btn--primary"
            onClick={() => void handlePersist('submitted')}
            disabled={loading}
          >
            提交周报
          </button>
        </div>
      </section>

      <section className="expert-context-bar">
        <div className="expert-context-grid">
          <label className="pm-field">
            <span className="pm-field__label">统计周期</span>
            <input
              type="date"
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(event.target.value)}
            />
          </label>
          <div className="expert-context-note">
            <span>当前状态</span>
            <strong>{reportId ? '已存在周报，可直接编辑' : '当前为新建草稿'}</strong>
            <small>
              {latestReport
                ? `最近一期为 ${latestReport.weekStart}，默认沿用其累计领域口径`
                : '当前暂无历史周报，将从空白草稿开始录入'}
            </small>
          </div>
          <div className="expert-context-strip">
            <div>
              <span>完成度</span>
              <strong>
                {completedCount}/{completionItems.length}
              </strong>
            </div>
            <div>
              <span>本周新增领域数</span>
              <strong>{weeklyRows.length}</strong>
            </div>
            <div>
              <span>累计覆盖领域数</span>
              <strong>{totalRows.length}</strong>
            </div>
          </div>
        </div>
        {notice ? <div className="expert-notice">{notice}</div> : null}
      </section>

      <div className="expert-layout">
        <main className="expert-main">
          <section className="expert-panel">
            <div className="expert-panel__header">
              <div>
                <p className="pm-page-header__eyebrow">固定口径</p>
                <h2>本周经营指标</h2>
                <small>本区只维护领导关注的聚合指标，不展示专家姓名和个人履历。</small>
              </div>
              <div className="pm-chip-row">
                <span className="pm-chip">聚合数据</span>
                <span className="pm-chip">领导汇报口径</span>
              </div>
            </div>
            <div className="expert-grid expert-grid--4">
              <label className="pm-field">
                <span className="pm-field__label">数据更新人</span>
                <input
                  value={form.ownerName}
                  onChange={(event) => updateField('ownerName', event.target.value)}
                  placeholder="默认王天浩"
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">本周新增专家数</span>
                <input
                  value={form.newExpertsCount}
                  onChange={(event) =>
                    updateField('newExpertsCount', normalizeIntegerString(event.target.value))
                  }
                  placeholder="例如 151"
                  inputMode="numeric"
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">本周提交 case 数</span>
                <input
                  value={form.weeklySubmittedCases}
                  onChange={(event) =>
                    updateField(
                      'weeklySubmittedCases',
                      normalizeIntegerString(event.target.value),
                    )
                  }
                  placeholder="例如 169"
                  inputMode="numeric"
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">当前活跃专家人数</span>
                <input
                  value={form.activeExpertsCount}
                  onChange={(event) =>
                    updateField('activeExpertsCount', normalizeIntegerString(event.target.value))
                  }
                  placeholder="例如 263"
                  inputMode="numeric"
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">累计质检通过 case 数</span>
                <input
                  value={form.totalQcPassedCases}
                  onChange={(event) =>
                    updateField('totalQcPassedCases', normalizeIntegerString(event.target.value))
                  }
                  placeholder="例如 641"
                  inputMode="numeric"
                />
                <small className="pm-field__hint">
                  建议维护累计口径，便于在周汇报页直接展示趋势和产能规模。
                </small>
              </label>
            </div>
          </section>

          <section className="expert-panel">
            <div className="expert-panel__header">
              <div>
                <p className="pm-page-header__eyebrow">本周变化</p>
                <h2>本周新增领域分布</h2>
                <small>支持一项一项添加，后续看板会按领域分布展示，不落个人信息。</small>
              </div>
              <div className="pm-chip-row">
                <span className="pm-chip">本周新增 {currentMetrics.newExpertsCount || 0}</span>
                <span className="pm-chip">Top 领域 {topLabel(form.weeklyNewDomainDistribution)}</span>
              </div>
            </div>
            <div className="expert-domain-chips">
              {domainCatalog.slice(0, 12).map((domain) => (
                <button
                  key={domain}
                  type="button"
                  className="expert-domain-chip"
                  onClick={() => addQuickDomain(domain)}
                >
                  + {domain}
                </button>
              ))}
            </div>
            <div className="expert-table">
              <div className="expert-table__head">
                <span>领域</span>
                <span>人数</span>
                <span>操作</span>
              </div>
              {form.weeklyNewDomainDistribution.map((row, index) => (
                <div key={row.id} className="expert-table__row">
                  <div className="expert-table__index">{index + 1}</div>
                  <input
                    value={row.domain}
                    onChange={(event) =>
                      updateRows('weeklyNewDomainDistribution', (rows) =>
                        rows.map((item) =>
                          item.id === row.id
                            ? { ...item, domain: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="输入领域名称"
                  />
                  <input
                    value={row.count}
                    onChange={(event) =>
                      updateRows('weeklyNewDomainDistribution', (rows) =>
                        rows.map((item) =>
                          item.id === row.id
                            ? {
                                ...item,
                                count: normalizeIntegerString(event.target.value),
                              }
                            : item,
                        ),
                      )
                    }
                    placeholder="人数"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="expert-row-action"
                    onClick={() =>
                      updateRows('weeklyNewDomainDistribution', (rows) =>
                        rows.length > 1
                          ? rows.filter((item) => item.id !== row.id)
                          : [createEmptyRow()],
                      )
                    }
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            <div className="expert-panel__actions">
              <button
                type="button"
                className="pm-btn pm-btn--light"
                onClick={() =>
                  updateRows('weeklyNewDomainDistribution', (rows) => [
                    ...rows,
                    createEmptyRow(),
                  ])
                }
              >
                新增领域行
              </button>
            </div>
          </section>

          <section className="expert-panel">
            <div className="expert-panel__header">
              <div>
                <p className="pm-page-header__eyebrow">累计口径</p>
                <h2>总计领域分布校准</h2>
                <small>
                  默认按“上周累计 + 本周新增”自动生成；如果有回溯修正，可切换为人工调整。
                </small>
              </div>
              <div className="pm-chip-row">
                <button
                  type="button"
                  className="pm-chip"
                  onClick={() => {
                    setManualTotalAdjust(false);
                    updateField('totalDomainDistribution', autoTotalRows);
                  }}
                >
                  按累计自动生成
                </button>
                <span className={manualTotalAdjust ? 'pm-badge pm-badge--warn' : 'pm-badge pm-badge--ok'}>
                  {manualTotalAdjust ? '人工校准中' : '自动同步中'}
                </span>
              </div>
            </div>
            <div className="expert-table">
              <div className="expert-table__head">
                <span>领域</span>
                <span>累计人数</span>
                <span>操作</span>
              </div>
              {form.totalDomainDistribution.map((row, index) => (
                <div key={row.id} className="expert-table__row">
                  <div className="expert-table__index">{index + 1}</div>
                  <input
                    value={row.domain}
                    onChange={(event) =>
                      updateRows('totalDomainDistribution', (rows) =>
                        rows.map((item) =>
                          item.id === row.id
                            ? { ...item, domain: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="输入领域名称"
                  />
                  <input
                    value={row.count}
                    onChange={(event) =>
                      updateRows('totalDomainDistribution', (rows) =>
                        rows.map((item) =>
                          item.id === row.id
                            ? {
                                ...item,
                                count: normalizeIntegerString(event.target.value),
                              }
                            : item,
                        ),
                      )
                    }
                    placeholder="累计人数"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="expert-row-action"
                    onClick={() =>
                      updateRows('totalDomainDistribution', (rows) =>
                        rows.length > 1
                          ? rows.filter((item) => item.id !== row.id)
                          : [createEmptyRow()],
                      )
                    }
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            <div className="expert-panel__actions">
              <button
                type="button"
                className="pm-btn pm-btn--light"
                onClick={() =>
                  updateRows('totalDomainDistribution', (rows) => [
                    ...rows,
                    createEmptyRow(),
                  ])
                }
              >
                新增累计行
              </button>
            </div>
          </section>

          <section className="expert-panel">
            <div className="expert-panel__header">
              <div>
                <p className="pm-page-header__eyebrow">汇报摘要</p>
                <h2>本周摘要与下周重点</h2>
                <small>建议直接按领导汇报口径填写，提交后会同步进周汇报模块。</small>
              </div>
            </div>
            <div className="expert-grid">
              <label className="pm-field pm-field--full">
                <span className="pm-field__label">本周经营摘要</span>
                <textarea
                  value={form.summary}
                  onChange={(event) => updateField('summary', event.target.value)}
                  rows={4}
                  placeholder="例如：本周新增专家总数 151 人，提交 case 169 条（待质检），新增供给继续集中在教育、信息技术等领域。"
                />
              </label>
              <label className="pm-field pm-field--full">
                <span className="pm-field__label">下周重点</span>
                <textarea
                  value={form.nextWeekFocus}
                  onChange={(event) => updateField('nextWeekFocus', event.target.value)}
                  rows={4}
                  placeholder="例如：重点招募英文 case 产出专家，并继续补足供给偏弱的行业领域。"
                />
              </label>
              <label className="pm-field pm-field--full">
                <span className="pm-field__label">备注</span>
                <textarea
                  value={form.remarks}
                  onChange={(event) => updateField('remarks', event.target.value)}
                  rows={3}
                  placeholder="补充字段来源、暂未归类人数或特殊说明。"
                />
              </label>
            </div>
          </section>
        </main>

        <aside className="expert-side">
          <section className="expert-side-card">
            <div className="expert-side-card__header">
              <div>
                <p className="pm-page-header__eyebrow">提交预览</p>
                <h3>周报摘要卡</h3>
              </div>
              <span className={form.status === 'submitted' ? 'pm-badge pm-badge--ok' : 'pm-badge'}>
                {form.status === 'submitted' ? '已提交' : '草稿中'}
              </span>
            </div>
            <div className="expert-preview-grid">
              <div className="expert-preview-card">
                <span>本周新增专家</span>
                <strong>{currentMetrics.newExpertsCount || 0}</strong>
                <small>{formatDelta(currentMetrics.newExpertsCount, previousReport?.newExpertsCount ?? null)}</small>
              </div>
              <div className="expert-preview-card">
                <span>本周提交 case</span>
                <strong>{currentMetrics.weeklySubmittedCases || 0}</strong>
                <small>
                  {formatDelta(
                    currentMetrics.weeklySubmittedCases,
                    previousReport?.weeklySubmittedCases ?? null,
                  )}
                </small>
              </div>
              <div className="expert-preview-card">
                <span>当前活跃专家</span>
                <strong>{currentMetrics.activeExpertsCount || 0}</strong>
                <small>
                  {formatDelta(
                    currentMetrics.activeExpertsCount,
                    previousReport?.activeExpertsCount ?? null,
                  )}
                </small>
              </div>
              <div className="expert-preview-card">
                <span>累计质检通过 case</span>
                <strong>{currentMetrics.totalQcPassedCases || 0}</strong>
                <small>
                  {formatDelta(
                    currentMetrics.totalQcPassedCases,
                    previousReport?.totalQcPassedCases ?? null,
                  )}
                </small>
              </div>
            </div>
            <div className="expert-summary-block">
              <div>
                <span>本周新增 Top 领域</span>
                <strong>{topLabel(form.weeklyNewDomainDistribution)}</strong>
              </div>
              <div>
                <span>累计覆盖 Top 领域</span>
                <strong>{topLabel(form.totalDomainDistribution)}</strong>
              </div>
            </div>
            <div className="expert-preview-text">
              <strong>摘要预览</strong>
              <p>{form.summary.trim() || '尚未填写本周经营摘要。'}</p>
              <strong>下周重点</strong>
              <p>{form.nextWeekFocus.trim() || '尚未填写下周重点。'}</p>
            </div>
          </section>

          <section className="expert-side-card">
            <div className="expert-side-card__header">
              <div>
                <p className="pm-page-header__eyebrow">提交检查</p>
                <h3>完成情况</h3>
              </div>
              <span className={completedCount === completionItems.length ? 'pm-badge pm-badge--ok' : 'pm-badge pm-badge--warn'}>
                {completedCount}/{completionItems.length}
              </span>
            </div>
            <div className="expert-checklist">
              {completionItems.map((item) => (
                <div
                  key={item.label}
                  className={`expert-checkitem ${item.done ? 'is-done' : ''}`}
                >
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="expert-side-card">
            <div className="expert-side-card__header">
              <div>
                <p className="pm-page-header__eyebrow">历史周报</p>
                <h3>最近记录</h3>
              </div>
              <span className="pm-badge">{historyReports.length} 条</span>
            </div>
            <div className="expert-history-list">
              {historyReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className={`expert-history-item ${
                    report.weekStart === selectedWeek ? 'is-active' : ''
                  }`}
                  onClick={() => setSelectedWeek(report.weekStart)}
                >
                  <div>
                    <strong>{report.weekStart}</strong>
                    <span>{report.ownerName}</span>
                  </div>
                  <div>
                    <small>新增 {report.newExpertsCount}</small>
                    <small>{report.status === 'submitted' ? '已提交' : '草稿'}</small>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
