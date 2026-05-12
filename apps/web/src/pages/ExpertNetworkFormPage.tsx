import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createExpertNetworkReport,
  ExpertDomainDistributionItem,
  ExpertNetworkBootstrap,
  ExpertNetworkWeeklyReport,
  ExpertNetworkWeeklyReportPayload,
  getExpertNetworkBootstrap,
  updateExpertNetworkReport,
} from '../lib/api';
import { DropdownLayout, getDropdownLayout } from '../lib/dropdown';

type DomainRow = {
  id: string;
  domain: string;
  count: string;
};

type DomainOption = {
  label: string;
  keywords: string[];
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

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle
        cx="10"
        cy="10"
        r="7.2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M10 8v4.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="10" cy="5.9" r="1" fill="currentColor" />
    </svg>
  );
}

const DEFAULT_OWNER = '王天浩';
const EXPERT_TABLE_PAGE_SIZE = 10;
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

const DOMAIN_PINYIN_KEYWORDS: Record<string, string[]> = {
  农林牧渔业: ['nonglinmuyuye', 'nlmy'],
  采矿业: ['caikuangye', 'cky'],
  制造业: ['zhizaoye', 'zzy'],
  建筑业: ['jianzhuye', 'jzy'],
  批发和零售业: ['pifahelingshouye', 'pfhlsy'],
  '交通运输、仓储和邮政业': [
    'jiaotongyunshucangchuyouzhengye',
    'jtysccyzy',
  ],
  '信息传输、软件和信息技术服务业': [
    'xinxichuanshuruanjianhexinxijishufuwuye',
    'xinxijishu',
    'ruanjian',
    'it',
    'xxjs',
  ],
  金融业: ['jinrongye', 'jry'],
  房地产业: ['fangdichanye', 'fdcy'],
  科学研究和技术服务业: [
    'kexueyanjiuhejishufuwuye',
    'keyan',
    'jishufuwu',
    'kxyjjjsfwy',
  ],
  '水利、环境和公共设施管理业': [
    'shuilihuanjinghegonggongsheshiguanliye',
    'slhjhggssgly',
  ],
  教育: ['jiaoyu', 'jy'],
  卫生和社会工作: ['weishengheshehuigongzuo', 'wshshgz'],
  '文化、体育和娱乐业': ['wenhuatiyuheyuleye', 'whtyhyly'],
  国际组织: ['guojizuzhi', 'gjzz'],
  '电力、热力、燃气及水生产和供应业': [
    'dianlireliranqijishuishengchanhegongyingye',
    'dlrlrqjsschgyy',
  ],
  '居民服务、修理和其他服务业': [
    'juminfuwuxiuliheqitafuwuye',
    'jmfwxlhqtfwy',
  ],
  '公共管理、社会保障和社会组织': [
    'gonggongguanlishehuibaozhangheshehuizuzhi',
    'ggglshbzhshzz',
  ],
};

const DOMAIN_PINYIN_CHAR_MAP: Record<string, string> = {
  农: 'nong',
  林: 'lin',
  牧: 'mu',
  渔: 'yu',
  业: 'ye',
  采: 'cai',
  矿: 'kuang',
  制: 'zhi',
  造: 'zao',
  建: 'jian',
  筑: 'zhu',
  批: 'pi',
  发: 'fa',
  和: 'he',
  零: 'ling',
  售: 'shou',
  交: 'jiao',
  通: 'tong',
  运: 'yun',
  输: 'shu',
  仓: 'cang',
  储: 'chu',
  邮: 'you',
  政: 'zheng',
  信: 'xin',
  息: 'xi',
  软: 'ruan',
  件: 'jian',
  技: 'ji',
  术: 'shu',
  服: 'fu',
  务: 'wu',
  金: 'jin',
  融: 'rong',
  房: 'fang',
  地: 'di',
  产: 'chan',
  科: 'ke',
  学: 'xue',
  研: 'yan',
  究: 'jiu',
  水: 'shui',
  利: 'li',
  环: 'huan',
  境: 'jing',
  公: 'gong',
  共: 'gong',
  设: 'she',
  施: 'shi',
  管: 'guan',
  理: 'li',
  教: 'jiao',
  育: 'yu',
  卫: 'wei',
  生: 'sheng',
  社: 'she',
  会: 'hui',
  工: 'gong',
  作: 'zuo',
  文: 'wen',
  化: 'hua',
  体: 'ti',
  娱: 'yu',
  乐: 'yue',
  国: 'guo',
  际: 'ji',
  组: 'zu',
  织: 'zhi',
  电: 'dian',
  力: 'li',
  热: 're',
  燃: 'ran',
  气: 'qi',
  及: 'ji',
  供: 'gong',
  应: 'ying',
  居: 'ju',
  民: 'min',
  修: 'xiu',
  其: 'qi',
  他: 'ta',
  保: 'bao',
  障: 'zhang',
  智: 'zhi',
  能: 'neng',
  汽: 'qi',
  车: 'che',
  医: 'yi',
  药: 'yao',
  旅: 'lv',
  游: 'you',
  传: 'chuan',
  媒: 'mei',
  商: 'shang',
  品: 'pin',
  法: 'fa',
  律: 'lv',
  咨: 'zi',
  询: 'xun',
  '、': '',
  '，': '',
  ',': '',
  ' ': '',
  '（': '',
  '）': '',
  '(': '',
  ')': '',
};

