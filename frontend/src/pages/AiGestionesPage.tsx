import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJson, postJson } from "../api";

type MandanteOption = { id: string; name: string };

type AiAction = {
  id: string;
  type: "UPDATE_STATUS" | "ADD_NOTE" | "CREATE_TASK" | "MARK_CONFIRMATION" | "CREATE_EMAIL_DRAFT";
  recordId: string;
  label?: string;
  payload?: Record<string, unknown>;
};

type AiReportColumn = { key: string; label: string; type?: string };

type AiReport = {
  title: string;
  columns: AiReportColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
  filtersApplied: string[];
  generatedAt: string;
};

type AiChatResponse = {
  answer: string;
  actions: AiAction[];
  report?: AiReport | null;
  available_columns?: AiReportColumn[];
  source: "openai" | "openai_required";
  engine?: string;
  analyzed_records: number;
  generated_at: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AiAction[];
  report?: AiReport | null;
  source?: "openai" | "openai_required";
  engine?: string;
  analyzed_records?: number;
};

const quickPrompts = [
  "Quién eres y qué puedes hacer por mí",
  "Sácame un Excel de Mundo Previsional con Razón Social, RUT, Entidad, Estado Gestión, Monto Devolución y N° Solicitud",
  "Qué informes puedo pedir y qué columnas puedo usar",
  "Dónde está la plata: detecta oportunidades de mayor monto",
  "Qué gestiones debo priorizar esta semana",
  "Detecta casos sin poder o sin confirmación CC",
  "Prepara acciones para gestiones de alto monto",
  "Genera borradores de correo para seguimiento a entidad",
  "Crea tarea de seguimiento para casos sin poder",
  "Agrega nota: pendiente respuesta de la entidad",
  "Dame la pega ordenada para hoy",
];

function actionTypeLabel(type: AiAction["type"]) {
  const labels: Record<AiAction["type"], string> = {
    UPDATE_STATUS: "Cambiar estado",
    ADD_NOTE: "Agregar nota",
    CREATE_TASK: "Crear tarea",
    MARK_CONFIRMATION: "Actualizar confirmación",
    CREATE_EMAIL_DRAFT: "Crear borrador correo",
  };
  return labels[type] || type;
}

function formatPayload(payload?: Record<string, unknown>) {
  if (!payload) return "";
  return Object.entries(payload)
    .map(([key, value]) => `${key}: ${String(value ?? "")}`)
    .join(" · ");
}

