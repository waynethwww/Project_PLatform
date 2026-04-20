type MetricCardProps = {
  label: string;
  value: string;
  subtext: string;
  tone?: 'blue' | 'teal' | 'amber' | 'red';
};

export function MetricCard({
  label,
  value,
  subtext,
  tone = 'blue',
}: MetricCardProps) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-subtext">{subtext}</div>
    </div>
  );
}

