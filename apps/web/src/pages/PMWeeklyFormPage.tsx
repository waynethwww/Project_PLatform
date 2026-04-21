import { ChangeEvent, useEffect, useMemo, useState } from 'react';

import {
  createProject,
  createPmWeeklyReport,
  deletePmWeeklyReport,
  getPmWeeklyReportsBootstrap,
  PmWeeklyReport,
  PmWeeklyReportPayload,
  ProjectOption,
  updateProject,
  updatePmWeeklyReport,
} from '../lib/api';

type FormState = PmWeeklyReportPayload;
type ProjectEditorMode = 'create' | 'edit';
type NumericInputProps = {
  value: number;
  onValueChange: (value: number) => void;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
};

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

function createEmptyProject(): ProjectOption {
  const suffix = Date.now().toString().slice(-6);
  return {
    id: `P${suffix}`,
    name: '',
    pmName: '',
    curveType: '一曲线',
    annotationType: '',
    plannedQty: 0,
    qtyUnit: '项',
    budgetTotal: 0,
    defaultSupplier: '',
  };
}

function cloneProject(project: ProjectOption): ProjectOption {
  return { ...project };
}

function isCurve1Project(curveType: string) {
  return curveType === '一曲线';
}

function normalizeProjectOption(project: ProjectOption): ProjectOption {
  if (isCurve1Project(project.curveType)) {
    return project;
  }

  return {
    ...project,
    annotationType: '',
    plannedQty: 0,
    qtyUnit: '',
    defaultSupplier: '',
  };
}

