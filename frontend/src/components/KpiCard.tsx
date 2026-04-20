interface Props {
  title: string;
  value: string;
  hint?: string;
}

export default function KpiCard({ title, value, hint }: Props) {
  return (
    <article className="kpi-card">
      <span className="kpi-title">{title}</span>
      <strong className="kpi-value">{value}</strong>
      {hint ? <small className="kpi-hint">{hint}</small> : null}
    </article>
  );
}
