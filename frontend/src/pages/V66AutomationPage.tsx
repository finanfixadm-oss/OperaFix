import React, { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://operafix-production.up.railway.app";

type PriorityRecord = {
  id: string;
  score: number;
  refund_amount: number;
  status: string;
  pension_entity: string;
};

type PriorityResponse = {
  success: boolean;
  total: number;
  records: PriorityRecord[];
};

type DashboardMetric = {
  estado?: string;
  entidad?: string;
  monto: number;
};

type DashboardResponse = {
  total: number;
  byEstado: DashboardMetric[];
  byEntidad: DashboardMetric[];
};

export default function V66AutomationPage() {
  const [priorities, setPriorities] = useState<PriorityRecord[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiResult, setAiResult] = useState<unknown>(null);
  const [cronResult, setCronResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const formatCLP = (value: number) =>
    Number(value || 0).toLocaleString("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    });

  const loadPriorities = async () => {
    const res = await fetch(`${API_BASE}/api/automation/priorities`);
    const json = (await res.json()) as PriorityResponse;

    if (json.success) {
      setPriorities(json.records.slice(0, 20));
    }
  };

  const loadDashboard = async () => {
    const res = await fetch(`${API_BASE}/api/dashboard/metrics`);
    const json = (await res.json()) as DashboardResponse;
    setDashboard(json);
  };

  const runCron = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/automation/run-cron`, {
        method: "POST",
      });

      const json = await res.json();
      setCronResult(json);

      await loadPriorities();
      await loadDashboard();
    } finally {
      setLoading(false);
    }
  };

  const runAI = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/nl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: aiText,
          action: "get",
        }),
      });

      const json = await res.json();
      setAiResult(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPriorities();
    loadDashboard();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>V66 Automatización Operativa</h1>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        <div style={cardStyle}>
          <h3>Total recuperación</h3>
          <strong style={{ fontSize: 24 }}>
            {formatCLP(dashboard?.total || 0)}
          </strong>
        </div>

        <div style={cardStyle}>
          <h3>Prioridades cargadas</h3>
          <strong style={{ fontSize: 24 }}>{priorities.length}</strong>
        </div>

        <div style={cardStyle}>
          <h3>Automatización</h3>
          <button onClick={runCron} disabled={loading}>
            {loading ? "Ejecutando..." : "Ejecutar cron manual"}
          </button>
        </div>
      </section>

      <section style={{ ...cardStyle, marginTop: 20 }}>
        <h2>IA Operativa</h2>

        <textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          placeholder="Ej: pendientes de AFP Modelo sobre $1.000.000"
          style={{
            width: "100%",
            minHeight: 90,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />

        <button onClick={runAI} disabled={loading || !aiText.trim()}>
          Consultar IA
        </button>

        {aiResult ? (
          <pre style={preStyle}>{JSON.stringify(aiResult, null, 2)}</pre>
        ) : null}
      </section>

      <section style={{ ...cardStyle, marginTop: 20 }}>
        <h2>Top 20 prioridades</h2>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Monto</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Entidad</th>
                <th style={thStyle}>ID</th>
              </tr>
            </thead>

            <tbody>
              {priorities.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{Number(item.score).toFixed(0)}</td>
                  <td style={tdStyle}>{formatCLP(item.refund_amount)}</td>
                  <td style={tdStyle}>{item.status || "Sin estado"}</td>
                  <td style={tdStyle}>{item.pension_entity || "Sin entidad"}</td>
                  <td style={tdStyle}>{item.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        <div style={cardStyle}>
          <h2>Monto por estado</h2>

          {(dashboard?.byEstado || []).map((item) => (
            <div key={item.estado} style={rowStyle}>
              <span>{item.estado || "Sin estado"}</span>
              <strong>{formatCLP(item.monto)}</strong>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <h2>Monto por entidad</h2>

          {(dashboard?.byEntidad || []).map((item) => (
            <div key={item.entidad} style={rowStyle}>
              <span>{item.entidad || "Sin entidad"}</span>
              <strong>{formatCLP(item.monto)}</strong>
            </div>
          ))}
        </div>
      </section>

      {cronResult ? (
        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2>Resultado último cron</h2>
          <pre style={preStyle}>{JSON.stringify(cronResult, null, 2)}</pre>
        </section>
      ) : null}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  padding: 10,
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #f1f1f1",
  padding: 10,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  borderBottom: "1px solid #f1f1f1",
  padding: "8px 0",
};

const preStyle: React.CSSProperties = {
  background: "#111827",
  color: "#f9fafb",
  padding: 12,
  borderRadius: 8,
  overflowX: "auto",
};