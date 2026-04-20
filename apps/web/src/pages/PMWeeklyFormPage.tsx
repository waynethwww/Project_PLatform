import { ChangeEvent, useEffect, useMemo, useState } from 'react';

import {
  createPmWeeklyReport,
  deletePmWeeklyReport,
  getPmWeeklyReportsBootstrap,
  PmWeeklyReport,
  PmWeeklyReportPayload,
  ProjectOption,
  updatePmWeeklyReport,
} from '../lib/api';

type FormState = PmWeeklyReportPayload;

const fallbackProject: ProjectOption = {
  id: 'temp-project',
  name: '未选择项目',
  pmName: '待分配',
  curveType: '一曲线',
  annotationType: '未配置',
  plannedQty: 0,
  qtyUnit: '项',
  budgetTotal: 0,
  defaultSupplier: '未配置',
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekStart() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return toDateInputValue(monday);
}

function createDefaultPayload(
  project: ProjectOption,
  weekStart = getWeekStart(),
): FormState {
  return {
    projectId: project.id,
    weekStart,
    progressPct: project.curveType === '一曲线' ? 72 : 86,
    actualQty: Math.round(project.plannedQty * 0.68),
    weeklyDeliveryAmount: project.curveType === '一曲线' ? 7.2 : 0,
    amountDelivered: project.curveType === '一曲线' ? 58.5 : 0,
    costConsumed: project.curveType === '一曲线' ? 36.2 : 128.5,
    qualityPass: project.curveType === '一曲线' ? 91 : 100,
    clientScore: project.curveType === '一曲线' ? 4.3 : 4.1,
    riskLevel:
      project.name === 'Prosper-AGV' ? '红' : project.name === 'Mary' ? '黄' : '绿',
    riskDesc:
      project.name === 'Prosper-AGV'
        ? '供应商稳定性不足，交付速度仍偏慢'
        : project.name === 'Mary'
          ? '格式适配与算法联动仍需跟进'
          : '当前整体在控，需继续盯质量和成本',
    blockerTitle:
      project.name === 'Mary' ? '格式适配工期偏移' : '客户验收标准仍有灰区',
    blockerStatus: project.name === 'Mary' ? 'watching' : 'open',
    blockerDueDate: weekStart,
    suggestedAction: '本周完成一次专项复盘，并同步客户/供应商侧动作',
    supplierName: project.defaultSupplier,
    supplierHeadcount: project.curveType === '一曲线' ? 12 : 0,
    supplierQuality: project.curveType === '一曲线' ? 89 : 100,
    supplierOtdRate: project.curveType === '一曲线' ? 86 : 100,
    supplierCooperation: project.curveType === '一曲线' ? 88 : 100,
    supplierIssue:
      project.curveType === '一曲线'
        ? '本周培训后质量回升，但需继续跟踪准时率'
        : '无供应商异常',
    algoVersion: project.curveType === '一曲线' ? 'v2.1' : 'v1.3',
    modificationRate: project.annotationType === '4D车道线' ? 18 : 12,
    timeSavePct: project.annotationType === '4D车道线' ? 24 : 36,
    algoAdvice:
      project.annotationType === '4D车道线'
        ? '继续优化车道线断点识别'
        : '保持当前模型版本，重点降低人工新增比例',
    hoursSpent: project.curveType === '一曲线' ? 34 : 24,
    pmHourlyCost: 180,
    pmComment: '本周整体推进顺畅，已和协同方同步下周关键节点。',
    nextWeekFocus: '1. 盯质量与成本  2. 清理 Blocker  3. 输出周报摘要',
    status: 'draft',
  };
}

