import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJson } from "../../api";

type SmartPriority = {
  id: string;
  management_type: string;
  mandante: string;
  business_name: string;
  rut: string;
  entity: string;
  management_status: string;
  refund_amount: number;
  confirmation_cc: boolean;
  confirmation_power: boolean;
  score: number;
  score_reasons: string[];
  blockers: string[];
  next_action: string;
};

type IntelligenceSummary = {
  totals: {
    records: number;
    refund_amount: number;
    actual_paid_amount: number;
    ready_count: number;
    ready_amount: number;
    blocked_power: number;
    blocked_cc: number;
    dormant: number;
    rejected: number;
    paid: number;
  };
  insights: string[];
  priorities: SmartPriority[];
  rankings: {
    byMandante: { name: string; count: number; amount: number }[];
    byEntity: { name: string; count: number; amount: number }[];
    byStatus: { name: string; count: number; amount: number }[];
  };
};

function money(value: unknown) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function scoreLabel(score: number) {
  if (score >= 80) return "Alta";
  if (score >= 55) return "Media";
  return "Baja";
}

export default function IntelligenceSummaryPanel({ mandante }: { mandante?: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState<IntelligenceSummary | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const query = mandante && mandante !== "todos" ? { mandante } : undefined;
      setData(await fetchJson<IntelligenceSummary>("/intelligence/summary", { query }));
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [mandante]);

  const topPriorities = useMemo(() => (data?.priorities || []).slice(0, 6), [data]);

  return (
    <section className="ai-executive-panel">
      <div className="ai-executive-header">
        <div>
          <span className="ai-eyebrow">OperaFix AI</span>
          <h2>Resumen inteligente del día</h2>
          <p>Priorización automática basada en monto, estado, poder, cuenta corriente, documentos y antigüedad.</p>
        </div>
        <div className="ai-executive-actions">
          <button className="zoho-btn" onClick={load}>{loading ? "Actualizando..." : "Actualizar IA"}</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => navigate("/ai-command-center")}>Abrir chat IA</button>
        </div>
      </div>

      {!data ? (
        <div className="zoho-empty small">No se pudo cargar la inteligencia operacional.</div>
      ) : (
        <>
          <div className="ai-insight-grid">
            <div><span>Listos para gestionar</span><strong>{data.totals.ready_count}</strong><small>{money(data.totals.ready_amount)}</small></div>
            <div><span>Bloqueados por poder</span><strong>{data.totals.blocked_power}</strong><small>requieren acción legal/KAM</small></div>
            <div><span>Bloqueados por CC</span><strong>{data.totals.blocked_cc}</strong><small>requieren datos bancarios</small></div>
            <div><span>Sin actividad +30 días</span><strong>{data.totals.dormant}</strong><small>requieren seguimiento</small></div>
          </div>

          <div className="ai-insight-body">
            <div className="ai-narrative-card">
              <h3>Lectura ejecutiva</h3>
              <ul>
                {data.insights.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div className="ai-priority-card">
              <h3>Top prioridades</h3>
              {topPriorities.length === 0 ? <p className="muted">Sin prioridades para esta vista.</p> : topPriorities.map((row) => (
                <button key={row.id} className="ai-priority-row" onClick={() => navigate(`/records/${row.id}`)}>
                  <div>
                    <strong>{row.business_name}</strong>
                    <span>{row.mandante} · {row.entity} · {row.management_status}</span>
                    <small>{row.next_action}</small>
                  </div>
                  <div className="ai-score-box">
                    <strong>{row.score}</strong>
                    <span>{scoreLabel(row.score)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
