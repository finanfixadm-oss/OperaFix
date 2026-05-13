import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://operafix-production.up.railway.app";

type AiPreviewRecord = {
  id: string;
  management_id?: string | null;
  mandante?: string | null;
  business_name?: string | null;
  rut?: string | null;
  request_number?: string | null;
  refund_amount?: number | string | null;
  management_status?: string | null;
  entity?: string | null;
  confirmation_cc?: boolean | null;
  confirmation_power?: boolean | null;
};

type AiResult = {
  success?: boolean;
  mode?: string;
  message?: string;
  previewCount?: number;
  totalAmount?: number;
  preview?: AiPreviewRecord[];
  error?: unknown;
  where?: unknown;
};

type SuggestionRecord = {
  id: string;
  management_id?: string | null;
  mandante: string;
  business_name: string;
  rut: string;
  request_number: string;
  refund_amount: number;
  management_status: string;
  entity: string;
  confirmation_cc: boolean;
  confirmation_power: boolean;
  document_count: number;
  document_categories: string[];
  score: number;
  suggestedAction: string;
  reason: string;
  nextSteps: string[];
  checklist: Record<string, boolean>;
};

export default function AICommandCenterPage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<AiResult | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionRecord[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionRecord | null>(null);

  useEffect(() => {
    loadSuggestions();
    const stored = localStorage.getItem("operafix_prompts");
    if (stored) {
      setSavedPrompts(JSON.parse(stored));
    }
  }, []);

  const formatCLP = (value: unknown) =>
    Number(value || 0).toLocaleString("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    });

  const topSuggestions = useMemo(() => suggestions.slice(0, 30), [suggestions]);

  const loadSuggestions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ai-suggestions/suggestions`);
      const json = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: json });
        return;
      }
      if (json.success) {
        setSuggestions(json.suggestions || []);
        setSelectedSuggestion(json.suggestions?.[0] || null);
      }
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : "Error cargando sugerencias" });
    }
  };

  const executeAI = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai-actions/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: prompt,
          action: "get",
          limit: 100,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: json });
        return;
      }
      setResult(json);
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : "Error ejecutando consulta IA" });
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = () => {
    if (!prompt.trim()) return;
    const cleaned = prompt.trim();
    const updated = [cleaned, ...savedPrompts.filter((item) => item !== cleaned)].slice(0, 30);
    setSavedPrompts(updated);
    localStorage.setItem("operafix_prompts", JSON.stringify(updated));
  };

  const removePrompt = (index: number) => {
    const updated = savedPrompts.filter((_, i) => i !== index);
    setSavedPrompts(updated);
    localStorage.setItem("operafix_prompts", JSON.stringify(updated));
  };

  const prepareSuggestion = (suggestion: SuggestionRecord) => {
    setSelectedSuggestion(suggestion);
    setResult({
      success: true,
      mode: "suggestion-detail",
      message: "Detalle de gestión sugerida. No se ejecutó ningún cambio automático.",
      previewCount: 1,
      totalAmount: suggestion.refund_amount,
      preview: [
        {
          id: suggestion.id,
          management_id: suggestion.management_id,
          mandante: suggestion.mandante,
          business_name: suggestion.business_name,
          rut: suggestion.rut,
          request_number: suggestion.request_number,
          refund_amount: suggestion.refund_amount,
          management_status: suggestion.management_status,
          entity: suggestion.entity,
          confirmation_cc: suggestion.confirmation_cc,
          confirmation_power: suggestion.confirmation_power,
        },
      ],
    });
  };

  return (
    <div style={page}>
      <aside style={sidebar}>
        <h2 style={{ marginTop: 0 }}>🧠 Prompts IA</h2>
        <button onClick={savePrompt} style={saveBtn}>➕ Guardar prompt</button>

        <div style={{ display: "grid", gap: 10 }}>
          {savedPrompts.map((p, i) => (
            <div key={`${p}-${i}`} style={promptCard} onClick={() => setPrompt(p)}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{p.slice(0, 80)}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePrompt(i);
                }}
                style={deleteBtn}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main style={main}>
        <section style={card}>
          <h1 style={{ margin: 0 }}>🚀 AI Command Center</h1>
          <p style={muted}>Consulta datos reales del CRM. La IA muestra detalle; no hace cambios masivos automáticos.</p>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: dame los casos pendientes de gestión de Mundo Previsional con monto, CC y poder"
            style={textarea}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button onClick={executeAI} disabled={loading || !prompt.trim()} style={primaryBtn}>🔎 Consultar</button>
            <button
              onClick={() => setPrompt("dame los casos pendientes de gestión de Mundo Previsional con monto, CC, poder y AFP")}
              style={secondaryBtn}
            >
              ⚡ Ejemplo consulta
            </button>
            <button
              onClick={() => setPrompt("qué casos están listos para gestionar esta semana")}
              style={secondaryBtn}
            >
              ✅ Ejemplo sugerencias
            </button>
          </div>

          {loading && <p style={muted}>Procesando IA...</p>}
        </section>

        {result && (
          <section style={card}>
            <h2>Resultado</h2>
            {result.message && <p style={muted}>{result.message}</p>}
            {typeof result.totalAmount !== "undefined" && <h3>Total monto: {formatCLP(result.totalAmount)}</h3>}
            {typeof result.previewCount !== "undefined" && <p>Registros encontrados: <strong>{result.previewCount}</strong></p>}
            {result.error ? <pre style={pre}>{JSON.stringify(result.error, null, 2)}</pre> : null}
            {result.preview?.length ? <PreviewTable records={result.preview} /> : null}
          </section>
        )}

        <section style={card}>
          <h2>🤖 Sugerencias IA: gestiones listas</h2>
          <p style={muted}>
            Se sugieren solo casos con condiciones operativas favorables: monto, CC en Sí, poder en Sí, AFP asignada, estado pendiente y documentos/detalle cargados.
          </p>

          <div style={suggestionLayout}>
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Empresa</th>
                    <th style={th}>Mandante</th>
                    <th style={th}>AFP</th>
                    <th style={th}>Monto</th>
                    <th style={th}>CC</th>
                    <th style={th}>Poder</th>
                    <th style={th}>Docs</th>
                    <th style={th}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topSuggestions.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSuggestion(s)}
                      style={{ cursor: "pointer", background: selectedSuggestion?.id === s.id ? "#eef6ff" : "transparent" }}
                    >
                      <td style={td}>{s.business_name}</td>
                      <td style={td}>{s.mandante}</td>
                      <td style={td}>{s.entity}</td>
                      <td style={td}>{formatCLP(s.refund_amount)}</td>
                      <td style={td}>{s.confirmation_cc ? "Sí" : "No"}</td>
                      <td style={td}>{s.confirmation_power ? "Sí" : "No"}</td>
                      <td style={td}>{s.document_count}</td>
                      <td style={td}>{Math.round(s.score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside style={sidePanel}>
              {selectedSuggestion ? (
                <>
                  <h3>{selectedSuggestion.suggestedAction}</h3>
                  <p style={muted}>{selectedSuggestion.reason}</p>
                  <Row label="Empresa" value={selectedSuggestion.business_name} />
                  <Row label="RUT" value={selectedSuggestion.rut || "—"} />
                  <Row label="Mandante" value={selectedSuggestion.mandante} />
                  <Row label="AFP" value={selectedSuggestion.entity} />
                  <Row label="Estado" value={selectedSuggestion.management_status} />
                  <Row label="Monto" value={formatCLP(selectedSuggestion.refund_amount)} />
                  <Row label="N° Solicitud" value={selectedSuggestion.request_number || "—"} />
                  <Row label="Documentos" value={`${selectedSuggestion.document_count}`} />
                  <Row label="Categorías" value={selectedSuggestion.document_categories.join(", ") || "—"} />
                  <h4>Próximos pasos</h4>
                  <ul>
                    {selectedSuggestion.nextSteps.map((step) => <li key={step}>{step}</li>)}
                  </ul>
                  <button style={primaryBtn} onClick={() => prepareSuggestion(selectedSuggestion)}>Ver detalle</button>
                </>
              ) : (
                <p style={muted}>Selecciona una sugerencia.</p>
              )}
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

function PreviewTable({ records }: { records: AiPreviewRecord[] }) {
  const formatCLP = (value: unknown) =>
    Number(value || 0).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Empresa</th>
            <th style={th}>Mandante</th>
            <th style={th}>RUT</th>
            <th style={th}>AFP</th>
            <th style={th}>Estado</th>
            <th style={th}>Monto</th>
            <th style={th}>CC</th>
            <th style={th}>Poder</th>
            <th style={th}>N° Solicitud</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td style={td}>{record.business_name || "—"}</td>
              <td style={td}>{record.mandante || "—"}</td>
              <td style={td}>{record.rut || "—"}</td>
              <td style={td}>{record.entity || "—"}</td>
              <td style={td}>{record.management_status || "—"}</td>
              <td style={td}>{formatCLP(record.refund_amount)}</td>
              <td style={td}>{record.confirmation_cc ? "Sí" : "No"}</td>
              <td style={td}>{record.confirmation_power ? "Sí" : "No"}</td>
              <td style={td}>{record.request_number || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

const page: React.CSSProperties = { display: "grid", gridTemplateColumns: "300px 1fr", minHeight: "100vh", background: "#f1f5f9" };
const sidebar: React.CSSProperties = { background: "#0f172a", color: "#fff", padding: 20, overflowY: "auto" };
const main: React.CSSProperties = { padding: 24, overflowY: "auto" };
const card: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: 24, marginBottom: 20, border: "1px solid #ddd", boxShadow: "0 10px 25px rgba(15,23,42,0.05)" };
const muted: React.CSSProperties = { color: "#64748b" };
const textarea: React.CSSProperties = { width: "100%", minHeight: 115, padding: 16, borderRadius: 12, border: "1px solid #cbd5e1", marginTop: 16 };
const primaryBtn: React.CSSProperties = { border: 0, borderRadius: 10, padding: "10px 14px", background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: 700 };
const secondaryBtn: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 14px", background: "#fff", color: "#0f172a", cursor: "pointer", fontWeight: 600 };
const saveBtn: React.CSSProperties = { width: "100%", marginBottom: 20, padding: 10, borderRadius: 10, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" };
const deleteBtn: React.CSSProperties = { marginTop: 6, background: "transparent", border: "none", color: "#f87171", cursor: "pointer" };
const promptCard: React.CSSProperties = { background: "#1e293b", padding: 12, borderRadius: 10, cursor: "pointer" };
const pre: React.CSSProperties = { background: "#0f172a", color: "#fff", padding: 20, borderRadius: 12, overflowX: "auto" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse" };
const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 10, color: "#475569", whiteSpace: "nowrap" };
const td: React.CSSProperties = { borderBottom: "1px solid #f1f5f9", padding: 10, verticalAlign: "top" };
const suggestionLayout: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 390px", gap: 16, marginTop: 16 };
const sidePanel: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, background: "#f8fafc" };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #e5e7eb", padding: "9px 0" };