function reportToPayload(report: PmWeeklyReport): FormState {
  return {
    projectId: report.projectId,
    weekStart: report.weekStart,
    progressPct: report.progressPct,
    actualQty: report.actualQty,
    weeklyDeliveryAmount: report.weeklyDeliveryAmount,
    amountDelivered: report.amountDelivered,
    costConsumed: report.costConsumed,
    qualityPass: report.qualityPass,
    clientScore: report.clientScore,
    riskLevel: report.riskLevel,
    riskDesc: report.riskDesc,
    blockerTitle: report.blockerTitle,
    blockerStatus: report.blockerStatus,
    blockerDueDate: report.blockerDueDate,
    suggestedAction: report.suggestedAction,
    supplierName: report.supplierName,
    supplierHeadcount: report.supplierHeadcount,
    supplierQuality: report.supplierQuality,
    supplierOtdRate: report.supplierOtdRate,
    supplierCooperation: report.supplierCooperation,
    supplierIssue: report.supplierIssue,
    algoVersion: report.algoVersion,
    modificationRate: report.modificationRate,
    timeSavePct: report.timeSavePct,
    algoAdvice: report.algoAdvice,
    hoursSpent: report.hoursSpent,
    pmHourlyCost: report.pmHourlyCost,
    pmComment: report.pmComment,
    nextWeekFocus: report.nextWeekFocus,
    status: report.status,
  };
}

function toPercent(value: number) {
  return `${value.toFixed(0)}%`;
}

function toWan(value: number) {
  return `${value.toFixed(1)} 万`;
}

function textAreaValue(event: ChangeEvent<HTMLTextAreaElement>) {
  return event.target.value;
}

function recordStatusLabel(status: FormState['status']) {
  return status === 'submitted' ? '已提交' : '草稿';
}

