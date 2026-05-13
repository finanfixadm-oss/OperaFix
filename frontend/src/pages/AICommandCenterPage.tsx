import { useState } from "react";

const API_BASE = "https://operafix-production.up.railway.app";
const USER_ID = "default";

type AIColumn = {
  field: string;
  label: string;
};

type AIMessage = {
  role: "user" | "assistant";
  text: string;
  rows?: Record<string, unknown>[];
  columns?: AIColumn[];
  canExport?: boolean;
};

export default function AIChatCRMPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: "assistant",
      text:
        "Hola. Soy la IA conversacional de OperaFix. Puedes pedirme casos, filtros, agrupaciones, análisis y luego decirme: “ahora descárgalo en Excel”.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", text }]);

    try {
      const res = await fetch(`${API_BASE}/api/ai-chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          userId: USER_ID,
        }),
      });

      const json = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: json.answer || "No pude generar una respuesta.",
          rows: json.rows || [],
          columns: json.columns || [],
          canExport: json.canExport,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "No pude conectar con el motor IA del CRM.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    window.open(`${API_BASE}/api/ai-chat/export?userId=${USER_ID}`, "_blank");
  };

  const openRecord = (row: Record<string, unknown>) => {
    if (!row.id) return;

    window.open(`/records?id=${row.id}`, "_blank");
  };

  const getVisibleColumns = (
    rows: Record<string, unknown>[],
    columns?: AIColumn[]
  ): AIColumn[] => {
    if (columns && columns.length > 0) {
      return columns.filter((column) => column.field !== "id");
    }

    if (!rows.length) return [];

    return Object.keys(rows[0])
      .filter((field) => field !== "id")
      .map((field) => ({
        field,
        label: field,
      }));
  };

  return (
    <div style={page}>
      <aside style={sidebar}>
        <h2>🧠 OperaFix IA</h2>

        <button
          style={promptBtn}
          onClick={() =>
            setInput(
              "Muéstrame todos los casos con Confirmación CC sí, Confirmación Poder sí y Estado Gestión Pendiente Gestión, con Razón Social, RUT, Entidad, Monto Devolución y N° Solicitud"
            )
          }
        >
          Casos listos para gestionar
        </button>

        <button
          style={promptBtn}
          onClick={() =>
            setInput(
              "Dame los casos pendientes de Mundo Previsional ordenados por mayor Monto Devolución"
            )
          }
        >
          Pendientes Mundo Previsional
        </button>

        <button
          style={promptBtn}
          onClick={() =>
            setInput("Qué casos están en mejores condiciones para gestionar")
          }
        >
          Sugerencias de gestión
        </button>
      </aside>

      <main style={main}>
        <section style={chatBox}>
          {messages.map((message, index) => {
            const visibleColumns = getVisibleColumns(
              message.rows || [],
              message.columns
            );

            return (
              <div
                key={index}
                style={{
                  ...bubble,
                  alignSelf:
                    message.role === "user" ? "flex-end" : "flex-start",
                  background: message.role === "user" ? "#dbeafe" : "#ffffff",
                }}
              >
                <strong>{message.role === "user" ? "Tú" : "IA OperaFix"}</strong>
                <p>{message.text}</p>

                {message.rows && message.rows.length > 0 && (
                  <div style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>
                          {visibleColumns.map((column) => (
                            <th key={column.field} style={th}>
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {message.rows.slice(0, 50).map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            onClick={() => openRecord(row)}
                            style={{
                              cursor: row.id ? "pointer" : "default",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f8fafc";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "";
                            }}
                            title={
                              row.id
                                ? "Abrir este registro en una nueva pestaña"
                                : ""
                            }
                          >
                            {visibleColumns.map((column) => (
                              <td key={column.field} style={td}>
                                {String(row[column.field] ?? "—")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {message.canExport && (
                  <button style={downloadBtn} onClick={downloadExcel}>
                    Descargar resultado en Excel
                  </button>
                )}
              </div>
            );
          })}

          {loading && <div style={loadingBox}>Pensando con IA...</div>}
        </section>

        <footer style={composer}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe como en ChatGPT: dame pendientes de Mundo Previsional con CC sí y poder sí..."
            style={textarea}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />

          <button style={sendBtn} onClick={send} disabled={loading}>
            Enviar
          </button>
        </footer>
      </main>
    </div>
  );
}

const page: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "300px 1fr",
  minHeight: "calc(100vh - 80px)",
  background: "#f8fafc",
};

const sidebar: React.CSSProperties = {
  background: "#0f172a",
  color: "#fff",
  padding: 20,
};

const promptBtn: React.CSSProperties = {
  width: "100%",
  marginBottom: 10,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#fff",
  cursor: "pointer",
  textAlign: "left",
};

const main: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "calc(100vh - 80px)",
  minHeight: 0,
};

const chatBox: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 18,
  padding: 24,
  overflowY: "auto",
  overflowX: "hidden",
  height: "calc(100vh - 190px)",
  maxHeight: "calc(100vh - 190px)",
  scrollBehavior: "smooth",
};

const bubble: React.CSSProperties = {
  maxWidth: "92%",
  border: "1px solid #dbe3ef",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
};

const tableWrap: React.CSSProperties = {
  marginTop: 14,
  overflowX: "auto",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
};

const th: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #e2e8f0",
  textAlign: "left",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const composer: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 120px",
  gap: 12,
  padding: 16,
  borderTop: "1px solid #e2e8f0",
  background: "#fff",
};

const textarea: React.CSSProperties = {
  minHeight: 70,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  resize: "vertical",
};

const sendBtn: React.CSSProperties = {
  border: 0,
  borderRadius: 12,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const downloadBtn: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 14px",
  border: 0,
  borderRadius: 10,
  background: "#16a34a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const loadingBox: React.CSSProperties = {
  color: "#64748b",
};