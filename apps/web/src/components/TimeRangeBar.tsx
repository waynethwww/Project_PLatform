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
          <select
            value={mode}
            onChange={(event) =>
              onModeChange(event.target.value as 'latest' | 'period')
            }
          >
            <option value="period">时间区间</option>
            <option value="latest">最新快照</option>
          </select>
        </label>
        <label>
          曲线类型
          <select
            value={curveType}
            onChange={(event) => onCurveTypeChange(event.target.value)}
          >
            <option value="">全部曲线</option>
            <option value="一曲线">一曲线</option>
            <option value="二曲线">二曲线</option>
            <option value="三曲线">三曲线</option>
          </select>
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