export function PMWeeklyFormPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [reports, setReports] = useState<PmWeeklyReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(createDefaultPayload(fallbackProject));
  const [draftStatus, setDraftStatus] = useState('正在加载本地填报数据...');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    void getPmWeeklyReportsBootstrap()
      .then((payload) => {
        if (!mounted) {
          return;
        }

        const nextProjects = payload.projects;
        const nextReports = payload.reports;
        setProjects(nextProjects);
        setReports(nextReports);

        if (nextReports.length > 0) {
          setActiveReportId(nextReports[0].id);
          setForm(reportToPayload(nextReports[0]));
          setDraftStatus(`已载入 ${nextReports[0].projectName} 的本地记录`);
        } else {
          const firstProject = nextProjects[0] || fallbackProject;
          setForm(createDefaultPayload(firstProject));
          setDraftStatus('当前没有填报记录，可创建首个周报草稿');
        }
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setProjects([fallbackProject]);
        setForm(createDefaultPayload(fallbackProject));
        setDraftStatus('加载失败，已进入离线草稿模式');
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedProject =
    projects.find((project) => project.id === form.projectId) ||
    projects[0] ||
    fallbackProject;

  const activeReport =
    reports.find((report) => report.id === activeReportId) || null;

  const deliveryRate = useMemo(() => {
    if (!selectedProject.plannedQty) {
      return 0;
    }
    return Math.min((form.actualQty / selectedProject.plannedQty) * 100, 999);
  }, [form.actualQty, selectedProject.plannedQty]);

  const costRate = useMemo(() => {
    if (!selectedProject.budgetTotal) {
      return 0;
    }
    return (form.costConsumed / selectedProject.budgetTotal) * 100;
  }, [form.costConsumed, selectedProject.budgetTotal]);

  const healthLabel = useMemo(() => {
    if (form.riskLevel === '红' || costRate > 100 || form.qualityPass < 85) {
      return { text: '⛔ 风险', tone: 'danger' };
    }

    if (form.riskLevel === '黄' || costRate > 85 || form.qualityPass < 92) {
      return { text: '⚠ 注意', tone: 'warn' };
    }

    return { text: '● 健康', tone: 'ok' };
  }, [costRate, form.qualityPass, form.riskLevel]);

  const completionChecks = useMemo(
    () => [
      { label: '周基础信息', done: Boolean(form.weekStart && form.projectId) },
      { label: '进度与交付', done: form.progressPct >= 0 && form.actualQty >= 0 },
      { label: '风险与 Blocker', done: form.riskDesc.trim().length > 0 },
      {
        label: '工时与下周重点',
        done: form.hoursSpent > 0 && form.nextWeekFocus.trim().length > 0,
      },
    ],
    [form],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDraftStatus('草稿待保存');
  }

  function handleProjectChange(projectId: string) {
    const nextProject =
      projects.find((project) => project.id === projectId) || fallbackProject;
    setForm((current) => ({
      ...createDefaultPayload(nextProject, current.weekStart),
      status: 'draft',
    }));
    setActiveReportId(null);
    setDraftStatus('已切换项目，当前为新草稿');
  }

  function selectReport(report: PmWeeklyReport) {
    setActiveReportId(report.id);
    setForm(reportToPayload(report));
    setDraftStatus(`已切换到 ${report.projectName} · ${report.weekStart}`);
  }

  function createNewDraft() {
    setActiveReportId(null);
    setForm(createDefaultPayload(selectedProject, form.weekStart || getWeekStart()));
    setDraftStatus(`已创建 ${selectedProject.name} 的新草稿，待保存`);
  }

  async function persistReport(status: FormState['status']) {
    setIsSaving(true);
    try {
      const payload: FormState = { ...form, status };

      if (activeReportId) {
        const updated = await updatePmWeeklyReport(activeReportId, payload);
        setReports((current) =>
          [updated, ...current.filter((item) => item.id !== updated.id)].sort(
            (left, right) => right.updatedAt.localeCompare(left.updatedAt),
          ),
        );
        setActiveReportId(updated.id);
        setForm(reportToPayload(updated));
        setDraftStatus(
          `${status === 'submitted' ? '已提交' : '已保存'} · ${updated.projectName}`,
        );
      } else {
        const created = await createPmWeeklyReport(payload);
        setReports((current) =>
          [created, ...current].sort((left, right) =>
            right.updatedAt.localeCompare(left.updatedAt),
          ),
        );
        setActiveReportId(created.id);
        setForm(reportToPayload(created));
        setDraftStatus(
          `${status === 'submitted' ? '已提交' : '已创建并保存'} · ${created.projectName}`,
        );
      }
    } catch {
      setDraftStatus('保存失败，请检查本地后端服务');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeReportId) {
      setDraftStatus('当前是未保存草稿，无需删除');
      return;
    }

    setIsSaving(true);
    try {
      await deletePmWeeklyReport(activeReportId);
      const nextReports = reports.filter((item) => item.id !== activeReportId);
      setReports(nextReports);

      if (nextReports.length > 0) {
        setActiveReportId(nextReports[0].id);
        setForm(reportToPayload(nextReports[0]));
        setDraftStatus(`已删除记录，当前切换到 ${nextReports[0].projectName}`);
      } else {
        const firstProject = projects[0] || fallbackProject;
        setActiveReportId(null);
        setForm(createDefaultPayload(firstProject));
        setDraftStatus('已删除最后一条记录，可重新新建草稿');
      }
    } catch {
      setDraftStatus('删除失败，请检查本地后端服务');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dashboard-shell pm-form-shell">
      <header className="hero pm-hero">
        <div>
          <p className="hero__eyebrow">PM Weekly Workspace</p>
          <h1>项目经理周填报工作台</h1>
          <p className="hero__summary">
            当前页面已接入本地 CRUD：可新建、编辑、保存草稿、提交和删除周填报记录，数据会落到本地后端 runtime 文件中。
          </p>
        </div>
        <div className="hero__status">
          <span>当前项目</span>
          <strong>{selectedProject.name}</strong>
          <span>综合健康</span>
          <strong>{healthLabel.text}</strong>
        </div>
      </header>

      <div className="pm-steps">
        <div className="pm-step is-active">1. 基础信息</div>
        <div className="pm-step is-active">2. 进度与交付</div>
        <div className="pm-step is-active">3. 风险与 Blocker</div>
        <div className="pm-step is-active">4. 供应商与算法</div>
        <div className="pm-step is-active">5. 工时与提交</div>
      </div>

      <div className="pm-layout">
        <div className="pm-main">
          <section className="pm-card">
            <div className="pm-card__header">
              <div>
                <p>周基础信息</p>
                <h2>本周填报范围</h2>
              </div>
              <span className="pm-tag">{isLoading ? '加载中...' : draftStatus}</span>
            </div>
            <div className="pm-form-grid">
              <label>
                项目
                <select
                  value={form.projectId}
                  onChange={(event) => handleProjectChange(event.target.value)}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                周开始日
                <input
                  type="date"
                  value={form.weekStart}
                  onChange={(event) => updateField('weekStart', event.target.value)}
                />
              </label>
              <label>
                PM
                <input value={selectedProject.pmName} readOnly />
              </label>
              <label>
                曲线类型
                <input value={selectedProject.curveType} readOnly />
              </label>
              <label>
                标注类型 / 模块
                <input value={selectedProject.annotationType} readOnly />
              </label>
              <label>
                计划总量
                <input
                  value={`${selectedProject.plannedQty} ${selectedProject.qtyUnit}`}
                  readOnly
                />
              </label>
            </div>
          </section>

          <section className="pm-card">
            <div className="pm-card__header">
              <div>
                <p>进度与交付</p>
                <h2>周快照数据</h2>
              </div>
              <span className={`pm-status pm-status--${healthLabel.tone}`}>
                {healthLabel.text}
              </span>
            </div>
            <div className="pm-kpi-strip">
              <div>
                <span>交付完成率</span>
                <strong>{toPercent(deliveryRate)}</strong>
              </div>
              <div>
                <span>成本消耗率</span>
                <strong>{toPercent(costRate)}</strong>
              </div>
              <div>
                <span>验收通过率</span>
                <strong>{toPercent(form.qualityPass)}</strong>
              </div>
              <div>
                <span>客户评分</span>
                <strong>{form.clientScore.toFixed(1)}</strong>
              </div>
            </div>
            <div className="pm-form-grid">
              <label>
                整体进度%
                <input
                  type="number"
                  value={form.progressPct}
                  onChange={(event) => updateField('progressPct', Number(event.target.value))}
                />
              </label>
              <label>
                本周实际交付量
                <input
                  type="number"
                  value={form.actualQty}
                  onChange={(event) => updateField('actualQty', Number(event.target.value))}
                />
              </label>
              <label>
                本周交付金额（万）
                <input
                  type="number"
                  step="0.1"
                  value={form.weeklyDeliveryAmount}
                  onChange={(event) =>
                    updateField('weeklyDeliveryAmount', Number(event.target.value))
                  }
                />
              </label>
              <label>
                累计交付金额（万）
                <input
                  type="number"
                  step="0.1"
                  value={form.amountDelivered}
                  onChange={(event) =>
                    updateField('amountDelivered', Number(event.target.value))
                  }
                />
              </label>
              <label>
                已用成本（万）
                <input
                  type="number"
                  step="0.1"
                  value={form.costConsumed}
                  onChange={(event) =>
                    updateField('costConsumed', Number(event.target.value))
                  }
                />
              </label>
              <label>
                验收通过率%
                <input
                  type="number"
                  value={form.qualityPass}
                  onChange={(event) => updateField('qualityPass', Number(event.target.value))}
                />
              </label>
              <label>
                客户评分（1-5）
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={form.clientScore}
                  onChange={(event) => updateField('clientScore', Number(event.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="pm-card">
            <div className="pm-card__header">
              <div>
                <p>风险与阻碍</p>
                <h2>红黄灯 + Blocker</h2>
              </div>
              <span className="pm-tag">异常项会触发钉钉提醒</span>
            </div>
            <div className="pm-form-grid">
              <label>
                风险等级
                <select
                  value={form.riskLevel}
                  onChange={(event) =>
                    updateField('riskLevel', event.target.value as FormState['riskLevel'])
                  }
                >
                  <option value="绿">绿</option>
                  <option value="黄">黄</option>
                  <option value="红">红</option>
                </select>
              </label>
              <label>
                Blocker 状态
                <select
                  value={form.blockerStatus}
                  onChange={(event) =>
                    updateField(
                      'blockerStatus',
                      event.target.value as FormState['blockerStatus'],
                    )
                  }
                >
                  <option value="open">待处理</option>
                  <option value="watching">跟进中</option>
                  <option value="closed">已解决</option>
                </select>
              </label>
              <label>
                Blocker 标题
                <input
                  value={form.blockerTitle}
                  onChange={(event) => updateField('blockerTitle', event.target.value)}
                />
              </label>
              <label>
                计划解决日期
                <input
                  type="date"
                  value={form.blockerDueDate}
                  onChange={(event) => updateField('blockerDueDate', event.target.value)}
                />
              </label>
              <label className="pm-form-grid__full">
                风险描述
                <textarea
                  rows={3}
                  value={form.riskDesc}
                  onChange={(event) => updateField('riskDesc', textAreaValue(event))}
                />
              </label>
              <label className="pm-form-grid__full">
                建议动作 / 决策申请
                <textarea
                  rows={3}
                  value={form.suggestedAction}
                  onChange={(event) =>
                    updateField('suggestedAction', textAreaValue(event))
                  }
                />
              </label>
            </div>
          </section>

          <section className="pm-card">
            <div className="pm-card__header">
              <div>
                <p>供应商与算法</p>
                <h2>专项信息补充</h2>
              </div>
              <span className="pm-tag">可联动供应商管理 / 算法优化模块</span>
            </div>
            <div className="pm-form-grid">
              <label>
                供应商名称
                <input
                  value={form.supplierName}
                  onChange={(event) => updateField('supplierName', event.target.value)}
                />
              </label>
              <label>
                本周投入人数
                <input
                  type="number"
                  value={form.supplierHeadcount}
                  onChange={(event) =>
                    updateField('supplierHeadcount', Number(event.target.value))
                  }
                />
              </label>
              <label>
                供应商质量%
                <input
                  type="number"
                  value={form.supplierQuality}
                  onChange={(event) =>
                    updateField('supplierQuality', Number(event.target.value))
                  }
                />
              </label>
              <label>
                供应商准时率%
                <input
                  type="number"
                  value={form.supplierOtdRate}
                  onChange={(event) =>
                    updateField('supplierOtdRate', Number(event.target.value))
                  }
                />
              </label>
              <label>
                供应商配合度%
                <input
                  type="number"
                  value={form.supplierCooperation}
                  onChange={(event) =>
                    updateField('supplierCooperation', Number(event.target.value))
                  }
                />
              </label>
              <label>
                算法版本
                <input
                  value={form.algoVersion}
                  onChange={(event) => updateField('algoVersion', event.target.value)}
                />
              </label>
              <label>
                修正率%
                <input
                  type="number"
                  value={form.modificationRate}
                  onChange={(event) =>
                    updateField('modificationRate', Number(event.target.value))
                  }
                />
              </label>
              <label>
                提效%
                <input
                  type="number"
                  value={form.timeSavePct}
                  onChange={(event) => updateField('timeSavePct', Number(event.target.value))}
                />
              </label>
              <label className="pm-form-grid__full">
                供应商异常说明
                <textarea
                  rows={3}
                  value={form.supplierIssue}
                  onChange={(event) => updateField('supplierIssue', textAreaValue(event))}
                />
              </label>
              <label className="pm-form-grid__full">
                算法迭代建议
                <textarea
                  rows={3}
                  value={form.algoAdvice}
                  onChange={(event) => updateField('algoAdvice', textAreaValue(event))}
                />
              </label>
            </div>
          </section>

          <section className="pm-card">
            <div className="pm-card__header">
              <div>
                <p>工时与提交</p>
                <h2>本周投入 & 下周计划</h2>
              </div>
              <span className="pm-tag">提交后可生成周报摘要</span>
            </div>
            <div className="pm-form-grid">
              <label>
                本周工时（小时）
                <input
                  type="number"
                  value={form.hoursSpent}
                  onChange={(event) => updateField('hoursSpent', Number(event.target.value))}
                />
              </label>
              <label>
                PM 小时成本（元）
                <input
                  type="number"
                  value={form.pmHourlyCost}
                  onChange={(event) =>
                    updateField('pmHourlyCost', Number(event.target.value))
                  }
                />
              </label>
              <label className="pm-form-grid__full">
                PM 备注
                <textarea
                  rows={3}
                  value={form.pmComment}
                  onChange={(event) => updateField('pmComment', textAreaValue(event))}
                />
              </label>
              <label className="pm-form-grid__full">
                下周重点
                <textarea
                  rows={3}
                  value={form.nextWeekFocus}
                  onChange={(event) => updateField('nextWeekFocus', textAreaValue(event))}
                />
              </label>
            </div>
            <div className="pm-actions">
              <button
                className="pm-btn pm-btn--ghost"
                onClick={() => void persistReport('draft')}
                disabled={isSaving}
              >
                {activeReportId ? '更新草稿' : '保存草稿'}
              </button>
              <button
                className="pm-btn pm-btn--ghost"
                onClick={handleDelete}
                disabled={isSaving}
              >
                删除当前
              </button>
              <button
                className="pm-btn pm-btn--primary"
                onClick={() => void persistReport('submitted')}
                disabled={isSaving}
              >
                {isSaving ? '处理中...' : '提交本周填报'}
              </button>
            </div>
          </section>
        </div>

        <aside className="pm-side">
          <section className="pm-side-card">
            <div className="pm-side-card__header">
              <div>
                <p>本地记录中心</p>
                <h3>周填报列表</h3>
              </div>
              <button className="pm-mini-btn" onClick={createNewDraft}>
                新建填报
              </button>
            </div>
            <div className="pm-records">
              {reports.length === 0 ? (
                <div className="pm-records__empty">当前还没有已保存记录</div>
              ) : (
                reports.map((report) => (
                  <button
                    key={report.id}
                    className={`pm-record ${report.id === activeReportId ? 'is-active' : ''}`}
                    onClick={() => selectReport(report)}
                  >
                    <div className="pm-record__top">
                      <strong>{report.projectName}</strong>
                      <span>{recordStatusLabel(report.status)}</span>
                    </div>
                    <div className="pm-record__meta">
                      <span>{report.weekStart}</span>
                      <span>{report.pmName}</span>
                    </div>
                    <div className="pm-record__meta">
                      <span>{report.curveType}</span>
                      <span>更新于 {new Date(report.updatedAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="pm-side-card">
            <p>自动摘要</p>
            <h3>本周经营摘要</h3>
            <ul>
              <li>
                {selectedProject.name} 当前进度 {toPercent(form.progressPct)}，交付完成率{' '}
                {toPercent(deliveryRate)}。
              </li>
              <li>
                本周交付金额 {toWan(form.weeklyDeliveryAmount)}，累计成本消耗率{' '}
                {toPercent(costRate)}。
              </li>
              <li>
                质量 {toPercent(form.qualityPass)}，客户评分 {form.clientScore.toFixed(1)}，
                当前状态 {healthLabel.text}。
              </li>
              <li>下周重点：{form.nextWeekFocus}</li>
            </ul>
          </section>

          <section className="pm-side-card">
            <p>填报检查</p>
            <h3>提交前校验</h3>
            <div className="pm-checks">
              {completionChecks.map((item) => (
                <div key={item.label} className={item.done ? 'is-done' : 'is-pending'}>
                  <span>{item.done ? '✓' : '•'}</span>
                  <strong>{item.label}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="pm-side-card">
            <p>管理侧会看到</p>
            <h3>实时联动项</h3>
            <div className="pm-side-metrics">
              <div>
                <span>健康灯色</span>
                <strong>{form.riskLevel}</strong>
              </div>
              <div>
                <span>供应商异常</span>
                <strong>{form.supplierIssue === '无供应商异常' ? '无' : '有'}</strong>
              </div>
              <div>
                <span>算法优先级</span>
                <strong>
                  {form.modificationRate > 20
                    ? 'P0'
                    : form.modificationRate > 12
                      ? 'P1'
                      : 'P2'}
                </strong>
              </div>
              <div>
                <span>工时成本</span>
                <strong>
                  {(form.hoursSpent * form.pmHourlyCost).toLocaleString('zh-CN')} 元
                </strong>
              </div>
              <div>
                <span>当前记录</span>
                <strong>{activeReport ? recordStatusLabel(activeReport.status) : '未保存'}</strong>
              </div>
              <div>
                <span>最后更新时间</span>
                <strong>
                  {activeReport
                    ? new Date(activeReport.updatedAt).toLocaleString('zh-CN')
                    : '尚未保存'}
                </strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