function normalizeFormByCurveType(
  project: ProjectOption,
  payload: FormState,
): FormState {
  if (isCurve1Project(project.curveType)) {
    return payload;
  }

  return {
    ...payload,
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
  return normalizeFormByCurveType(project, {
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
    suggestedAction:
      project.curveType === '一曲线'
        ? '本周完成一次专项复盘，并同步客户/供应商侧动作'
        : '本周完成一次部署复盘，并明确客户/研发/交付三方动作',
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
    nextWeekFocus: '1. 盯质量与成本  2. 清理阻塞事项  3. 输出周报摘要',
    status: 'draft',
  });
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

function blockerStatusLabel(status: FormState['blockerStatus']) {
  if (status === 'closed') {
    return '已解决';
  }

  if (status === 'watching') {
    return '跟进中';
  }

  return '待处理';
}

function compareReports(left: PmWeeklyReport, right: PmWeeklyReport) {
  const weekCompare = right.weekStart.localeCompare(left.weekStart);
  if (weekCompare !== 0) {
    return weekCompare;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function formatDelta(value: number, digits = 0, suffix = '') {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return '尚未保存';
  }

  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeNumericValue(
  raw: string,
  allowDecimal: boolean,
  min?: number,
  max?: number,
) {
  if (raw === '' || raw === '.') {
    return 0;
  }

  const parsed = allowDecimal ? Number.parseFloat(raw) : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  let normalized = parsed;
  if (typeof min === 'number') {
    normalized = Math.max(min, normalized);
  }
  if (typeof max === 'number') {
    normalized = Math.min(max, normalized);
  }
  return normalized;
}

function NumericInput(props: NumericInputProps) {
  const { value, onValueChange, allowDecimal = false, min, max, step } = props;
  const [text, setText] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setText(String(value));
    }
  }, [isEditing, value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    const pattern = allowDecimal ? /^\d*(\.\d*)?$/ : /^\d*$/;
    if (!pattern.test(next)) {
      return;
    }

    setText(next);
    if (next === '' || next === '.') {
      return;
    }

    onValueChange(normalizeNumericValue(next, allowDecimal, min, max));
  }

  function handleBlur() {
    setIsEditing(false);
    const normalized = normalizeNumericValue(text, allowDecimal, min, max);
    onValueChange(normalized);
    setText(String(normalized));
  }

  return (
    <input
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={text}
      onFocus={() => setIsEditing(true)}
      onChange={handleChange}
      onBlur={handleBlur}
      step={step}
    />
  );
}

export function PMWeeklyFormPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [reports, setReports] = useState<PmWeeklyReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(createDefaultPayload(fallbackProject));
  const [draftStatus, setDraftStatus] = useState('正在加载本地填报数据...');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [projectMode, setProjectMode] = useState<ProjectEditorMode>('edit');
  const [projectForm, setProjectForm] = useState<ProjectOption>(createEmptyProject());
  const [projectStatus, setProjectStatus] = useState('可新增项目或调整当前项目经理');
  const [isProjectSaving, setIsProjectSaving] = useState(false);

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
          const initialProject =
            nextProjects.find((project) => project.id === nextReports[0].projectId) ||
            nextProjects[0] ||
            fallbackProject;
          setProjectForm(cloneProject(normalizeProjectOption(initialProject)));
          setProjectMode('edit');
          setProjectStatus(`已载入 ${initialProject.name} 主数据，可调整项目经理`);
        } else {
          const firstProject = nextProjects[0] || fallbackProject;
          setForm(createDefaultPayload(firstProject));
          setDraftStatus('当前没有填报记录，可创建首个周报草稿');
          setProjectForm(cloneProject(normalizeProjectOption(firstProject)));
          setProjectMode('edit');
          setProjectStatus('当前可新增项目，或先编辑当前项目主数据');
        }
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setProjects([fallbackProject]);
        setForm(createDefaultPayload(fallbackProject));
        setDraftStatus('加载失败，已进入离线草稿模式');
        setProjectForm(cloneProject(normalizeProjectOption(fallbackProject)));
        setProjectMode('edit');
        setProjectStatus('离线模式下仅可查看当前项目结构');
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
    normalizeProjectOption(
      projects.find((project) => project.id === form.projectId) ||
        projects[0] ||
        fallbackProject,
    );

  useEffect(() => {
    if (projectMode === 'edit') {
      setProjectForm(cloneProject(selectedProject));
    }
  }, [projectMode, selectedProject]);

  useEffect(() => {
    setForm((current) => normalizeFormByCurveType(selectedProject, current));
  }, [selectedProject.curveType, selectedProject.id]);

  const activeReport = reports.find((report) => report.id === activeReportId) || null;
  const isSelectedCurve1 = isCurve1Project(selectedProject.curveType);
  const isProjectFormCurve1 = isCurve1Project(projectForm.curveType);

  const projectReports = useMemo(
    () =>
      reports
        .filter((report) => report.projectId === form.projectId)
        .sort(compareReports),
    [form.projectId, reports],
  );

  const previousReport = useMemo(
    () => projectReports.find((report) => report.id !== activeReportId) || null,
    [activeReportId, projectReports],
  );

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

  const pmCost = useMemo(
    () => form.hoursSpent * form.pmHourlyCost,
    [form.hoursSpent, form.pmHourlyCost],
  );

  const healthLabel = useMemo(() => {
    if (form.riskLevel === '红' || costRate > 100 || form.qualityPass < 85) {
      return { text: '风险', tone: 'danger' as const };
    }

    if (form.riskLevel === '黄' || costRate > 85 || form.qualityPass < 92) {
      return { text: '关注', tone: 'warn' as const };
    }

    return { text: '在控', tone: 'ok' as const };
  }, [costRate, form.qualityPass, form.riskLevel]);

  const completionChecks = useMemo(
    () => [
      {
        label: '项目与周期',
        detail: '项目、周期已确认',
        done: Boolean(form.projectId && form.weekStart),
      },
      {
        label: '进度与交付',
        detail: isSelectedCurve1
          ? '进度、交付量、交付金额已填写'
          : '进度、确认金额与下周推进已填写',
        done:
          form.progressPct >= 0 &&
          form.actualQty >= 0 &&
          form.weeklyDeliveryAmount >= 0 &&
          form.amountDelivered >= 0,
      },
      {
        label: '成本与质量',
        detail: '成本、验收率、客户评分、工时已填写',
        done:
          form.costConsumed >= 0 &&
          form.qualityPass > 0 &&
          form.clientScore > 0 &&
          form.hoursSpent > 0,
      },
      {
        label: '风险与异常',
        detail: isSelectedCurve1
          ? '风险描述、阻塞事项、建议动作已确认'
          : '风险描述、阻塞事项、部署动作已确认',
        done:
          form.riskDesc.trim().length > 0 &&
          (form.riskLevel === '绿' || form.blockerTitle.trim().length > 0) &&
          form.suggestedAction.trim().length > 0,
      },
      {
        label: '下周计划',
        detail: '下周重点已补充',
        done: form.nextWeekFocus.trim().length > 0,
      },
    ],
    [form, isSelectedCurve1],
  );

  const filledCount = completionChecks.filter((item) => item.done).length;
  const canSubmit = completionChecks.every((item) => item.done);

  const fixedInfoItems = useMemo(
    () => {
      const baseItems = [
        { label: '项目名称', value: selectedProject.name, hint: '主数据' },
        { label: '项目编号', value: selectedProject.id, hint: '只读' },
        { label: '项目经理', value: selectedProject.pmName, hint: '自动带出' },
        { label: '曲线类型', value: selectedProject.curveType, hint: '只读' },
        { label: '预算总额', value: toWan(selectedProject.budgetTotal), hint: '主数据' },
      ];

      if (isSelectedCurve1) {
        return [
          ...baseItems,
          { label: '标注类型', value: selectedProject.annotationType, hint: '自动带出' },
          {
            label: '计划总量',
            value: `${selectedProject.plannedQty} ${selectedProject.qtyUnit}`,
            hint: '主数据',
          },
          { label: '默认供应商', value: selectedProject.defaultSupplier, hint: '自动带出' },
        ];
      }

      return [
        ...baseItems,
        { label: '项目口径', value: '私有化部署', hint: '不涉及标注与供应商信息' },
        { label: '跟踪重点', value: '里程碑 / 预算 / 风险', hint: '每周按部署进度填报' },
      ];
    },
    [isSelectedCurve1, selectedProject],
  );

  const comparisonCards = useMemo(() => {
    if (!previousReport) {
      return [
        { label: '进度变化', value: '首次填报', tone: 'neutral' },
        {
          label: isSelectedCurve1 ? '本周交付' : '本周新增成本',
          value: isSelectedCurve1 ? toWan(form.weeklyDeliveryAmount) : toWan(form.costConsumed),
          tone: 'neutral',
        },
        { label: '成本变化', value: toWan(form.costConsumed), tone: 'neutral' },
        { label: '风险等级', value: form.riskLevel, tone: 'neutral' },
        {
          label: isSelectedCurve1 ? '修正率变化' : '本周工时',
          value: isSelectedCurve1 ? `${form.modificationRate.toFixed(0)}%` : `${form.hoursSpent}h`,
          tone: 'neutral',
        },
      ];
    }

    return [
      {
        label: '进度变化',
        value: formatDelta(form.progressPct - previousReport.progressPct, 0, '%'),
        tone: form.progressPct - previousReport.progressPct >= 0 ? 'positive' : 'negative',
      },
      {
        label: isSelectedCurve1 ? '本周交付' : '成本变化',
        value: formatDelta(
          (isSelectedCurve1 ? form.weeklyDeliveryAmount : form.costConsumed) -
            (isSelectedCurve1
              ? previousReport.weeklyDeliveryAmount
              : previousReport.costConsumed),
          1,
          ' 万',
        ),
        tone:
          (isSelectedCurve1 ? form.weeklyDeliveryAmount : form.costConsumed) -
            (isSelectedCurve1
              ? previousReport.weeklyDeliveryAmount
              : previousReport.costConsumed) >=
          0
            ? 'positive'
            : 'negative',
      },
      {
        label: isSelectedCurve1 ? '成本变化' : '累计金额变化',
        value: formatDelta(
          (isSelectedCurve1 ? form.costConsumed : form.amountDelivered) -
            (isSelectedCurve1
              ? previousReport.costConsumed
              : previousReport.amountDelivered),
          1,
          ' 万',
        ),
        tone:
          (isSelectedCurve1 ? form.costConsumed : form.amountDelivered) -
            (isSelectedCurve1
              ? previousReport.costConsumed
              : previousReport.amountDelivered) <=
          0
            ? 'positive'
            : 'negative',
      },
      {
        label: '风险等级',
        value: `${previousReport.riskLevel} → ${form.riskLevel}`,
        tone:
          previousReport.riskLevel === form.riskLevel
            ? 'neutral'
            : form.riskLevel === '红'
              ? 'negative'
              : 'positive',
      },
      {
        label: isSelectedCurve1 ? '修正率变化' : '工时变化',
        value: isSelectedCurve1
          ? formatDelta(form.modificationRate - previousReport.modificationRate, 0, '%')
          : formatDelta(form.hoursSpent - previousReport.hoursSpent, 0, 'h'),
        tone:
          (isSelectedCurve1
            ? form.modificationRate - previousReport.modificationRate
            : form.hoursSpent - previousReport.hoursSpent) <= 0
            ? 'positive'
            : 'negative',
      },
    ];
  }, [form, isSelectedCurve1, previousReport]);

  const weeklySummary = useMemo(
    () =>
      isSelectedCurve1
        ? [
            `${selectedProject.name} 当前进度 ${toPercent(form.progressPct)}，交付完成率 ${toPercent(deliveryRate)}。`,
            `本周交付 ${toWan(form.weeklyDeliveryAmount)}，累计交付 ${toWan(form.amountDelivered)}，预算消耗率 ${toPercent(costRate)}。`,
            `质量 ${toPercent(form.qualityPass)}，客户评分 ${form.clientScore.toFixed(1)}，当前状态 ${healthLabel.text}。`,
            `阻塞事项：${form.blockerTitle || '暂无'}；下周重点：${form.nextWeekFocus || '待补充'}。`,
          ]
        : [
            `${selectedProject.name} 当前部署进度 ${toPercent(form.progressPct)}，预算消耗率 ${toPercent(costRate)}。`,
            `本周新增成本 ${toWan(form.costConsumed)}，累计确认金额 ${toWan(form.amountDelivered)}，客户评分 ${form.clientScore.toFixed(1)}。`,
            `当前风险状态 ${healthLabel.text}；阻塞事项 ${form.blockerTitle || '暂无'}。`,
            `下周重点：${form.nextWeekFocus || '待补充'}。`,
          ],
    [
      costRate,
      deliveryRate,
      form.amountDelivered,
      form.blockerTitle,
      form.clientScore,
      form.nextWeekFocus,
      form.progressPct,
      form.qualityPass,
      form.weeklyDeliveryAmount,
      healthLabel.text,
      isSelectedCurve1,
      selectedProject.name,
    ],
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
    const reportProject =
      projects.find((project) => project.id === report.projectId) || fallbackProject;
    setForm(normalizeFormByCurveType(reportProject, reportToPayload(report)));
    setDraftStatus(`已切换到 ${report.projectName} · ${report.weekStart}`);
  }

  function createNewDraft() {
    setActiveReportId(null);
    setForm(createDefaultPayload(selectedProject, form.weekStart || getWeekStart()));
    setDraftStatus(`已创建 ${selectedProject.name} 的新草稿，待保存`);
  }

  function beginCreateProject() {
    setProjectMode('create');
    setProjectForm(createEmptyProject());
    setProjectStatus('新增项目模式：保存后即可在周填报中选择该项目');
  }

  function loadSelectedProjectIntoEditor() {
    setProjectMode('edit');
    setProjectForm(cloneProject(selectedProject));
    setProjectStatus(`已载入 ${selectedProject.name}，可调整项目经理和基础信息`);
  }

  function updateProjectField<K extends keyof ProjectOption>(
    key: K,
    value: ProjectOption[K],
  ) {
    setProjectForm((current) =>
      key === 'curveType'
        ? normalizeProjectOption({
            ...current,
            [key]: value,
          } as ProjectOption)
        : ({
            ...current,
            [key]: value,
          } as ProjectOption),
    );
    setProjectStatus(projectMode === 'create' ? '新增项目待保存' : '项目主数据待保存');
  }

  async function saveProjectDefinition() {
    if (!projectForm.id.trim() || !projectForm.name.trim() || !projectForm.pmName.trim()) {
      setProjectStatus('请至少填写项目编号、项目名称、项目经理');
      return;
    }

    setIsProjectSaving(true);
    try {
      const normalizedProject = normalizeProjectOption({
        ...projectForm,
        id: projectForm.id.trim(),
        name: projectForm.name.trim(),
        pmName: projectForm.pmName.trim(),
        annotationType: projectForm.annotationType.trim(),
        qtyUnit: projectForm.qtyUnit.trim(),
        defaultSupplier: projectForm.defaultSupplier.trim(),
      });

      if (projectMode === 'create') {
        await createProject(normalizedProject);
      } else {
        await updateProject(projectForm.id, normalizedProject);
      }

      const bootstrap = await getPmWeeklyReportsBootstrap();
      setProjects(bootstrap.projects);
      setReports(bootstrap.reports);

      const syncedProject =
        bootstrap.projects.find((project) => project.id === projectForm.id) ||
        bootstrap.projects[0] ||
        fallbackProject;

      if (projectMode === 'create') {
        setActiveReportId(null);
        setForm(createDefaultPayload(syncedProject, form.weekStart || getWeekStart()));
        setDraftStatus(`已新增项目 ${syncedProject.name}，可继续填写首个周报`);
      } else {
        const syncedActiveReport = activeReportId
          ? bootstrap.reports.find((report) => report.id === activeReportId)
          : null;

        if (syncedActiveReport) {
          setForm(reportToPayload(syncedActiveReport));
        }

        setDraftStatus(`已同步 ${syncedProject.name} 主数据变更`);
      }

      setProjectMode('edit');
      setProjectForm(cloneProject(normalizeProjectOption(syncedProject)));
      setProjectStatus(
        projectMode === 'create'
          ? `已新增项目 ${syncedProject.name}`
          : `已更新 ${syncedProject.name}，当前项目经理已同步到相关记录`,
      );
    } catch {
      setProjectStatus('保存项目失败，请检查项目编号是否重复或后端服务状态');
    } finally {
      setIsProjectSaving(false);
    }
  }

  async function persistReport(status: FormState['status']) {
    setIsSaving(true);
    try {
      const payload: FormState = normalizeFormByCurveType(selectedProject, {
        ...form,
        status,
      });

      if (activeReportId) {
        const updated = await updatePmWeeklyReport(activeReportId, payload);
        setReports((current) =>
          [updated, ...current.filter((item) => item.id !== updated.id)].sort(compareReports),
        );
        setActiveReportId(updated.id);
        setForm(reportToPayload(updated));
        setDraftStatus(`${status === 'submitted' ? '已提交' : '已保存'} · ${updated.projectName}`);
      } else {
        const created = await createPmWeeklyReport(payload);
        setReports((current) => [created, ...current].sort(compareReports));
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
      <header className="pm-page-header">
        <div>
          <p className="pm-page-header__eyebrow">PM 周填报</p>
          <h1>PM 周填报</h1>
          <p className="pm-page-header__sub">固定信息抽离后，仅填本周变化项</p>
        </div>
        <div className="pm-page-actions">
          <button className="pm-btn pm-btn--light" onClick={() => (window.location.hash = '#/weekly-report')}>
            返回
          </button>
          <button className="pm-btn pm-btn--light" onClick={createNewDraft}>
            新建草稿
          </button>
          <button
            className="pm-btn pm-btn--light"
            onClick={() => void persistReport('draft')}
            disabled={isSaving}
          >
            {activeReportId ? '保存修改' : '保存草稿'}
          </button>
          <button
            className="pm-btn pm-btn--primary"
            onClick={() => void persistReport('submitted')}
            disabled={isSaving}
          >
            {isSaving ? '处理中...' : '提交周报'}
          </button>
        </div>
      </header>

      <section className="pm-context-bar">
        <div className="pm-context-grid">
          <label className="pm-field">
            <span className="pm-field__label">项目名称</span>
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
          <label className="pm-field">
            <span className="pm-field__label">周期</span>
            <input
              type="date"
              value={form.weekStart}
              onChange={(event) => updateField('weekStart', event.target.value)}
            />
          </label>
          <div className="pm-context-status">
            <span className={`pm-badge pm-badge--${healthLabel.tone}`}>健康状态：{healthLabel.text}</span>
            <span className="pm-badge">{activeReport ? recordStatusLabel(activeReport.status) : '未保存'}</span>
            <span className="pm-badge">草稿状态：{isLoading ? '加载中...' : draftStatus}</span>
          </div>
        </div>
      </section>

      <div className="pm-layout">
        <main className="pm-main">
          <section className="pm-panel pm-panel--fixed">
            <div className="pm-panel__header">
              <div>
                <p>固定信息</p>
                <h2>固定信息（自动带出，不需每周修改）</h2>
              </div>
              <div className="pm-chip-row">
                <span className="pm-chip">只读</span>
                <span className="pm-chip">自动带出</span>
                <span className="pm-chip">主数据</span>
              </div>
            </div>
            <div className="pm-fixed-grid">
              {fixedInfoItems.map((item) => (
                <div key={item.label} className="pm-fixed-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.hint}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="pm-panel">
            <div className="pm-panel__header">
              <div>
                <p>本周填报</p>
                <h2>本周填报（仅填写变化项）</h2>
              </div>
              <div className="pm-stat-strip">
              <div>
                  <span>{isSelectedCurve1 ? '交付完成率' : '当前进度'}</span>
                  <strong>{isSelectedCurve1 ? toPercent(deliveryRate) : toPercent(form.progressPct)}</strong>
                </div>
                <div>
                  <span>预算消耗率</span>
                  <strong>{toPercent(costRate)}</strong>
                </div>
                <div>
                  <span>{isSelectedCurve1 ? 'PM工时成本' : '累计确认金额'}</span>
                  <strong>
                    {isSelectedCurve1
                      ? `${pmCost.toLocaleString('zh-CN')} 元`
                      : toWan(form.amountDelivered)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="pm-entry-groups">
              <article className="pm-entry-group">
                <div className="pm-entry-group__head">
                  <div>
                    <h3>{isSelectedCurve1 ? '进度与交付' : '进度与部署'}</h3>
                    <p>
                      {isSelectedCurve1
                        ? '只填本周变化项，系统保留主数据口径'
                        : '二/三曲线按私有化部署口径汇报，不展示标注数量单位'}
                    </p>
                  </div>
                  <span className="pm-inline-tag">本周新增</span>
                </div>
                <div className="pm-entry-grid">
                  <label className="pm-field">
                    <span className="pm-field__label">进度% <em>必填</em></span>
                    <NumericInput
                      value={form.progressPct}
                      onValueChange={(value) => updateField('progressPct', value)}
                    />
                  </label>
                  {isSelectedCurve1 ? (
                    <label className="pm-field">
                      <span className="pm-field__label">实际交付量 <em>必填</em></span>
                      <NumericInput
                        value={form.actualQty}
                        onValueChange={(value) => updateField('actualQty', value)}
                      />
                    </label>
                  ) : (
                    <div className="pm-auto-box pm-auto-box--hint">
                      <span>私有化部署口径</span>
                      <strong>不填交付量与数量单位</strong>
                      <small>二/三曲线重点看里程碑进度、预算执行、阻塞事项和下周推进动作。</small>
                    </div>
                  )}
                  <label className="pm-field">
                    <span className="pm-field__label">
                      {isSelectedCurve1 ? '本周交付金额' : '本周确认金额'}
                    </span>
                    <NumericInput
                      allowDecimal
                      step="0.1"
                      value={form.weeklyDeliveryAmount}
                      onValueChange={(value) => updateField('weeklyDeliveryAmount', value)}
                    />
                  </label>
                  <label className="pm-field">
                    <span className="pm-field__label">
                      {isSelectedCurve1 ? '累计交付金额' : '累计确认金额'}
                    </span>
                    <NumericInput
                      allowDecimal
                      step="0.1"
                      value={form.amountDelivered}
                      onValueChange={(value) => updateField('amountDelivered', value)}
                    />
                  </label>
                  <label className="pm-field pm-field--full">
                    <span className="pm-field__label">下周重点 <em>必填</em></span>
                    <textarea
                      rows={3}
                      value={form.nextWeekFocus}
                      onChange={(event) => updateField('nextWeekFocus', textAreaValue(event))}
                    />
                    <small className="pm-field__hint">建议只写 2-3 条动作，便于周会直接复述</small>
                  </label>
                </div>
              </article>

              <article className="pm-entry-group">
                <div className="pm-entry-group__head">
                  <div>
                    <h3>成本与质量</h3>
                    <p>优先录入本周新增成本、质量和客户反馈</p>
                  </div>
                  <span className="pm-inline-tag">自动计算</span>
                </div>
                <div className="pm-entry-grid">
                  <label className="pm-field">
                    <span className="pm-field__label">成本消耗</span>
                    <NumericInput
                      allowDecimal
                      step="0.1"
                      value={form.costConsumed}
                      onValueChange={(value) => updateField('costConsumed', value)}
                    />
                  </label>
                  <label className="pm-field">
                    <span className="pm-field__label">验收率%</span>
                    <NumericInput
                      value={form.qualityPass}
                      onValueChange={(value) => updateField('qualityPass', value)}
                    />
                  </label>
                  <label className="pm-field">
                    <span className="pm-field__label">客户评分</span>
                    <NumericInput
                      allowDecimal
                      min={1}
                      max={5}
                      step="0.1"
                      value={form.clientScore}
                      onValueChange={(value) => updateField('clientScore', value)}
                    />
                  </label>
                  <label className="pm-field">
                    <span className="pm-field__label">PM工时</span>
                    <NumericInput
                      value={form.hoursSpent}
                      onValueChange={(value) => updateField('hoursSpent', value)}
                    />
                  </label>
                  <label className="pm-field">
                    <span className="pm-field__label">PM小时成本</span>
                    <NumericInput
                      value={form.pmHourlyCost}
                      onValueChange={(value) => updateField('pmHourlyCost', value)}
                    />
                  </label>
                  <div className="pm-auto-box">
                    <span>自动计算提示</span>
                    <strong>{pmCost.toLocaleString('zh-CN')} 元</strong>
                    <small>基于工时 × 小时成本自动换算，仅作为本周投入参考。</small>
                  </div>
                </div>
              </article>

              <article className="pm-entry-group">
                <div className="pm-entry-group__head">
                  <div>
                    <h3>风险与异常</h3>
                    <p>出现黄红灯时，必须把风险和阻塞事项写实</p>
                  </div>
                  <span className="pm-inline-tag pm-inline-tag--warn">重点检查</span>
                </div>
                <div className="pm-entry-grid">
                  <label className="pm-field">
                    <span className="pm-field__label">风险等级</span>
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
                  <label className="pm-field">
                    <span className="pm-field__label">阻塞事项状态</span>
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
                  <label className="pm-field">
                    <span className="pm-field__label">阻塞事项</span>
                    <input
                      value={form.blockerTitle}
                      onChange={(event) => updateField('blockerTitle', event.target.value)}
                    />
                  </label>
                  <label className="pm-field">
                    <span className="pm-field__label">计划解决日期</span>
                    <input
                      type="date"
                      value={form.blockerDueDate}
                      onChange={(event) => updateField('blockerDueDate', event.target.value)}
                    />
                  </label>
                  <label className="pm-field pm-field--full">
                    <span className="pm-field__label">风险描述 <em>必填</em></span>
                    <textarea
                      rows={3}
                      value={form.riskDesc}
                      onChange={(event) => updateField('riskDesc', textAreaValue(event))}
                    />
                  </label>
                  <label className="pm-field pm-field--full">
                    <span className="pm-field__label">建议动作</span>
                    <textarea
                      rows={3}
                      value={form.suggestedAction}
                      onChange={(event) =>
                        updateField('suggestedAction', textAreaValue(event))
                      }
                    />
                  </label>
                  {isSelectedCurve1 ? (
                    <label className="pm-field pm-field--full">
                      <span className="pm-field__label">供应商异常</span>
                      <textarea
                        rows={3}
                        value={form.supplierIssue}
                        onChange={(event) =>
                          updateField('supplierIssue', textAreaValue(event))
                        }
                      />
                    </label>
                  ) : (
                    <div className="pm-auto-box pm-auto-box--hint pm-field--full">
                      <span>私有化部署项目说明</span>
                      <strong>风险区仅记录里程碑与部署阻塞</strong>
                      <small>二/三曲线不填供应商异常，相关问题统一写入风险描述、阻塞事项和建议动作。</small>
                    </div>
                  )}
                </div>
              </article>

              <article className="pm-entry-group">
                <div className="pm-entry-group__head">
                  <div>
                    <h3>{isSelectedCurve1 ? '供应商与算法专项' : '部署专项说明'}</h3>
                    <p>
                      {isSelectedCurve1
                        ? '保留专项字段，但不抢主流程注意力'
                        : '二/三曲线聚焦部署协同与里程碑推进，不展示供应商与标注算法字段'}
                    </p>
                  </div>
                  <span className="pm-inline-tag">沿用上周可微调</span>
                </div>
                <div className="pm-entry-grid">
                  {isSelectedCurve1 ? (
                    <>
                      <label className="pm-field">
                        <span className="pm-field__label">供应商名称</span>
                        <input
                          value={form.supplierName}
                          onChange={(event) => updateField('supplierName', event.target.value)}
                        />
                      </label>
                      <label className="pm-field">
                        <span className="pm-field__label">投入人数</span>
                        <NumericInput
                          value={form.supplierHeadcount}
                          onValueChange={(value) => updateField('supplierHeadcount', value)}
                        />
                      </label>
                      <label className="pm-field">
                        <span className="pm-field__label">供应商质量%</span>
                        <NumericInput
                          value={form.supplierQuality}
                          onValueChange={(value) => updateField('supplierQuality', value)}
                        />
                      </label>
                      <label className="pm-field">
                        <span className="pm-field__label">准时率%</span>
                        <NumericInput
                          value={form.supplierOtdRate}
                          onValueChange={(value) => updateField('supplierOtdRate', value)}
                        />
                      </label>
                      <label className="pm-field">
                        <span className="pm-field__label">配合度%</span>
                        <NumericInput
                          value={form.supplierCooperation}
                          onValueChange={(value) => updateField('supplierCooperation', value)}
                        />
                      </label>
                      <label className="pm-field">
                        <span className="pm-field__label">算法版本</span>
                        <input
                          value={form.algoVersion}
                          onChange={(event) => updateField('algoVersion', event.target.value)}
                        />
                      </label>
                      <label className="pm-field">
                        <span className="pm-field__label">修正率%</span>
                        <NumericInput
                          value={form.modificationRate}
                          onValueChange={(value) => updateField('modificationRate', value)}
                        />
                      </label>
                      <label className="pm-field">
                        <span className="pm-field__label">提效%</span>
                        <NumericInput
                          value={form.timeSavePct}
                          onValueChange={(value) => updateField('timeSavePct', value)}
                        />
                      </label>
                      <label className="pm-field pm-field--full">
                        <span className="pm-field__label">算法迭代建议</span>
                        <textarea
                          rows={3}
                          value={form.algoAdvice}
                          onChange={(event) => updateField('algoAdvice', textAreaValue(event))}
                        />
                      </label>
                    </>
                  ) : (
                    <div className="pm-auto-box pm-auto-box--hint pm-field--full">
                      <span>当前口径</span>
                      <strong>二/三曲线不填供应商与标注算法专项</strong>
                      <small>请重点在“风险与异常”“备注”“下周重点”中描述部署进展、环境联调和需协同事项。</small>
                    </div>
                  )}
                  <label className="pm-field pm-field--full">
                    <span className="pm-field__label">{isSelectedCurve1 ? '备注' : '部署备注'}</span>
                    <textarea
                      rows={3}
                      value={form.pmComment}
                      onChange={(event) => updateField('pmComment', textAreaValue(event))}
                    />
                  </label>
                </div>
              </article>
            </div>
          </section>

          <section className="pm-panel pm-panel--compare">
            <div className="pm-panel__header">
              <div>
                <p>与上周对比</p>
                <h2>变化摘要</h2>
              </div>
              <span className="pm-chip">
                {previousReport ? `对比 ${previousReport.weekStart}` : '暂无可对比的上一期数据'}
              </span>
            </div>
            <div className="pm-compare-grid">
              {comparisonCards.map((item) => (
                <article
                  key={item.label}
                  className={`pm-compare-card pm-compare-card--${item.tone}`}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="pm-side">
          <section className="pm-side-card">
            <div className="pm-side-card__header">
              <div>
                <p>项目主数据</p>
                <h3>{projectMode === 'create' ? '新增项目' : '项目信息维护'}</h3>
              </div>
              <span className="pm-chip">
                {projectMode === 'create' ? '新增模式' : '编辑模式'}
              </span>
            </div>
            <div className="pm-project-form">
              <label className="pm-field">
                <span className="pm-field__label">项目编号</span>
                <input
                  value={projectForm.id}
                  onChange={(event) => updateProjectField('id', event.target.value)}
                  disabled={projectMode === 'edit'}
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">项目名称</span>
                <input
                  value={projectForm.name}
                  onChange={(event) => updateProjectField('name', event.target.value)}
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">项目经理</span>
                <input
                  value={projectForm.pmName}
                  onChange={(event) => updateProjectField('pmName', event.target.value)}
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">曲线类型</span>
                <select
                  value={projectForm.curveType}
                  onChange={(event) => updateProjectField('curveType', event.target.value)}
                >
                  <option value="一曲线">一曲线</option>
                  <option value="二曲线">二曲线</option>
                  <option value="三曲线">三曲线</option>
                </select>
              </label>
              {isProjectFormCurve1 ? (
                <>
                  <label className="pm-field">
                    <span className="pm-field__label">标注类型</span>
                    <input
                      value={projectForm.annotationType}
                      onChange={(event) =>
                        updateProjectField('annotationType', event.target.value)
                      }
                    />
                  </label>
                  <label className="pm-field">
                    <span className="pm-field__label">计划总量</span>
                    <NumericInput
                      value={projectForm.plannedQty}
                      onValueChange={(value) => updateProjectField('plannedQty', value)}
                    />
                  </label>
                  <label className="pm-field">
                    <span className="pm-field__label">数量单位</span>
                    <input
                      value={projectForm.qtyUnit}
                      onChange={(event) => updateProjectField('qtyUnit', event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <div className="pm-auto-box pm-auto-box--hint pm-field--full">
                  <span>私有化部署项目</span>
                  <strong>不维护标注类型、数量单位、默认供应商</strong>
                  <small>二/三曲线只维护项目经理、预算总额和后续部署进度，周填报按里程碑与预算口径汇报。</small>
                </div>
              )}
              <label className="pm-field">
                <span className="pm-field__label">预算总额</span>
                <NumericInput
                  allowDecimal
                  step="0.1"
                  value={projectForm.budgetTotal}
                  onValueChange={(value) => updateProjectField('budgetTotal', value)}
                />
              </label>
              {isProjectFormCurve1 ? (
                <label className="pm-field pm-field--full">
                  <span className="pm-field__label">默认供应商</span>
                  <input
                    value={projectForm.defaultSupplier}
                    onChange={(event) =>
                      updateProjectField('defaultSupplier', event.target.value)
                    }
                  />
                </label>
              ) : null}
            </div>
            <div className="pm-actions pm-actions--stack">
              <button className="pm-btn pm-btn--light" onClick={beginCreateProject}>
                新增项目
              </button>
              <button className="pm-btn pm-btn--light" onClick={loadSelectedProjectIntoEditor}>
                载入当前项目
              </button>
              <button
                className="pm-btn pm-btn--primary"
                onClick={() => void saveProjectDefinition()}
                disabled={isProjectSaving}
              >
                {isProjectSaving ? '保存中...' : projectMode === 'create' ? '保存新项目' : '保存项目调整'}
              </button>
            </div>
            <div className="pm-side-note">
              {projectStatus}。调整项目经理后，会同步更新该项目现有周报中的负责人展示口径。
            </div>
          </section>

          <section className="pm-side-card">
            <div className="pm-side-card__header">
              <div>
                <p>记录中心</p>
                <h3>本地周报记录</h3>
              </div>
              <button className="pm-mini-btn" onClick={createNewDraft}>
                新建
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
                      <span>更新于 {formatDateTime(report.updatedAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="pm-side-card pm-side-card--overview">
            <p>提交概览</p>
            <h3>提交概览</h3>
            <div className="pm-check-summary">
              <strong>
                已填写 {filledCount}/{completionChecks.length}
              </strong>
              <span>{canSubmit ? '可提交' : '仍有待补项'}</span>
            </div>
            <div className="pm-check-list pm-check-list--compact">
              {completionChecks.map((item) => (
                <div
                  key={item.label}
                  className={`pm-check-item ${item.done ? 'is-done' : 'is-pending'}`}
                >
                  <span className="pm-check-item__icon">{item.done ? '✓' : '!'}</span>
                  <div className="pm-check-item__body">
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </div>
                  <span className="pm-check-item__state">
                    {item.done ? '已完成' : '待补充'}
                  </span>
                </div>
              ))}
            </div>
            <div className="pm-side-card__section">
              <h4>本周经营摘要</h4>
              <ul className="pm-summary-list">
                {weeklySummary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="pm-side-card__section">
              <h4>系统状态</h4>
              <div className="pm-side-metrics pm-side-metrics--compact">
              <div>
                <span>风险等级</span>
                <strong>{form.riskLevel}</strong>
              </div>
              <div>
                <span>阻塞事项</span>
                <strong>{blockerStatusLabel(form.blockerStatus)}</strong>
              </div>
              <div>
                <span>工时</span>
                <strong>{form.hoursSpent}h</strong>
              </div>
              <div>
                <span>工时成本</span>
                <strong>{pmCost.toLocaleString('zh-CN')} 元</strong>
              </div>
              <div>
                <span>{isSelectedCurve1 ? '算法优先级' : '项目口径'}</span>
                <strong>
                  {isSelectedCurve1
                    ? form.modificationRate > 20
                      ? 'P0'
                      : form.modificationRate > 12
                        ? 'P1'
                        : 'P2'
                    : '私有化部署'}
                </strong>
              </div>
              <div>
                <span>最后更新时间</span>
                <strong>{activeReport ? formatDateTime(activeReport.updatedAt) : '尚未保存'}</strong>
              </div>
            </div>
            </div>
            <div className="pm-side-note">
              提交后同步周汇报视图；当前草稿状态：{draftStatus}
            </div>
            <div className="pm-actions pm-actions--side">
              <button
                className="pm-btn pm-btn--danger"
                onClick={handleDelete}
                disabled={isSaving}
              >
                删除当前
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
