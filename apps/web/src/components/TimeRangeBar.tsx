import { AppSelect } from './AppSelect';

type TimeRangeBarProps = {
  startDate: string;
  endDate: string;
  mode: 'latest' | 'period';
  curveType: string;
  onPresetChange: (preset: 'week' | 'month' | 'quarter') => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onModeChange: (mode: 'latest' | 'period') => void;
  onCurveTypeChange: (curveType: string) => void;
  onLoginClick: () => void;
};

export function TimeRangeBar(props: TimeRangeBarProps) {
  const {
    startDate,
    endDate,
    mode,
    curveType,
    onPresetChange,
    onStartDateChange,
    onEndDateChange,
    onModeChange,
    onCurveTypeChange,
    onLoginClick,
  } = props;

  return (
    <div className="toolbar">
      <div className="toolbar__left">
        <button onClick={() => onPresetChange('week')}>近一周</button>
        <button onClick={() => onPresetChange('month')}>近一月</button>
        <button onClick={() => onPresetChange('quarter')}>近一季度</button>
      </div>
      <div className="toolbar__center">
        <label>
          开始日期
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
          />
        </label>
        <label>
          结束日期
          <input
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
          />
        </label>
        <label>
          统计模式
          <AppSelect
            value={mode}
            onChange={(nextValue) => onModeChange(nextValue as 'latest' | 'period')}
            tone="dark"
            size="compact"
            ariaLabel="统计模式"
            options={[
              { value: 'period', label: '时间区间' },
              { value: 'latest', label: '最新快照' },
            ]}
          />
        </label>
        <label>
          曲线类型
          <AppSelect
            value={curveType}
            onChange={onCurveTypeChange}
            tone="dark"
            size="compact"
            ariaLabel="曲线类型"
            options={[
              { value: '', label: '全部曲线' },
              { value: '一曲线', label: '一曲线' },
              { value: '二曲线', label: '二曲线' },
              { value: '三曲线', label: '三曲线' },
            ]}
          />
        </label>
      </div>
      <div className="toolbar__right">
        <button className="toolbar__login" onClick={onLoginClick}>
          钉钉免登
        </button>
      </div>
    </div>
  );
}
