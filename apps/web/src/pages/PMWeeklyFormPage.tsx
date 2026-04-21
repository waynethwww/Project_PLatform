import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

import { AppSelect } from '../components/AppSelect';
import {
  archiveProject,
  createProject,
  createPmWeeklyReport,
  deletePmWeeklyReport,
  getPmWeeklyReportsBootstrap,
  PmWeeklyReport,
  PmWeeklyReportPayload,
  ProjectOption,
  RiskItem,
  recycleProject,
  restoreProject,
  updateProject,
  updatePmWeeklyReport,
} from '../lib/api';

type FormState = PmWeeklyReportPayload;
type ProjectEditorMode = 'create' | 'edit';
type ProjectLifecycleAction = 'archive' | 'recycle' | 'restore';
type NumericInputProps = {
  value: number;
  onValueChange: (value: number) => void;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
  emptyWhenZero?: boolean;
};

type ComboInputProps = {
  value: string;
  options: Array<{
    label: string;
    keywords?: string[];
  }>;
  placeholder?: string;
  ariaLabel?: string;
  onChange: (value: string) => void;
};

type PendingProjectAction = {
  type: 'archive' | 'recycle';
  project: ProjectOption;
} | null;

const PROJECT_MANAGER_OPTIONS = [
  { label: '刘兴祖', keywords: ['liuxingzu', 'lxz', 'liu', 'xing', 'zu'] },
  { label: '王天浩', keywords: ['wangtianhao', 'wth', 'wang', 'tian', 'hao'] },
  { label: '贾金鹏', keywords: ['jiajinpeng', 'jjp', 'jia', 'jin', 'peng'] },
  { label: '郑威格', keywords: ['zhengweige', 'zwg', 'zheng', 'wei', 'ge'] },
  { label: '张艺缤', keywords: ['zhangyibin', 'zyb', 'zhang', 'yi', 'bin'] },
  { label: '李仕伟', keywords: ['lishiwei', 'lsw', 'li', 'shi', 'wei'] },
  { label: '冯德隆', keywords: ['fengdelong', 'fdl', 'feng', 'de', 'long'] },
  { label: '闫成成', keywords: ['yanchengcheng', 'ycc', 'yan', 'cheng'] },
  { label: '刘宗岩', keywords: ['liuzongyan', 'lzy', 'liu', 'zong', 'yan'] },
  { label: '刘紫煜', keywords: ['liuziyu', 'lzy', 'liu', 'zi', 'yu'] },
  { label: '王聪', keywords: ['wangcong', 'wc', 'wang', 'cong'] },
];

const ANNOTATION_TYPE_OPTIONS = [
  { label: '点云分割', keywords: ['dianyunfenge', 'dyfg', 'dianyun', 'fenge', 'pointcloud'] },
  { label: '2D框', keywords: ['2d', '2dkuang', 'erweikuang', 'ewk'] },
  { label: '3D框', keywords: ['3d', '3dkuang', 'sanweikuang', 'swk'] },
  { label: '23D融合', keywords: ['23d', '23dronghe', 'ronghe', 'rh'] },
  { label: '4D车道线', keywords: ['4d', '4dchedaoxian', 'cdx', 'chedao', 'xian'] },
  { label: '分类', keywords: ['fenlei', 'fl'] },
  { label: '视频', keywords: ['shipin', 'sp'] },
  { label: '语音', keywords: ['yuyin', 'yy'] },
  { label: '采集', keywords: ['caiji', 'cj'] },
];

const NO_RISK_DESCRIPTION = '当前项目暂无明确风险，按常规节奏持续跟进即可。';
const NO_RISK_ACTION = '保持例行跟踪与周会同步，如出现异常再补充风险项。';

const fallbackProject: ProjectOption = {
  id: 'temp-project',
  name: '未选择项目',
  pmName: '待分配',
  curveType: '一曲线',
  annotationType: '未配置',
  plannedQty: 0,
  qtyUnit: '项',
  contractAmount: 0,
  budgetTotal: 0,
  defaultSupplier: '未配置',
  status: 'active',
};

function createEmptyProject(): ProjectOption {
  return {
    id: '',
    name: '',
    pmName: '',
    curveType: '',
    annotationType: '',
    plannedQty: 0,
    qtyUnit: '',
    contractAmount: 0,
    budgetTotal: 0,
    defaultSupplier: '',
    status: 'active',
  };
}

function cloneProject(project: ProjectOption): ProjectOption {
  return { ...project };
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isCurve1Project(curveType: string) {
  return curveType === '一曲线';
}

function normalizeProjectOption(project: ProjectOption): ProjectOption {
  if (!project.curveType) {
    return project;
  }

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
    amountDelivered: payload.costConsumed,
  };
}

function createRiskItem(
  partial: Partial<RiskItem> = {},
  weekStart = getWeekStart(),
): RiskItem {
  return {
    id: partial.id || createLocalId('risk'),
    level: partial.level || '绿',
    title: partial.title || '',
    status: partial.status || 'watching',
    dueDate: partial.dueDate || weekStart,
    description: partial.description || '',
    action: partial.action || '',
  };
}