export default function AiGestionesPage() {
  const navigate = useNavigate();
  const [mandantes, setMandantes] = useState<MandanteOption[]>([]);
  const [mandanteId, setMandanteId] = useState("");
  const [userName, setUserName] = useState(() => localStorage.getItem("operafix_ai_user_name") || "");
  const [userRole, setUserRole] = useState(() => localStorage.getItem("operafix_ai_user_role") || "");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hola. Soy la IA estratégica de OperaFix. Antes de ejecutar acciones amplias, dime quién eres y qué rol tienes. Puedo entender pedidos poco formales, detectar oportunidades de plata, generar informes por columnas y proponer acciones con confirmación.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executed, setExecuted] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchJson<MandanteOption[]>("/mandantes")
      .then(setMandantes)
      .catch((error) => console.error("No se pudieron cargar mandantes", error));
  }, []);

  useEffect(() => {
    localStorage.setItem("operafix_ai_user_name", userName);
    localStorage.setItem("operafix_ai_user_role", userRole);
  }, [userName, userRole]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const selectedMandanteName = useMemo(() => mandantes.find((m) => m.id === mandanteId)?.name || "Todos los mandantes", [mandantes, mandanteId]);

  async function sendPrompt(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await postJson<AiChatResponse>("/ai/chat", {
        message: prompt,
        mandante_id: mandanteId || null,
        user_name: userName || null,
        user_role: userRole || null,
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        actions: response.actions || [],
        report: response.report || null,
        source: response.source,
        engine: response.engine,
        analyzed_records: response.analyzed_records,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `No pude procesar la solicitud de IA. Detalle: ${error?.message || error}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function executeAction(action: AiAction) {
    if (!confirm(`¿Ejecutar acción IA?\n\n${action.label || actionTypeLabel(action.type)}`)) return;
    setExecutingId(action.id);
    try {
      const response = await postJson<{ ok: boolean; message: string }>("/ai/execute", {
        confirmed: true,
        action,
      });
      setExecuted((prev) => ({ ...prev, [action.id]: response.message || "Acción ejecutada" }));
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Acción ejecutada: ${response.message}`,
        },
      ]);
    } catch (error: any) {
      setExecuted((prev) => ({ ...prev, [action.id]: `Error: ${error?.message || error}` }));
    } finally {
      setExecutingId(null);
    }
  }

  async function copyMessage(content: string) {
    await navigator.clipboard.writeText(content);
  }

  function downloadReportExcel(report: AiReport) {
    const escapeHtml = (value: unknown) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const header = report.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
    const body = report.rows.map((row) => `<tr>${report.columns.map((column) => `<td>${escapeHtml(row[column.key] ?? "")}</td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title || "informe-ia"}.xls`.replace(/[^a-z0-9áéíóúñ._-]+/gi, "_");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function copyReportCsv(report: AiReport) {
    const headers = report.columns.map((column) => column.label);
    const rows = report.rows.map((row) => report.columns.map((column) => String(row[column.key] ?? "")));
    const csv = [headers, ...rows].map((line) => line.join("	")).join("\n");
    navigator.clipboard.writeText(csv);
  }

  return (
    <div className="zoho-module-page ai-chat-page">
      <div className="zoho-module-header ai-chat-header">
        <div>
          <h1>IA para gestiones</h1>
          <p>Chat real conectado al CRM. Analiza datos, genera informes y ejecuta acciones con confirmación.</p>
        </div>
        <div className="zoho-module-actions">
          <select className="zoho-select" value={mandanteId} onChange={(e) => setMandanteId(e.target.value)}>
            <option value="">Todos los mandantes</option>
            {mandantes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button className="zoho-btn" onClick={() => setMessages((prev) => prev.slice(0, 1))}>Limpiar chat</button>
        </div>
      </div>

      <section className="ai-context-card">
        <strong>Contexto activo:</strong> {selectedMandanteName}
        <span> · Las acciones requieren confirmación antes de afectar la ficha.</span>
      </section>

      <section className="ai-identity-card">
        <div>
          <strong>¿Quién eres?</strong>
          <span> Esto ayuda a la IA a responder según tu rol y a cuidar las acciones que propone.</span>
        </div>
        <input className="zoho-input" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Tu nombre, ej: Gabriel" />
        <input className="zoho-input" value={userRole} onChange={(e) => setUserRole(e.target.value)} placeholder="Tu rol, ej: Producción / Gerencia / KAM" />
      </section>

      <section className="ai-quick-prompts">
        {quickPrompts.map((prompt) => (
          <button key={prompt} className="zoho-btn light" onClick={() => sendPrompt(prompt)} disabled={loading}>{prompt}</button>
        ))}
      </section>

      <section className="ai-chat-shell">
        <div className="ai-chat-messages">
          {messages.map((msg) => (
            <article key={msg.id} className={`ai-chat-message ${msg.role}`}>
              <div className="ai-chat-bubble">
                <div className="ai-chat-role">{msg.role === "user" ? "Tú" : "IA Operafix"}</div>
                <pre>{msg.content}</pre>
                {msg.role === "assistant" && (
                  <div className="ai-message-meta">
                    {msg.engine && <span>Motor: {msg.engine}</span>}
                    {typeof msg.analyzed_records === "number" && <span>Registros analizados: {msg.analyzed_records}</span>}
                    <button className="zoho-link-button" onClick={() => copyMessage(msg.content)}>Copiar respuesta</button>
                  </div>
                )}

                {msg.report && (
                  <div className="ai-report-card">
                    <div className="ai-report-header">
                      <div>
                        <strong>{msg.report.title}</strong>
                        <small>{msg.report.totalRows} registros encontrados · {msg.report.rows.length} mostrados</small>
                      </div>
                      <div className="ai-report-actions">
                        <button className="zoho-btn light" onClick={() => copyReportCsv(msg.report!)}>Copiar tabla</button>
                        <button className="zoho-btn" onClick={() => downloadReportExcel(msg.report!)}>Descargar Excel</button>
                      </div>
                    </div>
                    {!!msg.report.filtersApplied.length && (
                      <p className="ai-report-filters">Filtros: {msg.report.filtersApplied.join(" · ")}</p>
                    )}
                    <div className="ai-report-table-wrap">
                      <table className="ai-report-table">
                        <thead>
                          <tr>
                            {msg.report.columns.map((column) => <th key={column.key}>{column.label}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.report.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {msg.report!.columns.map((column) => <td key={column.key}>{String(row[column.key] ?? "—")}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {!!msg.actions?.length && (
                <div className="ai-actions-panel">
                  <h3>Acciones propuestas</h3>
                  <p>Revisa antes de ejecutar. Cada acción queda trazada en la cronología de la gestión.</p>
                  {msg.actions.map((action) => (
                    <div className="ai-action-row" key={action.id}>
                      <div>
                        <span className="ai-action-type">{actionTypeLabel(action.type)}</span>
                        <strong>{action.label || "Acción sugerida"}</strong>
                        {action.payload && <small>{formatPayload(action.payload)}</small>}
                      </div>
                      <div className="ai-action-buttons">
                        <button className="zoho-btn" onClick={() => navigate(`/records/${action.recordId}`)}>Ver gestión</button>
                        <button className="zoho-btn primary" disabled={executingId === action.id || !!executed[action.id]} onClick={() => executeAction(action)}>
                          {executingId === action.id ? "Ejecutando..." : executed[action.id] ? "Ejecutada" : "Ejecutar"}
                        </button>
                      </div>
                      {executed[action.id] && <div className="ai-action-result">{executed[action.id]}</div>}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
          {loading && <div className="ai-chat-loading">IA analizando registros...</div>}
          <div ref={bottomRef} />
        </div>

        <form className="ai-chat-input" onSubmit={(e) => { e.preventDefault(); sendPrompt(); }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ejemplo: analiza gestiones de alto monto y crea acciones para seguimiento..."
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendPrompt();
            }}
          />
          <button className="zoho-btn primary" disabled={loading || !input.trim()}>{loading ? "Analizando..." : "Enviar"}</button>
        </form>
      </section>
    </div>
  );
}
