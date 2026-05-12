import React, { useEffect, useMemo, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_URL || "https://operafix-production.up.railway.app";

type PriorityRecord = {
  id: string;
  score: number;
  refund_amount: number;
  status: string;
  pension_entity: string;
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

type TabKey = "overview" | "priorities" | "ai" | "automation";

export default function V66AutomationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [priorities, setPriorities] = useState<PriorityRecord[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiResult, setAiResult] = useState<unknown>(null);
  const [cronResult, setCronResult] = useState<unknown>(null);
  const [selected, setSelected] = useState<PriorityRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const formatCLP = (value: number) =>
    Number(value || 0).toLocaleString("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    });

  const loadPriorities = async () => {
    const res = await fetch(`${API_BASE}/api/automation/priorities`);
    const json = await res.json();

    if (json.success) {
      setPriorities(json.records || []);
      setSelected(json.records?.[0] || null);
    }
  };

  const loadDashboard = async () => {
    const res = await fetch(`${API_BASE}/api/dashboard/metrics`);
    const json = await res.json();
    setDashboard(json);
  };

  const refreshAll = async () => {
    await Promise.all([loadPriorities(), loadDashboard()]);
  };

  const runCron = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/automation/run-cron`, {
        method: "POST",
      });
      const json = await res.json();
      setCronResult(json);
      await refreshAll();
    } finally {
      setLoading(false);
    }
  };

  const runAI = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/nl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText, action: "get" }),
      });

      const json = await res.json();
      setAiResult(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll().catch(console.error);
  }, []);

  const top20 = useMemo(() => priorities.slice(0, 20), [priorities]);

  return (
    <div style={page}>
      <aside style={sidebar}>
        <div style={brandBox}>
          <div style={logo}>OF</div>
          <div>
            <strong>OperaFix</strong>
            <small style={muted}>Automation V66</small>
          </div>
        </div>

        <NavButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
          Dashboard
        </NavButton>
        <NavButton active={activeTab === "priorities"} onClick={() => setActiveTab("priorities")}>
          Prioridades
        </NavButton>
        <NavButton active={activeTab === "ai"} onClick={() => setActiveTab("ai")}>
          IA Operativa
        </NavButton>
        <NavButton active={activeTab === "automation"} onClick={() => setActiveTab("automation")}>
          Automatización
        </NavButton>
      </aside>

      <main style={main}>
        <header style={header}>
          <div>
            <h1 style={{ margin: 0 }}>Centro de Automatización</h1>
            <p style={muted}>Prioridades, IA, cron manual y métricas reales.</p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={secondaryBtn} onClick={refreshAll}>
              Actualizar
            </button>
            <button style={primaryBtn} onClick={runCron} disabled={loading}>
              {loading ? "Ejecutando..." : "Ejecutar cron"}
            </button>
          </div>
        </header>

        <section style={kpiGrid}>
          <Kpi title="Total recuperación" value={formatCLP(dashboard?.total || 0)} />
          <Kpi title="Registros priorizados" value={String(priorities.length)} />
          <Kpi title="Top prioridad" value={formatCLP(top20[0]?.refund_amount || 0)} />
          <Kpi title="Estado sistema" value="Operativo" />
        </section>

        {activeTab === "overview" && (
          <section style={grid2}>
            <Card title="Monto por estado">
              {(dashboard?.byEstado || []).map((item) => (
                <Row
                  key={item.estado || "sin_estado"}
                  label={item.estado || "Sin estado"}
                  value={formatCLP(item.monto)}
                />
              ))}
            </Card>

            <Card title="Monto por entidad">
              {(dashboard?.byEntidad || []).map((item) => (
                <Row
                  key={item.entidad || "sin_entidad"}
                  label={item.entidad || "Sin entidad"}
                  value={formatCLP(item.monto)}
                />
              ))}
            </Card>
          </section>
        )}

        {activeTab === "priorities" && (
          <section style={contentLayout}>
            <Card title="Top prioridades">
              <div style={{ overflowX: "auto" }}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Score</th>
                      <th style={th}>Monto</th>
                      <th style={th}>Estado</th>
                      <th style={th}>Entidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top20.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelected(item)}
                        style={{
                          cursor: "pointer",
                          background: selected?.id === item.id ? "#f0f7ff" : "transparent",
                        }}
                      >
                        <td style={td}>{Number(item.score).toFixed(0)}</td>
                        <td style={td}>{formatCLP(item.refund_amount)}</td>
                        <td style={td}>{item.status || "Sin estado"}</td>
                        <td style={td}>{item.pension_entity || "Sin entidad"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Panel lateral">
              {selected ? (
                <>
                  <Row label="ID" value={selected.id} />
                  <Row label="Score" value={Number(selected.score).toFixed(0)} />
                  <Row label="Monto" value={formatCLP(selected.refund_amount)} />
                  <Row label="Estado" value={selected.status || "Sin estado"} />
                  <Row label="Entidad" value={selected.pension_entity || "Sin entidad"} />

                  <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                    <button style={primaryBtn}>Crear tarea</button>
                    <button style={secondaryBtn}>Enviar correo base</button>
                    <button style={secondaryBtn}>Ver historial</button>
                  </div>
                </>
              ) : (
                <p style={muted}>Selecciona un registro.</p>
              )}
            </Card>
          </section>
        )}

        {activeTab === "ai" && (
          <Card title="IA Operativa">
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Ej: pendientes de AFP Modelo sobre $1.000.000"
              style={textarea}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button style={primaryBtn} onClick={runAI} disabled={loading || !aiText.trim()}>
                Consultar IA
              </button>
              <button
                style={secondaryBtn}
                onClick={() => setAiText("pendientes de AFP Modelo sobre $1.000.000")}
              >
                Ejemplo
              </button>
            </div>

            {aiResult ? <pre style={pre}>{JSON.stringify(aiResult, null, 2)}</pre> : null}
          </Card>
        )}

        {activeTab === "automation" && (
          <Card title="Automatización">
            <p style={muted}>
              Ejecuta el motor de reglas manualmente y revisa la última respuesta del backend.
            </p>

            <button style={primaryBtn} onClick={runCron} disabled={loading}>
              {loading ? "Ejecutando..." : "Ejecutar automatización ahora"}
            </button>

            {cronResult ? <pre style={pre}>{JSON.stringify(cronResult, null, 2)}</pre> : null}
          </Card>
        )}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...navBtn,
        background: active ? "#eef6ff" : "transparent",
        color: active ? "#0f5ea8" : "#334155",
        fontWeight: active ? 700 : 500,
      }}
    >
      {children}
    </button>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div style={card}>
      <p style={muted}>{title}</p>
      <strong style={{ fontSize: 22 }}>{value}</strong>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={row}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  background: "#f6f8fb",
  color: "#0f172a",
};

const sidebar: React.CSSProperties = {
  width: 260,
  background: "#ffffff",
  borderRight: "1px solid #e5e7eb",
  padding: 18,
};

const brandBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 24,
};

const logo: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: "#0f5ea8",
  color: "#fff",
  display: "grid",
  placeItems: "center",
  fontWeight: 800,
};

const main: React.CSSProperties = {
  flex: 1,
  padding: 24,
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
};

const muted: React.CSSProperties = {
  display: "block",
  color: "#64748b",
  margin: 0,
};

const navBtn: React.CSSProperties = {
  width: "100%",
  border: 0,
  borderRadius: 10,
  padding: "12px 14px",
  textAlign: "left",
  cursor: "pointer",
  marginBottom: 6,
};

const kpiGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  margin: "20px 0",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const contentLayout: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: 16,
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 10px 25px rgba(15,23,42,0.05)",
};

const primaryBtn: React.CSSProperties = {
  border: 0,
  borderRadius: 10,
  padding: "10px 14px",
  background: "#0f5ea8",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryBtn: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 14px",
  background: "#fff",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: 600,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  padding: 10,
  color: "#475569",
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
  padding: 10,
};

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  borderBottom: "1px solid #f1f5f9",
  padding: "9px 0",
};

const textarea: React.CSSProperties = {
  width: "100%",
  minHeight: 100,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
};

const pre: React.CSSProperties = {
  background: "#0f172a",
  color: "#f8fafc",
  padding: 14,
  borderRadius: 12,
  marginTop: 16,
  overflowX: "auto",
};