function normalizeRiskItems(
  riskItems: RiskItem[] | undefined,
  fallback: {
    weekStart: string;
    riskLevel: FormState['riskLevel'];
    blockerTitle: string;
    blockerStatus: FormState['blockerStatus'];
    blockerDueDate: string;
    riskDesc: string;
    suggestedAction: string;
  },
) {
  if (Array.isArray(riskItems) && riskItems.length > 0) {
    return riskItems.map((item) =>
      createRiskItem(
        {
          ...item,
          title: item.title || '',
          description: item.description || '',
          action: item.action || '',
        },
        fallback.weekStart,
      ),
    );
  }

  return [
    createRiskItem(
      {
        level: '绿',
        title: '',
        status: 'closed',
        dueDate: fallback.weekStart,
        description: NO_RISK_DESCRIPTION,
        action: NO_RISK_ACTION,
      },
      fallback.weekStart,
    ),
  ];
}

function riskRank(level: RiskItem['level']) {
  if (level === '红') {
    return 0;
  }

  if (level === '黄') {
    return 1;
  }

  return 2;
}

function blockerRank(status: RiskItem['status']) {
  if (status === 'open') {
    return 0;
  }

  if (status === 'watching') {
    return 1;
  }

  return 2;
}

function getPrimaryRiskItem(riskItems: RiskItem[]) {
  return [...riskItems].sort((left, right) => {
    const rankDiff = riskRank(left.level) - riskRank(right.level);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return blockerRank(left.status) - blockerRank(right.status);
  })[0];
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

function lifecycleActionLabel(action: 'archive' | 'recycle') {
  return action === 'archive' ? '归档项目' : '移入回收站';
}

function lifecycleActionDescription(action: 'archive' | 'recycle', projectName: string) {
  if (action === 'archive') {
    return `${projectName} 归档后将移出当前可填报项目列表，但仍可在归档管理中随时恢复。`;
  }

  return `${projectName} 移入回收站后将从当前列表隐藏，但数据不会被物理删除，后续可在回收站中一键还原。`;
}

function RestoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6.2 6.1V2.9L2.8 6.3l3.4 3.3V6.9h4.2a4.1 4.1 0 1 1-3.15 6.73"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function createDefaultPayload(
  project: ProjectOption,
  weekStart = getWeekStart(),
): FormState {
  const basePayload = {
    projectId: project.id,
    weekStart,
    progressPct: project.curveType === '一曲线' ? 72 : 86,
    actualQty: Math.round(project.plannedQty * 0.68),
    weeklyDeliveryAmount: project.curveType === '一曲线' ? 7.2 : 18,
    amountDelivered: project.curveType === '一曲线' ? 58.5 : 128.5,
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
    riskItems: [
      createRiskItem(
        {
          level:
            project.name === 'Prosper-AGV'
              ? '红'
              : project.name === 'Mary'
                ? '黄'
                : '绿',
          title: project.name === 'Mary' ? '格式适配工期偏移' : '客户验收标准仍有灰区',
          status: project.name === 'Mary' ? 'watching' : 'open',
          dueDate: weekStart,
          description:
            project.name === 'Prosper-AGV'
              ? '供应商稳定性不足，交付速度仍偏慢'
              : project.name === 'Mary'
                ? '格式适配与算法联动仍需跟进'
                : '当前整体在控，需继续盯质量和成本',
          action:
            project.curveType === '一曲线'
              ? '本周完成一次专项复盘，并同步客户/供应商侧动作'
              : '本周完成一次部署复盘，并明确客户/研发/交付三方动作',
        },
        weekStart,
      ),
    ],
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
  } satisfies FormState;

  return normalizeFormByCurveType(project, basePayload);
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
    riskItems: normalizeRiskItems(report.riskItems, {
      weekStart: report.weekStart,
      riskLevel: report.riskLevel,
      blockerTitle: report.blockerTitle,
      blockerStatus: report.blockerStatus,
      blockerDueDate: report.blockerDueDate,
      riskDesc: report.riskDesc,
      suggestedAction: report.suggestedAction,
    }),
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

function toPeopleDays(value: number) {
  return `${value.toFixed(1)} 人天`;
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
  const {
    value,
    onValueChange,
    allowDecimal = false,
    min,
    max,
    step,
    emptyWhenZero = false,
  } = props;
  const [text, setText] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      if (emptyWhenZero && value === 0) {
        setText('');
        return;
      }

      setText(String(value));
    }
  }, [emptyWhenZero, isEditing, value]);

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
    if (emptyWhenZero && normalized === 0) {
      setText('');
      return;
    }

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