type DomainComboInputProps = {
  value: string;
  options: DomainOption[];
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  onCreateOption?: (value: string) => void;
};

function sanitizeSearchText(value: string) {
  return value.toLowerCase().replace(/[、，,\s/（）()·-]/g, '');
}

function buildInitialKeyword(value: string) {
  return Array.from(value)
    .map((char) => {
      const syllable = DOMAIN_PINYIN_CHAR_MAP[char];
      return syllable ? syllable.charAt(0) : '';
    })
    .join('');
}

function buildPinyinKeyword(value: string) {
  return Array.from(value)
    .map((char) => DOMAIN_PINYIN_CHAR_MAP[char] ?? '')
    .join('');
}

function buildDomainOptions(domains: string[]): DomainOption[] {
  return Array.from(new Set(domains.map((item) => item.trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))
    .map((label) => ({
      label,
      keywords: Array.from(
        new Set(
          [
            ...(DOMAIN_PINYIN_KEYWORDS[label] || []),
            buildPinyinKeyword(label),
            buildInitialKeyword(label),
          ].filter(Boolean),
        ),
      ),
    }));
}

function sortDomainCatalog(domains: string[]) {
  return Array.from(new Set(domains.map((item) => item.trim()).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right, 'zh-CN'),
  );
}

function DomainComboInput(props: DomainComboInputProps) {
  const { value, options, placeholder, ariaLabel, onChange, onCreateOption } = props;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState<DropdownLayout>({
    direction: 'down' as const,
    maxHeight: 220,
  });

  const filteredOptions = useMemo(() => {
    const keyword = sanitizeSearchText(value.trim());
    if (!keyword) {
      return options;
    }

    return options.filter((option) =>
      [option.label, ...option.keywords].some((item) =>
        sanitizeSearchText(item).includes(keyword),
      ),
    );
  }, [options, value]);

  const showCreateOption = useMemo(() => {
    const nextValue = value.trim();
    if (!onCreateOption || !nextValue) {
      return false;
    }

    return !options.some((option) => option.label === nextValue);
  }, [onCreateOption, options, value]);

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

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function updateMenuLayout() {
      setMenuLayout(getDropdownLayout(rootRef.current, inputRef.current, 220, 6));
    }

    const frameId = window.requestAnimationFrame(updateMenuLayout);

    window.addEventListener('resize', updateMenuLayout);
    document.addEventListener('scroll', updateMenuLayout, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateMenuLayout);
      document.removeEventListener('scroll', updateMenuLayout, true);
    };
  }, [filteredOptions.length, open, showCreateOption]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  function handleCreate() {
    const nextValue = value.trim();
    if (!nextValue || !onCreateOption) {
      return;
    }

    onCreateOption(nextValue);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`pm-combo ${open ? 'is-open' : ''}`}>
      <div className="pm-combo__control">
        <input
          ref={inputRef}
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
          aria-label={`${ariaLabel}下拉选项`}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="pm-combo__chevron" aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <div
          className="pm-combo__menu"
          role="listbox"
          aria-label={ariaLabel}
          style={{
            maxHeight: `${Math.max(menuLayout.maxHeight, 0)}px`,
            top: menuLayout.direction === 'down' ? 'calc(100% + 6px)' : 'auto',
            bottom: menuLayout.direction === 'up' ? 'calc(100% + 6px)' : 'auto',
          }}
        >
          {filteredOptions.map((option) => (
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
          ))}
          {showCreateOption ? (
            <button
              type="button"
              className="pm-combo__option pm-combo__option--create"
              onMouseDown={(event) => {
                event.preventDefault();
                handleCreate();
              }}
            >
              新增行业字典值：{value.trim()}
            </button>
          ) : null}
          {filteredOptions.length === 0 && !showCreateOption ? (
            <div className="pm-combo__empty">无匹配项，可直接输入行业新值</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

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
  const [domainDraft, setDomainDraft] = useState('');
  const [manualTotalAdjust, setManualTotalAdjust] = useState(false);
  const [weeklyPage, setWeeklyPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
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
      setDomainDraft('');
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
    setDomainDraft('');
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
  const domainOptions = useMemo(
    () => buildDomainOptions(domainCatalog),
    [domainCatalog],
  );

  const totalRows = useMemo(
    () => aggregateRows(form.totalDomainDistribution),
    [form.totalDomainDistribution],
  );
  const weeklyPageCount = Math.max(
    1,
    Math.ceil(form.weeklyNewDomainDistribution.length / EXPERT_TABLE_PAGE_SIZE),
  );
  const totalPageCount = Math.max(
    1,
    Math.ceil(form.totalDomainDistribution.length / EXPERT_TABLE_PAGE_SIZE),
  );
  const weeklyPageStart = (weeklyPage - 1) * EXPERT_TABLE_PAGE_SIZE;
  const totalPageStart = (totalPage - 1) * EXPERT_TABLE_PAGE_SIZE;
  const visibleWeeklyRows = form.weeklyNewDomainDistribution.slice(
    weeklyPageStart,
    weeklyPageStart + EXPERT_TABLE_PAGE_SIZE,
  );
  const visibleTotalRows = form.totalDomainDistribution.slice(
    totalPageStart,
    totalPageStart + EXPERT_TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    setWeeklyPage((current) => Math.min(current, weeklyPageCount));
  }, [weeklyPageCount]);

  useEffect(() => {
    setTotalPage((current) => Math.min(current, totalPageCount));
  }, [totalPageCount]);

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
  const expertContextTitle = `专家网络 · ${form.weekStart || selectedWeek}`;
  const expertContextDetail = reportId
    ? latestReport
      ? `当前周报可直接编辑并再次提交。最近一期为 ${latestReport.weekStart}，默认沿用其累计领域口径，可在累计分布区调整。`
      : '当前周报可直接编辑并再次提交。'
    : latestReport
      ? `当前为新建草稿。最近一期为 ${latestReport.weekStart}，默认沿用其累计领域口径，可在累计分布区调整。`
      : '当前暂无历史周报，将从空白草稿开始录入。';
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
    let added = false;
    updateRows('weeklyNewDomainDistribution', (rows) => {
      const exists = rows.some((row) => row.domain.trim() === domain);
      if (exists) {
        return rows;
      }
      added = true;
      return [...rows, createEmptyRow(domain)];
    });
    return added;
  }

  function addDomainToCatalog(domain: string) {
    const normalized = domain.trim();
    if (!normalized) {
      return '';
    }

    setDomainCatalog((current) => sortDomainCatalog([...current, normalized]));
    return normalized;
  }

  function handleAddDraftToWeekly() {
    const normalized = addDomainToCatalog(domainDraft);
    if (!normalized) {
      setNotice('请先输入或选择一个行业。');
      return;
    }

    const added = addQuickDomain(normalized);
    setDomainDraft('');
    setNotice(
      added
        ? `已将“${normalized}”加入本周新增领域分布。`
        : `“${normalized}”已在本周新增领域分布中，无需重复添加。`,
    );
  }

  function handleAddDraftToCatalog() {
    const normalized = addDomainToCatalog(domainDraft);
    if (!normalized) {
      setNotice('请输入要加入字典的行业名称。');
      return;
    }

    setDomainDraft(normalized);
    setNotice(`已将“${normalized}”加入行业字典，可直接用于后续选择。`);
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
          <div className="pm-page-actions__group pm-page-actions__group--secondary">
            <button
              type="button"
              className="pm-btn pm-btn--quiet"
              onClick={() => {
                window.location.hash = '#/weekly-report';
              }}
            >
              返回周汇报
            </button>
          </div>
          <div className="pm-page-actions__group pm-page-actions__group--primary">
            <button
              type="button"
              className="pm-btn pm-btn--light"
              onClick={() => {
                const nextWeek = getCurrentWeekStart();
                setSelectedWeek(nextWeek);
              }}
            >
              新建草稿
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
        </div>
      </section>

      <section className="expert-context-bar">
        <div className="expert-workbench">
          <div className="expert-workbench__period">
            <label className="pm-field">
              <span className="pm-field__label">统计周期</span>
              <input
                type="date"
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(event.target.value)}
              />
            </label>
          </div>
          <div className="expert-workbench__summary">
            <div className="expert-workbench__chips">
              <span className={`pm-badge ${reportId ? 'pm-badge--ok' : ''}`}>
                {reportId ? '已存在周报' : '新建草稿'}
              </span>
              <span className="pm-badge">完成 {completedCount}/{completionItems.length}</span>
            </div>
            <strong>{expertContextTitle}</strong>
            <small>{expertContextDetail}</small>
          </div>
          <div className="expert-workbench__stats">
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
                <small>行业字段已改为可搜索下拉输入，支持中文、拼音全拼和首字母检索，也支持补充新行业字典值。</small>
              </div>
              <div className="pm-chip-row">
                <span className="pm-chip">本周新增 {currentMetrics.newExpertsCount || 0}</span>
                <span className="pm-chip">Top 领域 {topLabel(form.weeklyNewDomainDistribution)}</span>
              </div>
            </div>
            <div className="expert-dictionary-bar">
              <div className="expert-dictionary-field expert-dictionary-field--compact">
                <div className="expert-dictionary-field__meta">
                  <div className="expert-dictionary-field__title">
                    <span className="pm-field__label">行业字典快速添加</span>
                    <span className="expert-tip" tabIndex={0}>
                      <span className="expert-tip__icon" aria-label="查看行业字典快速添加提示">
                        <InfoIcon />
                      </span>
                      <span className="expert-tip__bubble" role="tooltip">
                        当前字典 {domainCatalog.length} 个行业。支持中文、拼音全拼和首字母检索；
                        若无匹配项，可直接输入新行业并加入字典。
                      </span>
                    </span>
                  </div>
                </div>
                <div className="expert-dictionary-field__input">
                  <DomainComboInput
                    value={domainDraft}
                    options={domainOptions}
                    placeholder="搜索行业名称或拼音，如 教育 / jiaoyu / xxjs"
                    ariaLabel="行业字典快速添加"
                    onChange={setDomainDraft}
                    onCreateOption={(nextValue) => {
                      addDomainToCatalog(nextValue);
                      setDomainDraft(nextValue);
                    }}
                  />
                </div>
              </div>
              <div className="expert-dictionary-actions">
                <button
                  type="button"
                  className="pm-btn pm-btn--accent"
                  onClick={handleAddDraftToWeekly}
                >
                  添加到本周新增
                </button>
                <button
                  type="button"
                  className="pm-btn pm-btn--light"
                  onClick={handleAddDraftToCatalog}
                >
                  加入行业字典
                </button>
              </div>
            </div>
            <div className="expert-table">
              <div className="expert-table__head">
                <span>序号</span>
                <span>领域</span>
                <span>人数</span>
                <span>操作</span>
              </div>
              {visibleWeeklyRows.map((row, index) => (
                <div key={row.id} className="expert-table__row">
                  <div className="expert-table__index">{weeklyPageStart + index + 1}</div>
                  <DomainComboInput
                    value={row.domain}
                    options={domainOptions}
                    placeholder="搜索或输入行业名称"
                    ariaLabel={`本周新增领域第${weeklyPageStart + index + 1}行`}
                    onChange={(nextValue) =>
                      updateRows('weeklyNewDomainDistribution', (rows) =>
                        rows.map((item) =>
                          item.id === row.id
                            ? { ...item, domain: nextValue }
                            : item,
                        ),
                      )
                    }
                    onCreateOption={(nextValue) => {
                      addDomainToCatalog(nextValue);
                      updateRows('weeklyNewDomainDistribution', (rows) =>
                        rows.map((item) =>
                          item.id === row.id
                            ? { ...item, domain: nextValue }
                            : item,
                        ),
                      );
                    }}
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
            {weeklyPageCount > 1 ? (
              <div className="pm-pagination expert-table__pagination">
                <span className="pm-pagination__info">
                  第 {weeklyPage} / {weeklyPageCount} 页，每页最多 {EXPERT_TABLE_PAGE_SIZE} 条
                </span>
                <div className="pm-pagination__actions">
                  <button
                    type="button"
                    className="pm-btn pm-btn--light"
                    onClick={() => setWeeklyPage((current) => Math.max(1, current - 1))}
                    disabled={weeklyPage <= 1}
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    className="pm-btn pm-btn--light"
                    onClick={() =>
                      setWeeklyPage((current) => Math.min(weeklyPageCount, current + 1))
                    }
                    disabled={weeklyPage >= weeklyPageCount}
                  >
                    下一页
                  </button>
                </div>
              </div>
            ) : null}
            <div className="expert-panel__actions">
              <button
                type="button"
                className="pm-btn pm-btn--light"
                onClick={() => {
                  setWeeklyPage(
                    Math.ceil(
                      (form.weeklyNewDomainDistribution.length + 1) / EXPERT_TABLE_PAGE_SIZE,
                    ),
                  );
                  updateRows('weeklyNewDomainDistribution', (rows) => [
                    ...rows,
                    createEmptyRow(),
                  ]);
                }}
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
                <span>序号</span>
                <span>领域</span>
                <span>累计人数</span>
                <span>操作</span>
              </div>
              {visibleTotalRows.map((row, index) => (
                <div key={row.id} className="expert-table__row">
                  <div className="expert-table__index">{totalPageStart + index + 1}</div>
                  <DomainComboInput
                    value={row.domain}
                    options={domainOptions}
                    placeholder="搜索或输入行业名称"
                    ariaLabel={`累计领域第${totalPageStart + index + 1}行`}
                    onChange={(nextValue) =>
                      updateRows('totalDomainDistribution', (rows) =>
                        rows.map((item) =>
                          item.id === row.id
                            ? { ...item, domain: nextValue }
                            : item,
                        ),
                      )
                    }
                    onCreateOption={(nextValue) => {
                      addDomainToCatalog(nextValue);
                      updateRows('totalDomainDistribution', (rows) =>
                        rows.map((item) =>
                          item.id === row.id
                            ? { ...item, domain: nextValue }
                            : item,
                        ),
                      );
                    }}
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
            {totalPageCount > 1 ? (
              <div className="pm-pagination expert-table__pagination">
                <span className="pm-pagination__info">
                  第 {totalPage} / {totalPageCount} 页，每页最多 {EXPERT_TABLE_PAGE_SIZE} 条
                </span>
                <div className="pm-pagination__actions">
                  <button
                    type="button"
                    className="pm-btn pm-btn--light"
                    onClick={() => setTotalPage((current) => Math.max(1, current - 1))}
                    disabled={totalPage <= 1}
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    className="pm-btn pm-btn--light"
                    onClick={() =>
                      setTotalPage((current) => Math.min(totalPageCount, current + 1))
                    }
                    disabled={totalPage >= totalPageCount}
                  >
                    下一页
                  </button>
                </div>
              </div>
            ) : null}
            <div className="expert-panel__actions">
              <button
                type="button"
                className="pm-btn pm-btn--light"
                onClick={() => {
                  setTotalPage(
                    Math.ceil(
                      (form.totalDomainDistribution.length + 1) / EXPERT_TABLE_PAGE_SIZE,
                    ),
                  );
                  updateRows('totalDomainDistribution', (rows) => [
                    ...rows,
                    createEmptyRow(),
                  ]);
                }}
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