function ComboInput(props: ComboInputProps) {
  const { value, options, placeholder, ariaLabel, onChange } = props;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const keyword = value.trim().toLowerCase();
    if (!keyword) {
      return options;
    }

    return options.filter((option) => {
      const haystacks = [option.label, ...(option.keywords || [])].map((item) =>
        item.toLowerCase(),
      );
      return haystacks.some((item) => item.includes(keyword));
    });
  }, [options, value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`pm-combo ${open ? 'is-open' : ''}`}
    >
      <div className="pm-combo__control">
        <input
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
        />
        <button
          type="button"
          className="pm-combo__toggle"
          aria-label={ariaLabel ? `${ariaLabel}下拉选项` : '展开下拉选项'}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="pm-combo__chevron" aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <div className="pm-combo__menu" role="listbox" aria-label={ariaLabel}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`pm-combo__option ${option.label === value ? 'is-selected' : ''}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(option.label);
                }}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="pm-combo__empty">无匹配项，可直接输入新值</div>
          )}
        </div>
      ) : null}
    </div>
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
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isRecycleModalOpen, setIsRecycleModalOpen] = useState(false);
  const [pendingProjectAction, setPendingProjectAction] = useState<PendingProjectAction>(null);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === 'active'),
    [projects],
  );
  const archivedProjects = useMemo(
    () => projects.filter((project) => project.status === 'archived'),
    [projects],
  );
  const recycledProjects = useMemo(
    () => projects.filter((project) => project.status === 'recycled'),
    [projects],
  );

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
          const firstProject =
            nextProjects.find((project) => project.status === 'active') ||
            nextProjects[0] ||
            fallbackProject;
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
        activeProjects[0] ||
        projects[0] ||
        fallbackProject,
    );

  useEffect(() => {
    if (projectMode === 'edit') {
      setProjectForm(cloneProject(selectedProject));
    }
  }, [projectMode, selectedProject]);

  useEffect(() => {
    if (isProjectModalOpen && projectMode === 'create') {
      setProjectForm(createEmptyProject());
      setProjectStatus('新增项目模式：保存后即可在周填报中选择该项目');
    }
  }, [isProjectModalOpen, projectMode]);

  useEffect(() => {
    setForm((current) => normalizeFormByCurveType(selectedProject, current));
  }, [selectedProject.curveType, selectedProject.id]);

  const activeReport = reports.find((report) => report.id === activeReportId) || null;
  const isSelectedCurve1 = isCurve1Project(selectedProject.curveType);
  const isProjectFormCurve1 = isCurve1Project(projectForm.curveType);
  const hasProjectCurveSelected = Boolean(projectForm.curveType);
  const trimmedProjectFormId = projectForm.id.trim();
  const isProjectIdDuplicate = useMemo(
    () =>
      Boolean(trimmedProjectFormId) &&
      projects.some(
        (project) =>
          project.id === trimmedProjectFormId &&
          (projectMode === 'create' || project.id !== selectedProject.id),
      ),
    [projectMode, projects, selectedProject.id, trimmedProjectFormId],
  );
  const isProjectIdAvailable = Boolean(trimmedProjectFormId) && !isProjectIdDuplicate;
  const primaryRisk = useMemo(
    () =>
      getPrimaryRiskItem(
        normalizeRiskItems(form.riskItems, {
          weekStart: form.weekStart,
          riskLevel: form.riskLevel,
          blockerTitle: form.blockerTitle,
          blockerStatus: form.blockerStatus,
          blockerDueDate: form.blockerDueDate,
          riskDesc: form.riskDesc,
          suggestedAction: form.suggestedAction,
        }),
      ),
    [
      form.blockerDueDate,
      form.blockerStatus,
      form.blockerTitle,
      form.riskDesc,
      form.riskItems,
      form.riskLevel,
      form.suggestedAction,
      form.weekStart,
    ],
  );

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
    if (primaryRisk.level === '红' || costRate > 100 || form.qualityPass < 85) {
      return { text: '风险', tone: 'danger' as const };
    }

    if (primaryRisk.level === '黄' || costRate > 85 || form.qualityPass < 92) {
      return { text: '关注', tone: 'warn' as const };
    }

    return { text: '在控', tone: 'ok' as const };
  }, [costRate, form.qualityPass, primaryRisk.level]);

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
          : '进度、本周/累计已耗人天与下周推进已填写',
        done:
          form.progressPct >= 0 &&
          (isSelectedCurve1 ? form.actualQty >= 0 : true) &&
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
          form.riskItems.length === 0 ||
          form.riskItems.every(
            (item) =>
              item.description.trim().length > 0 &&
              item.action.trim().length > 0 &&
              (item.level === '绿' || item.title.trim().length > 0),
          ),
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
        {
          label: '合同金额',
          value: toWan(selectedProject.contractAmount),
          hint: '主数据',
        },
        {
          label: isSelectedCurve1 ? '预算总额' : '预算总人天',
          value: isSelectedCurve1
            ? toWan(selectedProject.budgetTotal)
            : toPeopleDays(selectedProject.budgetTotal),
          hint: '主数据',
        },
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
        { label: '跟踪重点', value: '里程碑 / 人天 / 风险', hint: '每周按部署进度与人天口径填报' },
      ];
    },
    [isSelectedCurve1, selectedProject],
  );

  const comparisonCards = useMemo(() => {
    const previousPrimaryRisk = previousReport
      ? getPrimaryRiskItem(
          normalizeRiskItems(previousReport.riskItems, {
            weekStart: previousReport.weekStart,
            riskLevel: previousReport.riskLevel,
            blockerTitle: previousReport.blockerTitle,
            blockerStatus: previousReport.blockerStatus,
            blockerDueDate: previousReport.blockerDueDate,
            riskDesc: previousReport.riskDesc,
            suggestedAction: previousReport.suggestedAction,
          }),
        )
      : null;

    if (!previousReport) {
      return [
        { label: '进度变化', value: '首次填报', tone: 'neutral' },
        {
          label: isSelectedCurve1 ? '本周交付' : '本周已耗人天',
          value: isSelectedCurve1
            ? toWan(form.weeklyDeliveryAmount)
            : toPeopleDays(form.weeklyDeliveryAmount),
          tone: 'neutral',
        },
        {
          label: isSelectedCurve1 ? '成本变化' : '累计已耗人天',
          value: isSelectedCurve1 ? toWan(form.costConsumed) : toPeopleDays(form.amountDelivered),
          tone: 'neutral',
        },
        { label: '风险等级', value: primaryRisk.level, tone: 'neutral' },
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
        label: isSelectedCurve1 ? '本周交付' : '本周已耗人天',
        value: formatDelta(
          form.weeklyDeliveryAmount -
            (isSelectedCurve1
              ? previousReport.weeklyDeliveryAmount
              : previousReport.weeklyDeliveryAmount),
          1,
          isSelectedCurve1 ? ' 万' : ' 人天',
        ),
        tone:
          form.weeklyDeliveryAmount -
            (isSelectedCurve1
              ? previousReport.weeklyDeliveryAmount
              : previousReport.weeklyDeliveryAmount) >=
          0
            ? 'positive'
            : 'negative',
      },
      {
        label: isSelectedCurve1 ? '成本变化' : '累计已耗人天',
        value: formatDelta(
          (isSelectedCurve1 ? form.costConsumed : form.amountDelivered) -
            (isSelectedCurve1
              ? previousReport.costConsumed
              : previousReport.amountDelivered),
          1,
          isSelectedCurve1 ? ' 万' : ' 人天',
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
        value: `${previousPrimaryRisk?.level || '绿'} → ${primaryRisk.level}`,
        tone:
          previousPrimaryRisk?.level === primaryRisk.level
            ? 'neutral'
            : primaryRisk.level === '红'
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
  }, [form, isSelectedCurve1, previousReport, primaryRisk.level]);

  const weeklySummary = useMemo(
    () =>
      isSelectedCurve1
        ? [
            `${selectedProject.name} 当前进度 ${toPercent(form.progressPct)}，交付完成率 ${toPercent(deliveryRate)}。`,
            `本周交付 ${toWan(form.weeklyDeliveryAmount)}，累计交付 ${toWan(form.amountDelivered)}，预算消耗率 ${toPercent(costRate)}。`,
            `质量 ${toPercent(form.qualityPass)}，客户评分 ${form.clientScore.toFixed(1)}，当前状态 ${healthLabel.text}。`,
            `阻塞事项：${primaryRisk.title || '暂无'}；下周重点：${form.nextWeekFocus || '待补充'}。`,
          ]
        : [
            `${selectedProject.name} 当前部署进度 ${toPercent(form.progressPct)}，预算消耗率 ${toPercent(costRate)}。`,
            `本周已耗 ${toPeopleDays(form.weeklyDeliveryAmount)}，累计已耗 ${toPeopleDays(form.amountDelivered)}，客户评分 ${form.clientScore.toFixed(1)}。`,
            `当前风险状态 ${healthLabel.text}；最高风险项 ${primaryRisk.title || '暂无'}。`,
            `下周重点：${form.nextWeekFocus || '待补充'}。`,
          ],
    [
      costRate,
      deliveryRate,
      form.amountDelivered,
      form.clientScore,
      form.nextWeekFocus,
      form.progressPct,
      form.qualityPass,
      form.weeklyDeliveryAmount,
      healthLabel.text,
      isSelectedCurve1,
      primaryRisk.title,
      selectedProject.name,
    ],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (!isSelectedCurve1) {
        if (key === 'amountDelivered') {
          next.costConsumed = value as FormState['costConsumed'];
        }
        if (key === 'costConsumed') {
          next.amountDelivered = value as FormState['amountDelivered'];
        }
      }

      return next;
    });
    setDraftStatus('草稿待保存');
  }

  function updateRiskItem<K extends keyof RiskItem>(
    riskId: string,
    key: K,
    value: RiskItem[K],
  ) {
    setForm((current) => ({
      ...current,
      riskItems: current.riskItems.map((item) =>
        item.id === riskId ? { ...item, [key]: value } : item,
      ),
    }));
    setDraftStatus('草稿待保存');
  }

  function addRiskItem() {
    setForm((current) => ({
      ...current,
      riskItems: [
        ...current.riskItems,
        createRiskItem(
          {
            level: '黄',
            status: 'open',
          },
          current.weekStart,
        ),
      ],
    }));
    setDraftStatus('已新增一条风险项，待补充内容');
  }

  function removeRiskItem(riskId: string) {
    setForm((current) => {
      return {
        ...current,
        riskItems: current.riskItems.filter((item) => item.id !== riskId),
      };
    });
    setDraftStatus('已删除风险项；若当前无风险，系统会按无风险状态保存');
  }

  async function syncProjectViews(targetProjectId?: string) {
    const bootstrap = await getPmWeeklyReportsBootstrap();
    setProjects(bootstrap.projects);
    setReports(bootstrap.reports);

    const nextActiveProjects = bootstrap.projects.filter(
      (project) => project.status === 'active',
    );
    const nextProject =
      (targetProjectId
        ? bootstrap.projects.find((project) => project.id === targetProjectId)
        : null) ||
      nextActiveProjects[0] ||
      bootstrap.projects[0] ||
      fallbackProject;

    setActiveReportId(null);
    setForm(createDefaultPayload(nextProject, form.weekStart || getWeekStart()));
    return nextProject;
  }

  async function handleProjectLifecycle(action: ProjectLifecycleAction, projectId: string) {
    setIsProjectSaving(true);
    try {
      const project =
        projects.find((item) => item.id === projectId) || fallbackProject;

      if (action === 'archive') {
        await archiveProject(projectId);
        const nextProject = await syncProjectViews();
        setDraftStatus(`${project.name} 已归档，当前切换到 ${nextProject.name}`);
      } else if (action === 'recycle') {
        await recycleProject(projectId);
        const nextProject = await syncProjectViews();
        setDraftStatus(`${project.name} 已移入回收站，当前切换到 ${nextProject.name}`);
      } else {
        await restoreProject(projectId);
        const nextProject = await syncProjectViews(projectId);
        setDraftStatus(`${project.name} 已恢复，可重新继续填报`);
      }
    } catch {
      setDraftStatus('项目状态更新失败，请检查本地后端服务');
    } finally {
      setIsProjectSaving(false);
    }
  }

  function openProjectActionConfirm(action: 'archive' | 'recycle') {
    if (selectedProject.id === fallbackProject.id || selectedProject.status !== 'active') {
      return;
    }

    setPendingProjectAction({
      type: action,
      project: selectedProject,
    });
  }

  async function confirmProjectAction() {
    if (!pendingProjectAction) {
      return;
    }

    const nextAction = pendingProjectAction;
    setPendingProjectAction(null);
    await handleProjectLifecycle(nextAction.type, nextAction.project.id);
  }

  function handleProjectChange(projectId: string) {
    const nextProject =
      activeProjects.find((project) => project.id === projectId) || fallbackProject;
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
    setIsProjectModalOpen(true);
  }

  function closeProjectModal() {
    if (isProjectSaving) {
      return;
    }
    setIsProjectModalOpen(false);
    setProjectMode('edit');
    setProjectForm(cloneProject(selectedProject));
    setProjectStatus(`已载入 ${selectedProject.name} 主数据，可继续新增项目`);
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
    if (
      !projectForm.id.trim() ||
      !projectForm.name.trim() ||
      !projectForm.pmName.trim() ||
      !projectForm.curveType.trim()
    ) {
      setProjectStatus('请至少填写项目编号、项目名称、项目经理、曲线类型');
      return;
    }

    if (isProjectIdDuplicate) {
      setProjectStatus('项目编号已存在，请更换后再保存');
      return;
    }

    setIsProjectSaving(true);
    try {
      const normalizedProject = normalizeProjectOption({
        ...projectForm,
        id: projectForm.id.trim(),
        name: projectForm.name.trim(),
        pmName: projectForm.pmName.trim(),
        curveType: projectForm.curveType.trim(),
        annotationType: projectForm.annotationType.trim(),
        qtyUnit: projectForm.qtyUnit.trim(),
        defaultSupplier: projectForm.defaultSupplier.trim(),
        status: projectForm.status,
      });

      const savedProject =
        projectMode === 'create'
          ? await createProject(normalizedProject)
          : await updateProject(projectForm.id, normalizedProject);

      const bootstrap = await getPmWeeklyReportsBootstrap();
      setProjects(bootstrap.projects);
      setReports(bootstrap.reports);

      const syncedProject =
        bootstrap.projects.find((project) => project.id === savedProject.id) ||
        normalizeProjectOption(savedProject) ||
        bootstrap.projects[0] ||
        fallbackProject;

      if (projectMode === 'create') {
        setActiveReportId(null);
        setForm(createDefaultPayload(syncedProject, form.weekStart || getWeekStart()));
        setDraftStatus(`已新增项目 ${syncedProject.name}，可继续填写首个周报`);
        setIsProjectModalOpen(false);
        if (typeof window !== 'undefined') {
          window.requestAnimationFrame(() =>
            window.scrollTo({ top: 0, behavior: 'smooth' }),
          );
        }
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
      const normalizedRiskItems = normalizeRiskItems(form.riskItems, {
        weekStart: form.weekStart,
        riskLevel: form.riskLevel,
        blockerTitle: form.blockerTitle,
        blockerStatus: form.blockerStatus,
        blockerDueDate: form.blockerDueDate,
        riskDesc: form.riskDesc,
        suggestedAction: form.suggestedAction,
      });
      const nextPrimaryRisk = getPrimaryRiskItem(normalizedRiskItems);
      const payload: FormState = normalizeFormByCurveType(selectedProject, {
        ...form,
        riskLevel: nextPrimaryRisk.level,
        riskDesc: nextPrimaryRisk.description,
        blockerTitle: nextPrimaryRisk.title,
        blockerStatus: nextPrimaryRisk.status,
        blockerDueDate: nextPrimaryRisk.dueDate,
        suggestedAction: nextPrimaryRisk.action,
        riskItems: normalizedRiskItems,
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
        const firstProject = activeProjects[0] || projects[0] || fallbackProject;
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
          <button className="pm-btn pm-btn--light pm-btn--accent" onClick={beginCreateProject}>
            新增项目
          </button>
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
          <label className="pm-field pm-field--project-picker">
            <span className="pm-field__label">项目名称</span>
            <AppSelect
              value={form.projectId}
              onChange={handleProjectChange}
              ariaLabel="项目名称"
              size="compact"
              options={activeProjects.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
            />
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
            <div className="pm-context-meta">
              <span className={`pm-badge pm-badge--${healthLabel.tone}`}>健康状态：{healthLabel.text}</span>
              <span className="pm-badge">{activeReport ? recordStatusLabel(activeReport.status) : '未保存'}</span>
              <span className="pm-badge">草稿状态：{isLoading ? '加载中...' : draftStatus}</span>
            </div>
            <div className="pm-context-actions">
              <button className="pm-mini-btn pm-mini-btn--soft" onClick={() => setIsArchiveModalOpen(true)}>
                归档管理
                {archivedProjects.length > 0 ? <span className="pm-mini-btn__count">{archivedProjects.length}</span> : null}
              </button>
              <button className="pm-mini-btn pm-mini-btn--soft" onClick={() => setIsRecycleModalOpen(true)}>
                回收站
                {recycledProjects.length > 0 ? <span className="pm-mini-btn__count">{recycledProjects.length}</span> : null}
              </button>
              {selectedProject.status === 'active' ? (
                <>
                  <button
                    className="pm-mini-btn"
                    onClick={() => openProjectActionConfirm('archive')}
                    disabled={isProjectSaving || selectedProject.id === fallbackProject.id}
                  >
                    归档项目
                  </button>
                  <button
                    className="pm-mini-btn pm-mini-btn--danger"
                    onClick={() => openProjectActionConfirm('recycle')}
                    disabled={isProjectSaving || selectedProject.id === fallbackProject.id}
                  >
                    移入回收站
                  </button>
                </>
              ) : null}
            </div>
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
                  <span>{isSelectedCurve1 ? 'PM工时成本' : '累计已耗人天'}</span>
                  <strong>
                    {isSelectedCurve1
                      ? `${pmCost.toLocaleString('zh-CN')} 元`
                      : toPeopleDays(form.amountDelivered)}
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
                        : '二/三曲线按私有化部署口径汇报，统一使用人天与里程碑口径'}
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
                      <small>二/三曲线重点看里程碑进度、本周/累计已耗人天、阻塞事项和下周推进动作。</small>
                    </div>
                  )}
                  <label className="pm-field">
                    <span className="pm-field__label">
                      {isSelectedCurve1 ? '本周交付金额' : '本周已耗人天'}
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
                      {isSelectedCurve1 ? '累计交付金额' : '累计已耗人天'}
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
                    <h3>{isSelectedCurve1 ? '成本与质量' : '人天与质量'}</h3>
                    <p>
                      {isSelectedCurve1
                        ? '优先录入本周新增成本、质量和客户反馈'
                        : '二/三曲线统一按人天口径填写执行投入、质量和客户反馈'}
                    </p>
                  </div>
                  <span className="pm-inline-tag">自动计算</span>
                </div>
                <div className="pm-entry-grid">
                  <label className="pm-field">
                    <span className="pm-field__label">
                      {isSelectedCurve1 ? '成本消耗' : '累计已耗人天（预算口径）'}
                    </span>
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
                  <label className="pm-field pm-field--full">
                    <span className="pm-field__label">{isSelectedCurve1 ? '备注' : '部署备注'}</span>
                    <textarea
                      rows={3}
                      value={form.pmComment}
                      onChange={(event) => updateField('pmComment', textAreaValue(event))}
                    />
                    <small className="pm-field__hint">
                      {isSelectedCurve1
                        ? '补充客户反馈、特殊说明或本周需同步的经营信息。'
                        : '补充部署推进、环境联调、客户协同或里程碑说明。'}
                    </small>
                  </label>
                </div>
              </article>

              <article className="pm-entry-group">
                <div className="pm-entry-group__head">
                  <div>
                    <h3>风险与异常</h3>
                    <p>按事项逐条维护风险，系统自动取最高等级作为项目状态</p>
                  </div>
                  <div className="pm-risk-toolbar">
                    <span className="pm-inline-tag pm-inline-tag--warn">重点检查</span>
                    <button className="pm-mini-btn" onClick={addRiskItem}>
                      新增风险项
                    </button>
                  </div>
                </div>
                <div className="pm-risk-list">
                  {form.riskItems.length === 0 ? (
                    <div className="pm-risk-empty">
                      <strong>当前无风险项</strong>
                      <span>本项目将按“无风险”策略保存为绿色状态，后续如有异常可再新增。</span>
                    </div>
                  ) : (
                    form.riskItems.map((item, index) => (
                    <section key={item.id} className="pm-risk-card">
                      <div className="pm-risk-card__head">
                        <div>
                          <span
                            className={`pm-risk-pill ${
                              item.level === '红'
                                ? 'pm-risk-pill--red'
                                : item.level === '黄'
                                  ? 'pm-risk-pill--amber'
                                  : 'pm-risk-pill--green'
                            }`}
                          >
                            {item.level}级风险
                          </span>
                          <strong>风险项 {index + 1}</strong>
                          <small>请分别填写风险、阻塞状态、解决计划和推进动作。</small>
                        </div>
                        <button
                          className="pm-mini-btn"
                          onClick={() => removeRiskItem(item.id)}
                        >
                          删除
                        </button>
                      </div>
                      <div className="pm-entry-grid pm-entry-grid--inner">
                        <label className="pm-field">
                          <span className="pm-field__label">风险等级</span>
                          <AppSelect
                            value={item.level}
                            onChange={(nextValue) =>
                              updateRiskItem(
                                item.id,
                                'level',
                                nextValue as RiskItem['level'],
                              )
                            }
                            ariaLabel={`风险项 ${index + 1} 风险等级`}
                            options={[
                              { value: '绿', label: '绿' },
                              { value: '黄', label: '黄' },
                              { value: '红', label: '红' },
                            ]}
                          />
                        </label>
                        <label className="pm-field">
                          <span className="pm-field__label">阻塞事项状态</span>
                          <AppSelect
                            value={item.status}
                            onChange={(nextValue) =>
                              updateRiskItem(
                                item.id,
                                'status',
                                nextValue as RiskItem['status'],
                              )
                            }
                            ariaLabel={`风险项 ${index + 1} 阻塞事项状态`}
                            options={[
                              { value: 'open', label: '待处理' },
                              { value: 'watching', label: '跟进中' },
                              { value: 'closed', label: '已解决' },
                            ]}
                          />
                        </label>
                        <label className="pm-field">
                          <span className="pm-field__label">
                            阻塞事项{item.level === '绿' ? '（可选）' : ''}
                          </span>
                          <input
                            value={item.title}
                            onChange={(event) =>
                              updateRiskItem(item.id, 'title', event.target.value)
                            }
                          />
                        </label>
                        <label className="pm-field">
                          <span className="pm-field__label">计划解决日期</span>
                          <input
                            type="date"
                            value={item.dueDate}
                            onChange={(event) =>
                              updateRiskItem(item.id, 'dueDate', event.target.value)
                            }
                          />
                        </label>
                        <label className="pm-field pm-field--full">
                          <span className="pm-field__label">风险描述 <em>必填</em></span>
                          <textarea
                            rows={3}
                            value={item.description}
                            onChange={(event) =>
                              updateRiskItem(item.id, 'description', textAreaValue(event))
                            }
                          />
                        </label>
                        <label className="pm-field pm-field--full">
                          <span className="pm-field__label">建议动作 <em>必填</em></span>
                          <textarea
                            rows={3}
                            value={item.action}
                            onChange={(event) =>
                              updateRiskItem(item.id, 'action', textAreaValue(event))
                            }
                          />
                        </label>
                      </div>
                    </section>
                    ))
                  )}
                </div>
                {isSelectedCurve1 ? (
                  <div className="pm-entry-grid">
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
                  </div>
                ) : null}
              </article>

              {isSelectedCurve1 ? (
                <article className="pm-entry-group">
                <div className="pm-entry-group__head">
                  <div>
                    <h3>供应商与算法专项</h3>
                    <p>保留专项字段，但不抢主流程注意力</p>
                  </div>
                  <span className="pm-inline-tag">沿用上周可微调</span>
                </div>
                <div className="pm-entry-grid">
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
                </div>
              </article>
              ) : null}
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
                <strong>{primaryRisk.level}</strong>
              </div>
              <div>
                <span>阻塞事项</span>
                <strong>{blockerStatusLabel(primaryRisk.status)}</strong>
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

      {isProjectModalOpen ? (
        <div className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="pm-project-modal-title">
          <div className="pm-modal__backdrop" onClick={closeProjectModal} />
          <section className="pm-modal__panel">
            <div className="pm-modal__header">
              <div>
                <p>项目主数据</p>
                <h3 id="pm-project-modal-title">新增项目</h3>
              </div>
              <button className="pm-mini-btn" onClick={closeProjectModal} disabled={isProjectSaving}>
                关闭
              </button>
            </div>
            <div className="pm-project-form">
              <label className="pm-field">
                <span className="pm-field__label">项目编号</span>
                <div className="pm-id-field">
                  <input
                    value={projectForm.id}
                    onChange={(event) => updateProjectField('id', event.target.value)}
                  />
                  {isProjectIdAvailable ? (
                    <span className="pm-id-field__status pm-id-field__status--ok">✓</span>
                  ) : null}
                </div>
                {trimmedProjectFormId ? (
                  isProjectIdDuplicate ? (
                    <span className="pm-field__hint pm-field__hint--danger">
                      项目编号已存在，请更换后再保存
                    </span>
                  ) : (
                    <span className="pm-field__hint pm-field__hint--ok">
                      项目编号可用
                    </span>
                  )
                ) : (
                  <span className="pm-field__hint">请输入唯一的项目编号</span>
                )}
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
                <ComboInput
                  value={projectForm.pmName}
                  options={PROJECT_MANAGER_OPTIONS}
                  placeholder="可输入或选择项目经理"
                  ariaLabel="项目经理"
                  onChange={(value) => updateProjectField('pmName', value)}
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">曲线类型</span>
                <AppSelect
                  value={projectForm.curveType}
                  onChange={(nextValue) => updateProjectField('curveType', nextValue)}
                  ariaLabel="曲线类型"
                  placeholder="请选择曲线类型"
                  options={[
                    { value: '一曲线', label: '一曲线' },
                    { value: '二曲线', label: '二曲线' },
                    { value: '三曲线', label: '三曲线' },
                  ]}
                />
              </label>
              <label className="pm-field">
                <span className="pm-field__label">合同金额</span>
                <NumericInput
                  allowDecimal
                  step="0.1"
                  value={projectForm.contractAmount}
                  emptyWhenZero
                  onValueChange={(value) => updateProjectField('contractAmount', value)}
                />
              </label>
              {isProjectFormCurve1 ? (
                <>
                  <label className="pm-field">
                    <span className="pm-field__label">标注类型</span>
                    <ComboInput
                      value={projectForm.annotationType}
                      options={ANNOTATION_TYPE_OPTIONS}
                      placeholder="可输入或选择标注类型"
                      ariaLabel="标注类型"
                      onChange={(value) => updateProjectField('annotationType', value)}
                    />
                  </label>
                  <label className="pm-field">
                    <span className="pm-field__label">计划总量</span>
                    <NumericInput
                      value={projectForm.plannedQty}
                      emptyWhenZero
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
              ) : hasProjectCurveSelected ? (
                <div className="pm-auto-box pm-auto-box--hint pm-field--full">
                  <span>私有化部署项目</span>
                  <strong>不维护标注类型、数量单位、默认供应商</strong>
                  <small>二/三曲线维护合同金额、预算总人天和后续部署进度，周填报按里程碑与人天口径汇报。</small>
                </div>
              ) : null}
              <label className="pm-field">
                <span className="pm-field__label">
                  {isProjectFormCurve1
                    ? '预算总额'
                    : hasProjectCurveSelected
                      ? '预算总人天'
                      : '预算总额 / 预算总人天'}
                </span>
                <NumericInput
                  allowDecimal
                  step="0.1"
                  value={projectForm.budgetTotal}
                  emptyWhenZero
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
            <div className="pm-actions pm-actions--modal">
              <button className="pm-btn pm-btn--light" onClick={closeProjectModal} disabled={isProjectSaving}>
                取消
              </button>
              <button
                className="pm-btn pm-btn--primary"
                onClick={() => void saveProjectDefinition()}
                disabled={isProjectSaving || isProjectIdDuplicate}
              >
                {isProjectSaving ? '保存中...' : '保存新项目'}
              </button>
            </div>
            <div className="pm-side-note">
              {projectStatus}。保存成功后将自动切换到新项目，并刷新当前周填报页面。
            </div>
          </section>
        </div>
      ) : null}

      {pendingProjectAction ? (
        <div className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="pm-project-action-title">
          <div className="pm-modal__backdrop" onClick={() => setPendingProjectAction(null)} />
          <section className="pm-modal__panel pm-modal__panel--confirm">
            <div className="pm-modal__header">
              <div>
                <p>项目操作确认</p>
                <h3 id="pm-project-action-title">{lifecycleActionLabel(pendingProjectAction.type)}</h3>
              </div>
              <button
                className="pm-mini-btn"
                onClick={() => setPendingProjectAction(null)}
                disabled={isProjectSaving}
              >
                取消
              </button>
            </div>
            <div className="pm-confirm-card">
              <span className="pm-inline-tag pm-inline-tag--warn">请确认后继续</span>
              <strong>{pendingProjectAction.project.name}</strong>
              <p>{lifecycleActionDescription(pendingProjectAction.type, pendingProjectAction.project.name)}</p>
            </div>
            <div className="pm-actions pm-actions--modal">
              <button
                className="pm-btn pm-btn--light"
                onClick={() => setPendingProjectAction(null)}
                disabled={isProjectSaving}
              >
                再想想
              </button>
              <button
                className={`pm-btn ${pendingProjectAction.type === 'recycle' ? 'pm-btn--danger' : 'pm-btn--primary'}`}
                onClick={() => void confirmProjectAction()}
                disabled={isProjectSaving}
              >
                {isProjectSaving ? '处理中...' : lifecycleActionLabel(pendingProjectAction.type)}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isArchiveModalOpen ? (
        <div className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="pm-archive-modal-title">
          <div className="pm-modal__backdrop" onClick={() => setIsArchiveModalOpen(false)} />
          <section className="pm-modal__panel pm-modal__panel--manager">
            <div className="pm-modal__header">
              <div>
                <p>项目管理</p>
                <h3 id="pm-archive-modal-title">归档管理</h3>
              </div>
              <button className="pm-mini-btn" onClick={() => setIsArchiveModalOpen(false)}>
                关闭
              </button>
            </div>
            <div className="pm-manager-summary">
              <span className="pm-chip">已归档 {archivedProjects.length} 个项目</span>
              <span className="pm-side-note">归档项目会从当前填报名单移除，可随时恢复到活跃列表。</span>
            </div>
            <div className="pm-manager-list">
              {archivedProjects.length === 0 ? (
                <div className="pm-records__empty">当前没有已归档项目</div>
              ) : (
                archivedProjects.map((project) => (
                  <article key={project.id} className="pm-manager-item">
                    <div className="pm-manager-item__body">
                      <div className="pm-manager-item__top">
                        <strong>{project.name}</strong>
                        <span className="pm-badge">已归档</span>
                      </div>
                      <div className="pm-manager-item__meta">
                        <span>{project.id}</span>
                        <span>{project.curveType || '未配置曲线'}</span>
                        <span>{project.pmName || '待分配 PM'}</span>
                      </div>
                    </div>
                    <button
                      className="pm-icon-btn"
                      onClick={() => void handleProjectLifecycle('restore', project.id)}
                      disabled={isProjectSaving}
                      title={`恢复 ${project.name}`}
                      aria-label={`恢复 ${project.name}`}
                    >
                      <RestoreIcon />
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {isRecycleModalOpen ? (
        <div className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="pm-recycle-modal-title">
          <div className="pm-modal__backdrop" onClick={() => setIsRecycleModalOpen(false)} />
          <section className="pm-modal__panel pm-modal__panel--manager">
            <div className="pm-modal__header">
              <div>
                <p>项目管理</p>
                <h3 id="pm-recycle-modal-title">回收站</h3>
              </div>
              <button className="pm-mini-btn" onClick={() => setIsRecycleModalOpen(false)}>
                关闭
              </button>
            </div>
            <div className="pm-manager-summary">
              <span className="pm-chip">回收站 {recycledProjects.length} 个项目</span>
              <span className="pm-side-note">移入回收站属于假删，数据仍保留，可通过右侧图标直接恢复。</span>
            </div>
            <div className="pm-manager-list">
              {recycledProjects.length === 0 ? (
                <div className="pm-records__empty">当前回收站为空</div>
              ) : (
                recycledProjects.map((project) => (
                  <article key={project.id} className="pm-manager-item pm-manager-item--recycle">
                    <div className="pm-manager-item__body">
                      <div className="pm-manager-item__top">
                        <strong>{project.name}</strong>
                        <span className="pm-badge pm-badge--warn">回收站</span>
                      </div>
                      <div className="pm-manager-item__meta">
                        <span>{project.id}</span>
                        <span>{project.curveType || '未配置曲线'}</span>
                        <span>{project.pmName || '待分配 PM'}</span>
                      </div>
                    </div>
                    <button
                      className="pm-icon-btn pm-icon-btn--danger"
                      onClick={() => void handleProjectLifecycle('restore', project.id)}
                      disabled={isProjectSaving}
                      title={`恢复 ${project.name}`}
                      aria-label={`恢复 ${project.name}`}
                    >
                      <RestoreIcon />
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
